# src/backend/chat_route.py
from flask import Blueprint, request, jsonify
from .openai_client import analyze_image_with_model
from .history import add_message, get_history

chat_bp = Blueprint("chat", __name__, url_prefix="/chat")

@chat_bp.route("", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    session_id = data.get("session_id")
    image_id = data.get("image_id")
    message = data.get("message", "").strip()

    if not session_id:
        return jsonify({"error": "session_id required"}), 400

    if message:
        add_message(session_id, "user", message)

    history = get_history(session_id)

    # Call encapsulated OpenAI function (handles prompt, image passing, schema validation)
    ai_json, raw = analyze_image_with_model(image_id=image_id, user_message=message, history=history)

    # Save assistant response to history as string
    add_message(session_id, "assistant", ai_json if isinstance(ai_json, str) else str(ai_json))

    return jsonify({"ai": ai_json, "raw_model_response": raw})
