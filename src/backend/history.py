# src/backend/history.py
import os, json, time
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
r = redis.from_url(REDIS_URL, decode_responses=True)
MAX_HISTORY = int(os.getenv("MAX_HISTORY_ITEMS", "20"))
TTL = 7 * 24 * 3600

def key(session_id):
    return f"mediquip:history:{session_id}"

def add_message(session_id, role, content):
    entry = json.dumps({"ts": int(time.time()), "role": role, "content": content})
    r.lpush(key(session_id), entry)
    r.ltrim(key(session_id), 0, MAX_HISTORY-1)
    r.expire(key(session_id), TTL)

def get_history(session_id):
    items = r.lrange(key(session_id), 0, -1)
    return [json.loads(i) for i in reversed(items)]
