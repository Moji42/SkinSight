# src/backend/app.py
import os
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load .env from project root (or wherever you keep it)
env_path = Path(__file__).resolve().parents[1] / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    # fallback: load from current folder .env if present
    load_dotenv()

# Create Flask app
app = Flask(__name__, static_folder=None)  # set static_folder if you want to serve uploads in dev
CORS(app, resources={r"/*": {"origins": os.getenv("FRONTEND_ORIGIN", "*")}})

# Register blueprints (chat_route.py must define chat_bp)
try:
    # If chat_route.py sits in the same directory as this file
    from chat_route import chat_bp
    app.register_blueprint(chat_bp, url_prefix="/chat")
except Exception as e:
    # Friendly error that won't crash everything during early dev
    # But do log so you know what's wrong
    app.logger.warning("Could not register chat blueprint. Make sure chat_route.py exists and defines chat_bp. Error: %s", e)


# Simple health / test endpoints
@app.route("/test")
def test():
    return jsonify({"message": "Flask is working!"})


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok"})


# Optional: simple route to show env (dangerous in prod, useful in dev)
@app.route("/_env")
def show_env():
    if os.getenv("FLASK_ENV") == "development":
        return jsonify({k: os.getenv(k) for k in ["OPENAI_API_KEY", "REDIS_URL", "FRONTEND_ORIGIN"]})
    return jsonify({"error": "not allowed"}), 403


if __name__ == "__main__":
    # Read host/port from env so Render/Vercel/whatever can set them
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "true").lower() in ("1", "true", "yes")
    app.run(host=host, port=port, debug=debug)
