import hashlib
import secrets
from fastapi import FastAPI, HTTPException
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


def hash_password(password: str) -> str:
    salt = secrets.token_hex(SALT_LENGTH)
    derived = hashlib.pbkdf2_hmac(
        HASH_NAME,
        password.encode("utf-8"),
        salt.encode("utf-8"),
        HASH_ITERATIONS,
    )
    return f"{salt}${derived.hex()}"


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
def login(user: User):
    stored_hash = users_db.get(user.email)
    if stored_hash is None or not verify_password(user.password, stored_hash):
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    return {"message": "Connexion réussie !", "email": user.email}

