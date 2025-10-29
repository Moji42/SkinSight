# src/backend/openai_client.py
import os, json, requests
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_URL = "https://api.openai.com/v1/responses"
MODEL = "gpt-4o"  # or gpt-4o-vision

SYSTEM_PROMPT = (
 "System Prompt: You are a helpful AI assistant ... MUST be valid JSON ..."
)

def analyze_image_with_model(image_id=None, user_message="", history=[]):
    # Build prompt
    user_parts = []
    if image_id: user_parts.append(f"Image Data: {image_id}")
    if user_message: user_parts.append(f"User Question: {user_message}")
    user_text = "\n\n".join(user_parts) or "Please analyze the provided image."

    history_text = "\n".join([f"{h['role']}: {h['content']}" for h in history[-10:]])
    payload = {
        "model": MODEL,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text + "\n\nConversationHistory:\n" + history_text}
        ]
    }
    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    resp = requests.post(OPENAI_URL, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    model_json = resp.json()

    # parse model_json into ai_json (attempt robust parsing), fallback safe JSON if fail
    ai_json = safe_extract_json_from_model(model_json)
    return ai_json, model_json

def safe_extract_json_from_model(model_json):
    # attempt to find JSON substring, validate schema; return fallback if parsing fails
    text = ...  # logic to extract text (similar to earlier example)
    try:
        start = text.find("{"); end = text.rfind("}")
        json_text = text[start:end+1]
        ai = json.loads(json_text)
        # TODO: validate with jsonschema
        return ai
    except Exception:
        return {
           "description": "Model output not parseable",
           "possibilities": [],
           "concern_level": "Medium",
           "first_aid": ["If concerned, seek clinician."],
           "disclaimer": "This is general info and not medical advice."
        }
