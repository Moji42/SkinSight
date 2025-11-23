# MediQuip AI API Contract

This document is the single source of truth for the AI Vision API. The backend must produce a JSON object that strictly follows this structure, and the frontend will be built to consume it.

---

## 1. AI Vision Prompt (Version 1.0)

**System Prompt:**
> System Prompt: You are an AI-powered visual analysis assistant for the SkinSight application. You are not a medical professional. Your purpose is to analyze images of common skin irritations and provide general, educational, and safe information.

Your task:
Analyze the user-provided image. Based ONLY on its visual characteristics, generate a response that adheres to the following strict rules:

1.  Do Not Diagnose: Never provide a definitive medical diagnosis.
2.  Use General Language: Frame possibilities as general categories (e.g., 'looks like a common insect bite,' 'appears to be a minor scrape').
3.  No Medications: Never suggest any specific medications, prescription or over-the-counter.
4.  Safe Advice Only: Stick to universally safe, non-medical advice (e.g., 'keep the area clean,' 'avoid scratching').
5.  Always Be Cautious: If the image is unclear, ambiguous, or appears serious, set the concern level to 'Medium' and strongly recommend consulting a healthcare professional.
6.  Strict JSON Output: Your entire response must be a single, valid JSON object, with no text before or after it.
**User Prompt:**
> Analyze the attached image and provide your response in the required JSON format.

---

## 2. JSON Response Structure

The `/upload` endpoint will return a JSON object with the following structure.

**Field Definitions:**
* `visualDescription` (string): An objective description of what is in the image.
* `possibleCauses` (array of objects): A list of 2-3 general possibilities.
    * `name` (string): The name of the possible cause (e.g., "Insect Bite").
    * `reason` (string): The visual reasoning for the suggestion.
* `concernLevel` (string): Must be either "Low" or "Medium".
* `generalAdvice` (array of strings): A list of safe, non-medical suggestions.
* `disclaimer` (string): The required safety and legal disclaimer.

**Example Response:**

```json
{
  "visualDescription": "A small, raised, circular red bump is visible on the skin. The area immediately surrounding the bump shows minor redness and slight swelling.",
  "possibleCauses": [
    {
      "name": "Insect Bite",
      "reason": "The isolated, raised, and inflamed appearance is very common for bites from insects like mosquitoes."
    },
    {
      "name": "Mild Allergic Reaction",
      "reason": "Localized skin reactions can sometimes present as small, itchy bumps."
    }
  ],
  "concernLevel": "Low",
  "generalAdvice": [
    "Avoid scratching the area to prevent further irritation.",
    "Applying a cool, damp cloth may help soothe the area.",
    "Keep the area clean with mild soap and water."
  ],
  "disclaimer": "This is an AI-generated analysis and not a medical diagnosis. The information provided is for educational purposes only. Please consult a qualified healthcare professional for any medical concerns."
}
