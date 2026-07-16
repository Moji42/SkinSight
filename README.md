# SkinSight

An AI-powered skin condition education tool built for the AI Society Maker Space at Arizona State University. Upload a photo or use your webcam, get a visual analysis from a vision LLM, and ask follow-up questions through a chat interface.

> **Disclaimer:** SkinSight is for educational purposes only — not a substitute for professional medical advice.

---

## What it does

You drop in an image (or take one with your webcam), and the app sends it to a Groq-hosted Llama vision model that returns a structured breakdown: what it sees visually, possible conditions, a concern level, and care suggestions. From there you can open a chat and ask follow-up questions with the analysis kept as context.

Nothing is stored — images are held in memory for the request and discarded.

---

## Stack

| | |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express |
| AI | Groq SDK — `meta-llama/llama-4-scout-17b-16e-instruct` |
| Image handling | multer (memory storage) |

---

## Running locally

You'll need Node 18+ and a Groq API key ([console.groq.com](https://console.groq.com)).

```bash
# 1. Install
npm install

# 2. Set up your env
cp .env.example .env
# then add your GROQ_API_KEY to .env

# 3. Run frontend + backend together
npm run dev:all
```

Frontend runs at `http://localhost:8080`, backend at `http://localhost:3000`.

To run them separately: `npm run dev` (frontend) and `npm run dev:server` (backend).

---

## Deploying

The frontend is built for Vercel and the backend for Render. Set these environment variables:

**Render (backend)**
```
GROQ_API_KEY=...
ALLOWED_ORIGIN=https://your-vercel-url.vercel.app
```

**Vercel (frontend)**
```
VITE_API_URL=https://your-render-url.onrender.com
```

Deploy Render first so you have the URL ready for Vercel.

---

## Team

Built by the AI Society for the Maker Space at Arizona State University.

yhmohame@asu.edu · sambari1@asu.edu · knazarov@asu.edu · nrmohame@asu.edu
