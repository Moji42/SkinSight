import express from "express";
import multer from "multer";
import admin from "firebase-admin";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_STORAGE_BUCKET",
  "OPENAI_API_KEY",
  "OPENAI_MODEL_WITH_VISION",
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}. ` +
      "Copy .env.example to .env and fill in all required values."
  );
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = bucket.file(`uploads/${Date.now()}-${req.file.originalname}`);
    await file.save(req.file.buffer, { contentType: req.file.mimetype });
    const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000 });

    const result = await openai.responses.create({
      model: process.env.OPENAI_MODEL_WITH_VISION,
      input: [
        { role: "user", content: `Describe this image: ${url}` },
      ],
    });

    res.json({
      imageUrl: url,
      analysis: result.output[0].content[0].text,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Server running on port", process.env.PORT || 3000);
});
