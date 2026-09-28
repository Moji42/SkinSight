import express from "express";
import cors from "cors";
import multer from "multer";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY in .env file.");
}

const app = express();
// Render sits behind one proxy hop; trust it so rate limiting keys on each visitor's real IP.
app.set("trust proxy", 1);

const allowedOrigin = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:8080"];
app.use(cors({ origin: allowedOrigin }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again in 15 minutes." },
});

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// Keep the vision model configurable as provider model IDs are retired over time.
const visionModel = process.env.GROQ_VISION_MODEL?.trim() || "qwen/qwen3.8-27b";
const chatModel = process.env.GROQ_CHAT_MODEL?.trim() || visionModel;

const PROMPT = `You are an educational skin analysis assistant. Analyze this skin image and respond ONLY with valid JSON in exactly this shape (no markdown, no extra text):
{
  "visualDescription": "2-3 sentence description of what is visible",
  "possibilities": [
    { "condition": "Condition name", "description": "Brief educational description" }
  ],
  "concernLevel": "Low",
  "suggestions": ["suggestion 1", "suggestion 2"]
}
concernLevel must be exactly "Low", "Medium", or "High". Include 2-4 possible conditions. Educational purposes only, not medical diagnosis.`;

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/upload", limiter, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please select an image to analyze." });
  }
  try {
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const completion = await groq.chat.completions.create({
      model: visionModel,
      response_format: { type: "json_object" },
      // JSON mode is rejected with the "raw" reasoning format, so hide the model's thinking.
      reasoning_format: "hidden",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          ],
        },
      ],
    });

    const text = (completion.choices[0].message.content || "")
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error(`No JSON in model output: ${text.slice(0, 200)}`);
    const parsed = JSON.parse(text.slice(start, end + 1));

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "The analysis service could not complete your request. Please try again later." });
  }
});

app.post("/chat", limiter, async (req, res) => {
  try {
    const { messages, imageContext } = req.body;

    const systemMessage = imageContext
      ? `You are a helpful skin care education assistant. The user previously had their skin analyzed with this description: "${imageContext}". Answer their questions educationally. Never provide a medical diagnosis.`
      : "You are a helpful skin care education assistant. Answer questions educationally. Never provide a medical diagnosis.";

    const completion = await groq.chat.completions.create({
      model: chatModel,
      reasoning_format: "hidden",
      messages: [
        { role: "system", content: systemMessage },
        ...messages,
      ],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed. Please try again." });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Server running on port", process.env.PORT || 3000);
});
