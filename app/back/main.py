import hashlib
import json
import logging
import secrets
import jwt
import os
import html
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# 1. Charger les variables d'environnement en premier
load_dotenv()

# 2. Initialiser l'API FastAPI
app = FastAPI()

# 3. Initialiser le Limiteur APRES l'app
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 4. Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION SÉCURITÉ & CONSTANTES ---
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-pour-les-tests")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

HASH_NAME = "sha256"
HASH_ITERATIONS = 120_000
SALT_LENGTH = 16
MIN_PASSWORD_LENGTH = 8
LOG_FILE_PATH = Path("/var/log/skystream/access.log")

COMMON_WEAK_PASSWORDS = {
    "123456", "12345678", "password", "admin", "azerty", "qwerty", "12345"
}

users_db = {}

class User(BaseModel):
    email: str
    password: str

class SearchRequest(BaseModel):
    query: str

# --- SYSTÈME DE LOGS POUR WAZUH ---
def setup_access_logger() -> logging.Logger:
    logger = logging.getLogger("fastapi_access")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
    try:
        LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(LOG_FILE_PATH, encoding="utf-8")
    except (OSError, PermissionError):
        handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger

ACCESS_LOGGER = setup_access_logger()

def log_failed_login(user_email: str, ip_address: str, reason: str) -> None:
    log_entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "event": "login_failed",
        "user": user_email,
        "ip": ip_address,
        "reason": reason,
    }
    ACCESS_LOGGER.info(json.dumps(log_entry, ensure_ascii=False))

# --- FONCTIONS DE HACHAGE ---
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
    has_spec  = any(not c.isalnum() for c in password)
    return all([has_upper, has_lower, has_digit, has_spec])

# --- GESTION DES JETONS JWT & RÔLES ---
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

# --- PROTECTION ANTI-XSS ---
def sanitize_input(text: str) -> str:
    text = text.strip()
    clean_text = html.escape(text)
    if "script" in clean_text.lower():
        clean_text = clean_text.lower().replace("script", "[BLOCKED]")
    return clean_text

# --- ROUTES API ---

@app.post("/register")
def register(user: User):
    clean_email = sanitize_input(user.email)
    if clean_email in users_db:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    if not is_password_strong(user.password):
        raise HTTPException(status_code=400, detail="Mot de passe trop faible")
    
    role = "admin" if len(users_db) == 0 else "standard"
    users_db[user.email] = {
        "password": hash_password(user.password),
        "role": role
    }
    return {"message": f"Utilisateur créé avec le rôle {role}"}

@app.post("/login")
@limiter.limit("5 per minute")
def login(user: User, request: Request):
    user_entry = users_db.get(user.email)
    ip_address = request.client.host if request.client else "unknown"

    if not user_entry:
        log_failed_login(user.email, ip_address, "unknown_user")
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    if not verify_password(user.password, user_entry["password"]):
        log_failed_login(user.email, ip_address, "wrong_password")
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    token = create_access_token(data={"sub": user.email, "role": user_entry["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "email": user.email,
        "role": user_entry["role"]
    }

@app.get("/admin/logs")
def get_logs(request: Request):
    role = get_current_user_role(request)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    if not LOG_FILE_PATH.exists():
        return []
    
    try:
        with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
            logs = [json.loads(line) for line in lines if line.strip()]
            return logs[::-1][:50]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lecture logs: {str(e)}")
    
@app.post("/search-destination")
@limiter.limit("20 per minute")
def search_destination(request: SearchRequest, request_obj: Request): 
    # request_obj est utilisé par SlowAPI, request est ton modèle Pydantic
    cleaned_query = sanitize_input(request.query)
    return {"cleaned_query": cleaned_query}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)