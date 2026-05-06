import os
from pathlib import Path
from slowapi import Limiter
from slowapi.util import get_remote_address

# Base de données
DATABASE_URL = "postgresql://neondb_owner:npg_z4BquTZrYU1M@ep-twilight-hall-al7uza0i-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Sécurité JWT
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-pour-les-tests")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# API Tiers
RAPIDAPI_KEY = "d9bee26769mshb58290d712a14f7p1eeab9jsnf8a45fc32106"
DESTINATIONS = ["JFK", "LHR", "BER"]

# Logs
LOG_FILE_PATH = Path("/var/log/skystream/access.log")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)
