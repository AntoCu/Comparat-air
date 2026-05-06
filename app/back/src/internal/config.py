import os
from pathlib import Path
from slowapi import Limiter
from slowapi.util import get_remote_address
from dotenv import load_dotenv

# 1. On charge le fichier .env dès le début
load_dotenv()

# Base de données (Sécurisé : plantera si absent du .env)
DATABASE_URL = os.environ["DATABASE_URL"]

# Sécurité JWT (Sécurisé : on retire le fallback dangereux)
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = os.getenv("ALGORITHM", "HS256") # Le fallback est OK ici car ce n'est pas un secret
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# API Tiers (Sécurisé : plantera si absent du .env)
RAPIDAPI_KEY = os.environ["RAPIDAPI_KEY"]
DESTINATIONS = ["JFK", "LHR", "LAX"]

# Logs
LOG_FILE_PATH = Path("/var/log/skystream/access.log")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)