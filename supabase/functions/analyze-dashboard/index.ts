import { withSupabase } from "npm:@supabase/server@^1";

type AnalyzeRequest = {
  imageBase64?: unknown;
  mimeType?: unknown;
};

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const responseSchema = {
  type: "object",
  properties: {
    analysisStatus: {
      type: "string",
      enum: ["usable", "insufficient_image", "unsupported"],
    },
    severity: {
      type: "string",
      enum: ["low", "medium", "high", "unknown"],
    },
    driveAdvice: {
      type: "string",
      enum: [
        "do_not_drive",
        "drive_to_service_only",
        "schedule_service",
        "monitor",
        "unknown",
      ],
    },
    criticalSignal: {
      type: "string",
      enum: [
        "red_oil_pressure",
        "red_brake_warning",
        "overheating_warning",
        "flashing_check_engine",
        "none",
        "unknown",
      ],
    },
    title: {
      type: "string",
    },
    explanation: {
      type: "string",
    },
    observedEvidence: {
      type: "array",
      items: {
        type: "string",
      },
    },
    nextSteps: {
      type: "array",
      items: {
        type: "string",
      },
    },
    limitations: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "analysisStatus",
    "severity",
    "driveAdvice",
    "criticalSignal",
    "title",
    "explanation",
    "observedEvidence",
    "nextSteps",
    "limitations",
  ],
};

function errorResponse(message: string, status: number) {
  return Response.json(
    {
      error: { message },
    },
    { status }
  );
}

function cleanBase64(value: string) {
  return value.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, "");
}

function estimateBase64Bytes(base64: string) {
  return Math.ceil((base64.length * 3) / 4);
}

function applySafetyOverrides(analysis: Record<string, unknown>) {
  const criticalSignal =
    typeof analysis.criticalSignal === "string"
      ? analysis.criticalSignal
      : "unknown";

  const criticalWarnings = new Set([
    "red_oil_pressure",
    "red_brake_warning",
    "overheating_warning",
  ]);

  if (criticalWarnings.has(criticalSignal)) {
    return {
      ...analysis,
      severity: "high",
      driveAdvice: "do_not_drive",
      nextSteps: [
        "Pull over safely and turn off the engine.",
        "Do not continue driving until the vehicle has been assessed.",
        "Contact roadside assistance or a qualified mechanic.",
      ],
    };
  }

  return analysis;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {
    if (req.method !== "POST") {
      return errorResponse("Only POST requests are allowed.", 405);
    }

    let body: AnalyzeRequest;

    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON request body.", 400);
    }

    if (typeof body.imageBase64 !== "string" || !body.imageBase64.trim()) {
      return errorResponse("A dashboard image is required.", 400);
    }

    const mimeType =
      typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (!allowedMimeTypes.has(mimeType)) {
      return errorResponse(
        "Unsupported image type. Use JPEG, PNG, or WebP.",
        400
      );
    }

    const imageBase64 = cleanBase64(body.imageBase64);

    if (estimateBase64Bytes(imageBase64) > MAX_IMAGE_BYTES) {
      return errorResponse(
        "Image is too large. Please use a smaller or compressed image.",
        413
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is missing.");
      return errorResponse("Analysis service is not configured.", 500);
    }

    const prompt = `
You are a cautious vehicle dashboard visual-triage assistant.

Focus only on illuminated dashboard warning indicators.

Do not report fuel level, temperature, speed, RPM, gear position, mileage,
or other gauge readings unless they are directly relevant to an illuminated
warning indicator and clearly visible.

When no warning indicators are visible, do not state that the vehicle is safe
to drive. State only that no visible warning lights were identified in the photo.

Analyze only what is clearly visible in the supplied dashboard photo.

Rules:
- Do not claim an exact mechanical diagnosis.
- Do not invent fault codes, repair costs, or unseen vehicle symptoms.
- If the image is blurry, incomplete, not a dashboard, or does not show a readable warning indicator, return analysisStatus as "insufficient_image" or "unsupported".
- Use plain language suitable for a non-mechanic.
- Do not say a vehicle is definitely safe to drive.
- Do not list possible underlying mechanical causes, such as low fluid levels,
  failed pumps, sensors, wiring, or repair needs, unless that fact is directly
  and unmistakably visible in the image.
- For a visible warning light, describe only the visible indicator, its general
  safety significance, and the recommended next action.
- Do not use titles that diagnose a cause. For example, use "Oil-pressure warning detected" rather than "Low oil pressure."
- If a red oil-pressure, red brake, or overheating warning is clearly visible, identify the applicable criticalSignal.
- Your limitations must state that a photo cannot confirm the exact cause of a vehicle issue.
- Return only JSON matching the required schema.
`;

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiApiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: prompt }],
            },
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 900,
              responseMimeType: "application/json",
              responseJsonSchema: responseSchema,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const details = await geminiResponse.text();

        console.error(
          "Gemini request failed:",
          geminiResponse.status,
          details.slice(0, 500)
        );

        return errorResponse(
          "The analysis service could not process this image.",
          502
        );
      }

      const geminiData = await geminiResponse.json();

      const responseText = geminiData?.candidates?.[0]?.content?.parts?.find(
        (part: { text?: string }) => typeof part.text === "string"
      )?.text;

      if (!responseText) {
        console.error("Gemini returned no usable text response.");
        return errorResponse("No analysis was returned for this image.", 502);
      }

      let analysis: Record<string, unknown>;

      try {
        analysis = JSON.parse(responseText);
      } catch {
        console.error("Gemini returned invalid JSON.");
        return errorResponse("Analysis response could not be read.", 502);
      }

      return Response.json({
        analysis: applySafetyOverrides(analysis),
      });
    } catch (error) {
      console.error(
        "Unexpected analysis error:",
        error instanceof Error ? error.message : error
      );

      return errorResponse(
        "An unexpected error occurred during analysis.",
        500
      );
    }
  }),
};