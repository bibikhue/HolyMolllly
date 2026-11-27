import os
import time
from secrets import compare_digest, token_urlsafe


# Temporary in-memory accounts; replace this lookup with a repository later.
USERS = {
    "admin123": {"password": "pass123", "role": "admin"},
    "user123": {"password": "pass123", "role": "user"},
}
COOKIE_NAME = "auth_session"
SESSION_SECONDS = 3600
COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"
_sessions = {}


def authenticate(username: str, password: str):
    user = USERS.get(username)
    expected = user["password"] if user else ""
    valid = compare_digest(password.encode("utf-8"), expected.encode("utf-8"))
    if user is None or not valid:
        return None
    return {"username": username, "role": user["role"]}


def create_session(user):
    now = time.time()
    for token, session in list(_sessions.items()):
        if session["expires"] <= now:
            del _sessions[token]
    token = f"{token_urlsafe(32)}.{user['role']}"
    _sessions[token] = {**user, "expires": now + SESSION_SECONDS}
    return token


def read_session(token):
    session = _sessions.get(token)
    if session is None:
        return None
    account = USERS.get(session["username"])
    if session["expires"] <= time.time() or not account or account["role"] != session["role"]:
        revoke_session(token)
        return None
    return {"username": session["username"], "role": session["role"]}


def revoke_session(token):
    _sessions.pop(token, None)
