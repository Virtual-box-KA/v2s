"""
db.py — Data access layer.
Handles all JSON file I/O with thread-safe locking and the in-memory OTP store.
"""
import json
import os
import threading
from pathlib import Path

# ── File paths ─────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent          # project root
DATA_FILE  = BASE_DIR / "data" / "issues.json"
USERS_FILE = BASE_DIR / "data" / "users.json"

# ── Locks ──────────────────────────────────────────────────────────────────
_issues_lock = threading.Lock()
_users_lock  = threading.Lock()

# ── In-memory OTP store (phone → pending record) ────────────────────────────
pending_verifications: dict = {}


# ── Issues ─────────────────────────────────────────────────────────────────
def read_issues() -> list:
    with _issues_lock:
        try:
            if not DATA_FILE.exists():
                return []
            content = DATA_FILE.read_text(encoding="utf-8").strip()
            return json.loads(content) if content else []
        except Exception as e:
            print(f"[DB] Error reading issues: {e}")
            return []


def write_issues(data: list) -> bool:
    with _issues_lock:
        try:
            DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
            DATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            return True
        except Exception as e:
            print(f"[DB] Error writing issues: {e}")
            return False


# ── Users ──────────────────────────────────────────────────────────────────
def read_users() -> list:
    with _users_lock:
        try:
            if not USERS_FILE.exists():
                return []
            content = USERS_FILE.read_text(encoding="utf-8").strip()
            return json.loads(content) if content else []
        except Exception as e:
            print(f"[DB] Error reading users: {e}")
            return []


def write_users(data: list) -> bool:
    with _users_lock:
        try:
            USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
            USERS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            return True
        except Exception as e:
            print(f"[DB] Error writing users: {e}")
            return False
