import os
from pathlib import Path
from slowapi import Limiter
from slowapi.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()

# Base de données (Sécurisé : plantera si absent du .env)
DATABASE_URL = os.environ["DATABASE_URL"]

# Sécurité JWT (Sécurisé : on retire le fallback dangereux)
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

RAPIDAPI_KEY = os.environ["RAPIDAPI_KEY"]
DESTINATIONS = ["JFK", "LHR", "LAX"]

# Logs
LOG_FILE_PATH = Path("skystream_access.log")

MAIL_USER = os.getenv("MAIL_USER")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)
