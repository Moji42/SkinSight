import express from "express";
import cors from "cors";
import multer from "multer";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY in .env file.");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
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

    const text = completion.choices[0].message.content.trim();
    const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonText);

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong: " + err.message });
  }
});

app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const { messages, imageContext } = req.body;

    const systemMessage = imageContext
      ? `You are a helpful skin care education assistant. The user previously had their skin analyzed with this description: "${imageContext}". Answer their questions educationally. Never provide a medical diagnosis.`
      : "You are a helpful skin care education assistant. Answer questions educationally. Never provide a medical diagnosis.";

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: systemMessage },
        ...messages,
      ],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong: " + err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Server running on port", process.env.PORT || 3000);
});
