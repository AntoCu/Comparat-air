import hashlib
import secrets
import jwt
import html
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
from src.internal.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

HASH_NAME = "sha256"
HASH_ITERATIONS = 120_000
SALT_LENGTH = 16
MIN_PASSWORD_LENGTH = 8
COMMON_WEAK_PASSWORDS = {"123456", "12345678", "password", "admin", "azerty", "qwerty", "12345"}

def hash_password(password: str) -> str:
    salt = secrets.token_hex(SALT_LENGTH)
    derived = hashlib.pbkdf2_hmac(HASH_NAME, password.encode(), salt.encode(), HASH_ITERATIONS)
    return f"{salt}${derived.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, stored_hex = stored_hash.split("$", 1)
        derived = hashlib.pbkdf2_hmac(HASH_NAME, password.encode(), salt.encode(), HASH_ITERATIONS)
        return secrets.compare_digest(derived.hex(), stored_hex)
    except ValueError:
        return False

def is_password_strong(password: str) -> bool:
    if len(password) < MIN_PASSWORD_LENGTH or password.lower() in COMMON_WEAK_PASSWORDS:
        return False
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_spec = any(not c.isalnum() for c in password)
    return all([has_upper, has_lower, has_digit, has_spec])

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_role(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("role")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except Exception:
        raise HTTPException(status_code=401, detail="Jeton invalide")

def sanitize_input(text: str) -> str:
    text = text.strip()
    clean_text = html.escape(text)
    if "script" in clean_text.lower():
        clean_text = clean_text.lower().replace("script", "[BLOCKED]")
    return clean_text