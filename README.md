# SkinSight

SkinSight is an AI-powered skin irritation education web app built by the AI Society for the Maker Space at Arizona State University. Users can upload or capture an image of a skin condition, receive a non-diagnostic visual analysis powered by a large language model, and ask follow-up questions through a built-in chat interface.

> **Disclaimer:** SkinSight is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.

---

## Features

- Upload a skin image, drag-and-drop, or capture directly from your webcam
- Load a built-in sample image to try the app without your own photo
- AI-powered visual analysis identifies possible conditions and suggests next steps
- Interactive chat for follow-up questions based on the analysis
- No images are saved — all processing happens in memory

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Node.js + Express (server.js) |
| AI | Groq SDK — `meta-llama/llama-4-scout-17b-16e-instruct` |
| Image upload | multer (memory storage — nothing written to disk) |

---

## Prerequisites

- **Node.js 18+** and npm
- A **Groq API key** — sign up free at [console.groq.com](https://console.groq.com)

---

## Environment setup

Create a `.env` file in the project root (copy from `.env.example` if present):

```env
GROQ_API_KEY=your_groq_api_key_here
```

The `PORT` variable is optional — the server defaults to port `3000`.

---

## Install and run

### 1. Install dependencies

```bash
npm install
```

### 2. Run everything (recommended)

Starts both the Vite frontend dev server and the Express backend together:

```bash
npm run dev:all
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### 3. Run frontend and backend separately

**Frontend only:**
```bash
npm run dev
```

**Backend only:**
```bash
npm run dev:server
```

### 4. Build for production

```bash
npm run build
```

Then start the Express server to serve the API (point a static host at the `dist/` folder for the frontend):

```bash
npm start
```

---

## How it works

1. User uploads or captures an image in the browser
2. The frontend sends the image to `POST /upload` on the Express server
3. The server encodes the image as base64 and sends it to the Groq API (Llama vision model)
4. The model returns a structured JSON analysis: visual description, possible conditions, concern level, and suggestions
5. The user can then open the chat panel and ask follow-up questions — the chat endpoint (`POST /chat`) maintains context from the original analysis

---

## Project team

An AI Society project for the Maker Space at **Arizona State University**.

| | |
|-|-|
| yhmohame@asu.edu | sambari1@asu.edu |
| knazarov@asu.edu | nrmohame@asu.edu |
