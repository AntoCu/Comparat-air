import hashlib
import json
import logging
import secrets
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Autorise React (port 5173) à discuter avec FastAPI (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stockage en mémoire pour l'exemple
users_db: dict[str, str] = {}

# Ce que l'utilisateur doit envoyer
class User(BaseModel):
    email: str
    password: str

HASH_NAME = "sha256"
HASH_ITERATIONS = 120_000
SALT_LENGTH = 16
MIN_PASSWORD_LENGTH = 8
LOG_FILE_PATH = Path("/var/log/skystream/access.log")

COMMON_WEAK_PASSWORDS = {
    "123456",
    "12345678",
    "123456789",
    "password",
    "motdepasse",
    "admin",
    "azerty",
    "qwerty",
    "password123",
    "iloveyou",
    "000000",
}


# Configure and return the access logger used to write login failure events.
def setup_access_logger() -> logging.Logger:
    logger = logging.getLogger("fastapi_access")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    for handler in list(logger.handlers):
        logger.removeHandler(handler)

    try:
        LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(LOG_FILE_PATH, encoding="utf-8")
    except (OSError, PermissionError) as exc:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        logger.error(f"Unable to open access log file {LOG_FILE_PATH}: {exc}")
        return logger

    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger


ACCESS_LOGGER = setup_access_logger()


# Hash a user password with a salt so it can be stored securely.
def hash_password(password: str) -> str:
    salt = secrets.token_hex(SALT_LENGTH)
    derived = hashlib.pbkdf2_hmac(
        HASH_NAME,
        password.encode("utf-8"),
        salt.encode("utf-8"),
        HASH_ITERATIONS,
    )
    return f"{salt}${derived.hex()}"


# Verify a password by comparing its derived hash with the stored hash.
def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, stored_hex = stored_hash.split("$", 1)
    except ValueError:
        return False

    derived = hashlib.pbkdf2_hmac(
        HASH_NAME,
        password.encode("utf-8"),
        salt.encode("utf-8"),
        HASH_ITERATIONS,
    )
    return secrets.compare_digest(derived.hex(), stored_hex)


# Log a failed login attempt as a JSON event for later analysis.
def log_failed_login(user_email: str, ip_address: str, reason: str) -> None:
    log_entry = {
        "event": "login_failed",
        "user": user_email,
        "ip": ip_address,
        "reason": reason,
    }
    ACCESS_LOGGER.info(json.dumps(log_entry, ensure_ascii=False))


# Check whether a password meets strength rules before allowing registration.
def is_password_strong(password: str) -> bool:
    normalized = password.strip().lower()
    if len(password) < MIN_PASSWORD_LENGTH:
        return False
    if normalized in COMMON_WEAK_PASSWORDS:
        return False
    if password.isnumeric():
        return False
    if password.isalpha():
        return False
    if not any(char.isdigit() for char in password):
        return False
    if not any(char.isalpha() for char in password):
        return False
    if not any(char.isupper() for char in password):
        return False
    if not any(not char.isalnum() for char in password):
        return False
    return True


@app.post("/register")
# Handle user signup, validate the password, and store the hashed password.
def register(user: User):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    if not is_password_strong(user.password):
        raise HTTPException(
            status_code=400,
            detail=(
                "Mot de passe trop faible : au moins 8 caractères, "
                "une majuscule, un chiffre, un caractère spécial, "
                "et évitez les mots trop simples."
            ),
        )

    users_db[user.email] = hash_password(user.password)
    return {"message": "Utilisateur créé", "email": user.email}


@app.post("/login")
# Handle user login and log failed attempts with IP and reason.
def login(user: User, request: Request):
    stored_hash = users_db.get(user.email)
    ip_address = request.client.host if request.client else "unknown"

    if stored_hash is None:
        log_failed_login(user.email, ip_address, "unknown_user")
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    if not verify_password(user.password, stored_hash):
        log_failed_login(user.email, ip_address, "wrong_password")
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    return {"message": "Connexion réussie !", "email": user.email}

