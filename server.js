import express from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import cors from 'cors';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
try {
  await fs.access(uploadsDir);
} catch {
  await fs.mkdir(uploadsDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Initialize Gemini AI with API version
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY, {
  apiVersion: "v1" // Use stable v1 instead of beta
});

const imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Image analysis endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imagePath = path.join(uploadsDir, req.file.filename);
    const imageBytes = await fs.readFile(imagePath);
    const fileUrl = `http://localhost:${process.env.PORT || 3000}/uploads/${req.file.filename}`;

    // Retry logic for handling overloaded service
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await imageModel.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: "Analyze this skin image and provide your response in two sections:\n\n1. Possible Conditions: List potential skin conditions that match the visual characteristics. Remember to note that these are possibilities based on visual characteristics only and accurate diagnosis requires a healthcare professional.\n\n2. General Care Suggestions: Provide general care and management suggestions that would be appropriate for the visible symptoms.\n\nFormat your response in a structured way that can be easily parsed into these two sections." },
              {
                inlineData: {
                  mimeType: req.file.mimetype,
                  data: imageBytes.toString("base64")
                }
              }
            ]
          }]
        });
        
        // If successful, parse and return the structured result
        const response = await result.response;
        const text = response.text();
        
        // Parse the response into sections using markdown headers
        const possibleConditionsMatch = text.match(/### 1\. Possible Conditions([^]*?)(?=\*\*\*)/s);
        const generalCareMatch = text.match(/### 2\. General Care Suggestions([^]*?)$/s);
        
        const possibleConditions = possibleConditionsMatch ? possibleConditionsMatch[1].trim() : '';
        const generalCare = generalCareMatch ? generalCareMatch[1].trim() : '';

        // Get initial description before the headers
        const initialDescription = text.split('###')[0].trim();
        
        // Convert text into structured lists and descriptions
        const possibilitiesList = possibleConditions
          .split('\n')
          .filter(line => line.trim().startsWith('*'))
          .map(line => {
            const match = line.match(/\*\*([^:]*)\*\*:(.*)/);
            if (match) {
              // Return both the condition name and its description
              return {
                condition: match[1].trim(),
                description: match[2].trim()
              };
            }
            return null;
          })
          .filter(item => item !== null);
          
        const suggestionsList = generalCare
          .split('\n')
          .filter(line => line.trim().startsWith('*') && !line.includes('**'))
          .map(line => line.replace(/^\*\s*/, '').trim())
          .filter(item => item.length > 0);
        
        console.log('Parsed Lists:', {
          possibilitiesList,
          suggestionsList
        });
        
        return res.json({
          imageUrl: fileUrl,
          visualDescription: initialDescription,
          possibilities: possibilitiesList,
          suggestions: suggestionsList,
          fullAnalysis: text,
        });
      } catch (error) {
        lastError = error;
        if (error.status === 503) {
          // If service is overloaded, wait before retrying
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // If it's not an overload error, throw immediately
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError;

    const response = await result.response;
    
    res.json({
      imageUrl: fileUrl,
      analysis: response.text(),
    });
  } catch (err) {
    console.error('Error details:', err);
    res.status(500).json({ 
      error: "Analysis failed", 
      details: err.message || "Something went wrong"
    });
  }
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { messages, imageContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    // Convert the frontend messages to the format expected by Gemini
    const history = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const result = await chatModel.generateContent({
      contents: history
    });

    const response = await result.response;

    res.json({
      response: response.text(),
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ 
      error: "Chat failed", 
      details: err.message || "Something went wrong" 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port: ", PORT);
});