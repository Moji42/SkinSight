# SkinSight

SkinSight is an AI-powered skin irritation education web app. Users can upload an image, receive a non-diagnostic visual analysis, and ask follow-up questions through a chat interface.

## What this project does

- Lets users upload a skin image in the browser
- Calls Supabase Edge Functions to run AI analysis and chat
- Returns educational insights (not medical diagnosis)
- Provides first-aid style suggestions and safety disclaimers

## Tech stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend services:
  - Supabase Edge Functions (`analyze-skin`, `chat-skin`)
  - Optional local Node server in `server.js` for upload/analysis experiments

## Prerequisites

- Node.js 18+ and npm
- A Supabase project
- Lovable AI Gateway key for Edge Functions

## Environment setup

Create a `.env` file at the project root for the frontend:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

Set Edge Function secret in Supabase:

- `LOVABLE_API_KEY` (used by both `analyze-skin` and `chat-skin`)

If you use the optional local Node server (`server.js`), copy `.env.example` and fill in:

- `OPENAI_API_KEY`
- `OPENAI_MODEL_WITH_VISION`
- Firebase credentials (`FIREBASE_*`)

## Install and run

Install dependencies:

```bash
npm install
```

Run frontend only (recommended for Supabase flow):

```bash
npm run dev
```

Run local Node server only:

```bash
npm run dev:server
```

Run frontend + Node server together:

```bash
npm run dev:all
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Important note

SkinSight is for educational support only and is not a substitute for professional medical advice, diagnosis, or treatment.