# AI Mechanic

A mobile dashboard warning-light triage app built with React Native, Expo, and TypeScript.

AI Mechanic lets users take or select a photo of their vehicle dashboard, review the image, and receive a clear, safety-focused explanation of visible warning indicators and suggested next steps.

> This project is designed as a vehicle guidance tool, not a replacement for a qualified mechanic or professional diagnosis.

## Current MVP

The current version includes:

* Dashboard photo capture using the device camera
* Photo selection from the device library
* Image preview and retake flow
* Analysis loading screen
* Safety-focused warning result screen
* High-priority guidance for visible oil-pressure warnings
* No login or account requirement

The current analysis result is a polished prototype flow using a fixed sample assessment. Real vision-AI analysis will be added in a future version.

## Safety Principles

This app is intentionally conservative.

It does not claim to:

* Diagnose an exact mechanical failure
* Identify fault codes from a photo
* Guarantee that a vehicle is safe to drive
* Replace roadside assistance, a mechanic, or emergency services

For visible red warning lights, smoke, overheating, brake concerns, fuel leaks, or unusual vehicle behavior, users should stop safely and seek professional assistance.

## Tech Stack

* React Native
* Expo
* TypeScript
* Expo Image Picker
* Expo Camera access through Image Picker

## Current User Flow

```text
Home Screen
→ Take Photo or Choose from Library
→ Review Dashboard Photo
→ Analysis Loading Screen
→ Safety-Focused Result
→ Scan Another Photo
```

## Planned Features

* Vision AI integration for dashboard warning-light recognition
* Structured AI responses with severity levels
* Backend safety rules that can override unsafe AI recommendations
* Image quality validation
* Better support for multiple warning-light types
* Local scan history
* Anonymous rate limiting
* Error handling and offline states
* TestFlight release

## Getting Started

### Prerequisites

* Node.js
* npm
* Expo Go on an iPhone or Android device

### Install

```bash
npm install
```

### Start the app

```bash
npx expo start
```

Then scan the QR code using:

* The iPhone Camera app, then open the link in Expo Go
* Expo Go directly on Android

## Privacy

The current prototype does not upload dashboard images to a backend or third-party AI provider.

Photos are selected or captured on the user’s device for the local app flow only. Future AI integration will include clear privacy disclosures, minimal image retention, and safety-first handling of user data.

## Project Status

Active development.

Current milestone:

* Camera capture, photo-library selection, preview, loading state, and safety-focused prototype results completed.

Next milestone:

* Replace the fixed prototype result with a controlled AI analysis pipeline and backend safety rules.

## Author

Built by Thanushai as a portfolio project demonstrating mobile development, product design, API integration planning, and safety-focused AI application design.
