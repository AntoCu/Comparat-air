import hashlib
import json
import logging
import requests
import secrets
import jwt
import os
import httpx
import psycopg2
import asyncio
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import html

# --- INITIALISATION DE L'API ---
app = FastAPI()

# Configuration CORS pour autoriser ton Front-end React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CHARGEMENT DES VARIABLES D'ENVIRONNEMENT ---
load_dotenv()

# --- CONFIGURATION SÉCURITÉ & CONSTANTES ---
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-pour-les-tests")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

HASH_NAME = "sha256"
HASH_ITERATIONS = 120_000
SALT_LENGTH = 16
MIN_PASSWORD_LENGTH = 8
LOG_FILE_PATH = Path("/var/log/skystream/access.log")
DATABASE_URL = "postgresql://neondb_owner:npg_z4BquTZrYU1M@ep-twilight-hall-al7uza0i-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
COMMON_WEAK_PASSWORDS = {
    "123456", "12345678", "password", "admin", "azerty", "qwerty", "12345"
}
RAPIDAPI_KEY="5a5b59f312mshf5c1dedcf776bedp173088jsn79c3d4a653da"
# --- CONNEXION BASE DE DONNÉES ---
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base de données : {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur (Base de données)")
class FlightSearchRequest(BaseModel):
    departure: str
    date: str
    max_price: float
    passengers: int
    is_direct: bool = False
class UserRegister(BaseModel):
    email: str
    name: str
    password: str
    
class UserLogin(BaseModel):
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


DESTINATIONS = ["JFK", "LHR", "LAX"] 
async def fetch_airport(client, dest, search, rapidapi_key):
    url = "https://google-flights2.p.rapidapi.com/api/v1/searchFlights"
    querystring = {
        "departure_id": search.departure,
        "arrival_id": dest,
        "outbound_date": search.date,
        "adults": search.passengers,
        "currency": "EUR"
    }
    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": "google-flights2.p.rapidapi.com"
    }

    try:
        response = await client.get(url, headers=headers, params=querystring, timeout=15.0)
        
        print(f"--- STATUS {response.status_code} POUR {dest} ---")
        
        if response.status_code == 200:
            data = response.json()
            itineraries = data.get("data", {}).get("itineraries", {})
            top_flights = itineraries.get("topFlights", [])
            other_flights = itineraries.get("otherFlights", [])
            flights_list = top_flights + other_flights
            
            dest_flights = []
            
            for option in flights_list:
                # Filtre vol direct
                if search.is_direct and option.get("stops", 0) > 0:
                    continue
                
                # Filtre prix
                price = option.get("price", 9999)
                if isinstance(price, dict): 
                    price = price.get("raw", 9999)
                
                if price <= search.max_price:
                    segments = option.get("flights", [])
                    arrivee_nom = dest
                    if segments:
                        last_segment = segments[-1]
                        arrivee_nom = last_segment.get("arrival_airport", {}).get("airport_name", dest)

                    dest_flights.append({
                        "id": option.get("booking_token", secrets.token_hex(6)),
                        "dest": dest,
                        "arrivee": arrivee_nom,
                        "horaire_depart": option.get("departure_time", "N/A"),
                        "horaire_arrivee": option.get("arrival_time", "N/A"),
                        "prix": price,
                        "passagers": search.passengers
                    })
            return dest_flights
        else:
            return [] # Si erreur (ex: 429), on renvoie une liste vide pour cet aéroport
    except Exception as e:
        print(f"Erreur pour {dest}: {e}")
        return []
    
@app.post("/search-flights")
async def search_flights(search: FlightSearchRequest):
    rapidapi_key = "5a5b59f312mshf5c1dedcf776bedp173088jsn79c3d4a653da"
    async with httpx.AsyncClient() as client:
        tasks = []
        
        for dest in DESTINATIONS:
            tasks.append(fetch_airport(client, dest, search, rapidapi_key))
            
            await asyncio.sleep(0.2) 
        
        results_matrix = await asyncio.gather(*tasks)
    
    all_flights = []
    for airport_results in results_matrix:
        all_flights.extend(airport_results)

    # On trie et on limite à 20
    all_flights = sorted(all_flights, key=lambda x: x["prix"])    
    return {"results": all_flights}

# --- ROUTES API ---

@app.post("/register")
def register(user: UserRegister):
    clean_email = sanitize_input(user.email)
    clean_name = sanitize_input(user.name)
    
    if not is_password_strong(user.password):
        raise HTTPException(status_code=400, detail="Mot de passe trop faible")
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Vérifier si l'email ou le nom existe déjà
        cursor.execute('SELECT id FROM "Users" WHERE email = %s OR name = %s', (clean_email, clean_name))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email ou nom déjà utilisé")
        
        # Vérifier s'il y a déjà des utilisateurs pour assigner le rôle (le 1er est admin)
        cursor.execute('SELECT COUNT(*) as count FROM "Users"')
        count = cursor.fetchone()['count']
        role = "admin" if count == 0 else "standard"
        
        hashed_password = hash_password(user.password)
        
        # Insertion dans Neon
        cursor.execute(
            'INSERT INTO "Users" (email, name, password, role) VALUES (%s, %s, %s, %s)',
            (clean_email, clean_name, hashed_password, role)
        )
        conn.commit()
        return {"message": f"Utilisateur créé avec succès"}
        
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Erreur base de données")
    finally:
        cursor.close()
        conn.close()

@app.post("/login")
def login(user: UserLogin, request: Request):
    ip_address = request.client.host if request.client else "unknown"
    clean_email = sanitize_input(user.email)
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Récupérer l'utilisateur
        cursor.execute('SELECT * FROM "Users" WHERE email = %s', (clean_email,))
        user_entry = cursor.fetchone()
        
        if not user_entry:
            log_failed_login(user.email, ip_address, "unknown_user")
            raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

        if not verify_password(user.password, user_entry["password"]):
            log_failed_login(user.email, ip_address, "wrong_password")
            raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

        # Le rôle est maintenant récupéré depuis la DB
        token = create_access_token(data={"sub": user_entry["email"], "role": user_entry["role"]})
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "email": user_entry["email"],
            "role": user_entry["role"],
            "name": user_entry["name"]
        }
    finally:
        cursor.close()
        conn.close()
        

@app.get("/admin/logs")
def get_logs(request: Request):
    # Vérification stricte du rôle Admin via le JWT
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
def search_destination(request: SearchRequest):
    raw_query = request.query
    cleaned_query = sanitize_input(raw_query)
    return {"cleaned_query": cleaned_query}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)