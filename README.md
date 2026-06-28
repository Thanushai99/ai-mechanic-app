# AI Mechanic

A mobile dashboard warning-light triage app built with React Native, Expo, TypeScript, Supabase Edge Functions, and Gemini Vision AI.

AI Mechanic lets a user take or select a dashboard photo, analyzes visible warning indicators, and returns cautious, safety-focused guidance. It is designed to explain what is visibly shown in the image—not to replace a mechanic or diagnose a vehicle.

## Features

* Take a dashboard photo using the phone camera
* Select a dashboard photo from the device library
* Preview and retake images before analysis
* Analyze dashboard images with Gemini Vision AI
* Detect unsupported photos that are not vehicle dashboards
* Handle unclear or insufficient dashboard images
* Classify visible warning indicators by severity
* Apply safety overrides for critical warnings
* Return plain-language explanations and next steps
* No visible signup or login required

## Current Supported Flow

```text
Home
→ Take Photo or Choose from Library
→ Review Photo
→ Anonymous Supabase Session
→ Supabase Edge Function
→ Gemini Vision Analysis
→ Safety Rules Applied
→ Result Screen
```

## Safety-First Design

This project intentionally focuses on visible dashboard warning indicators only.

The app does not:

* Diagnose an exact mechanical failure
* Guess unseen vehicle problems
* Estimate repair costs
* Read fault codes
* Guarantee that a vehicle is safe to drive
* Replace a qualified mechanic, roadside assistance, or emergency services

For critical visible indicators such as oil-pressure, brake, or overheating warnings, the backend applies conservative safety guidance regardless of the model's wording.

## Result States

### Critical Warning

For clearly visible critical indicators, the app can return:

* High-priority severity
* Do not drive guidance
* Immediate next steps such as pulling over safely and arranging professional inspection or towing

### No Visible Warning Indicators

When no warning lights are visible, the app states only that no visible warning indicators were identified in the photo.

It does not claim that the vehicle is safe or free of mechanical problems.

### Unsupported Photo

When the image is not a vehicle dashboard, the app returns:

* Unsupported photo
* Dashboard not detected
* Instructions to upload a clear dashboard image

### Insufficient Image

When the dashboard is blurry, cropped, obscured, or unreadable, the app asks the user to retake the image instead of guessing.

## Tech Stack

### Mobile App

* React Native
* Expo
* TypeScript
* Expo Image Picker
* Expo File System

### Backend

* Supabase Edge Functions
* Supabase Anonymous Authentication
* Gemini Vision API

## Architecture

```text
Mobile App
  ↓
Anonymous Supabase Session
  ↓
Supabase Edge Function
  ↓
Gemini Vision API
  ↓
Structured JSON Response
  ↓
Safety Overrides
  ↓
Mobile Result Screen
```

The Gemini API key is stored only as a Supabase Edge Function secret.

It is not included in:

* The mobile app
* The GitHub repository
* The README
* Local source files committed to Git

## Project Structure

```text
App.tsx
  Mobile user interface, image flow, and result presentation

lib/supabase.ts
  Supabase client and anonymous session configuration

supabase/functions/analyze-dashboard/index.ts
  Edge Function that validates images, calls Gemini, applies safety rules,
  and returns structured analysis results
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add local environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Do not commit `.env`.

### 3. Configure Supabase

Create a Supabase project and configure:

* Anonymous sign-ins enabled
* An `analyze-dashboard` Edge Function
* A `GEMINI_API_KEY` Edge Function secret

### 4. Run the app

```bash
npx expo start
```

Then scan the Expo QR code with an iPhone or Android device.

## Testing Performed

The current version has been tested with:

* A visible red oil-pressure warning
* A dashboard with no illuminated warning indicators
* A non-dashboard photo

Expected behavior:

```text
Critical warning
→ High priority and conservative “do not drive” guidance

No visible warning lights
→ Assessment limited, without a safety guarantee

Non-dashboard image
→ Unsupported photo and dashboard retake guidance
```

## Future Improvements

* Better image-quality checks before AI analysis
* Additional warning-light categories
* Rate limiting for public use
* Scan history stored locally
* Accessibility improvements
* Automated tests for edge-case photo results
* TestFlight distribution
* App Store release preparation

## Author

Built by Thanushai as a portfolio project demonstrating mobile development, backend integration, AI vision workflows, secure API design, and safety-focused product thinking.
