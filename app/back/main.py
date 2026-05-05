import hashlib
import json
import logging
import secrets
import jwt
import os
import httpx
import psycopg2
import asyncio
from psycopg2.extras import RealDictCursor
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

load_dotenv()

app = FastAPI()

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
DATABASE_URL = "postgresql://neondb_owner:npg_z4BquTZrYU1M@ep-twilight-hall-al7uza0i-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
COMMON_WEAK_PASSWORDS = {
    "123456",
    "12345678",
    "password",
    "admin",
    "azerty",
    "qwerty",
    "12345",
}
RAPIDAPI_KEY = "d9bee26769mshb58290d712a14f7p1eeab9jsnf8a45fc32106"


# --- CONNEXION BASE DE DONNÉES ---
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base de données : {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur (Base de données)")


class FlightLikeRequest(BaseModel):
    user_id: int
    flight_id: str
    depart: str
    arrivee: str
    jour: str
    prix: float
    passagers: int


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
    derived = hashlib.pbkdf2_hmac(
        HASH_NAME, password.encode(), salt.encode(), HASH_ITERATIONS
    )
    return f"{salt}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, stored_hex = stored_hash.split("$", 1)
        derived = hashlib.pbkdf2_hmac(
            HASH_NAME, password.encode(), salt.encode(), HASH_ITERATIONS
        )
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
        "currency": "EUR",
    }
    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": "google-flights2.p.rapidapi.com",
    }

    try:
        # Timeout étendu à 30s pour laisser le temps à l'API
        response = await client.get(
            url, headers=headers, params=querystring, timeout=30.0
        )

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
                    segments = option.get("flights") or []
                    arrivee_nom = dest
                    depart_code = search.departure

                    if segments:
                        if isinstance(segments[-1], dict):
                            arrivee_nom = (
                                segments[-1]
                                .get("arrival_airport", {})
                                .get("airport_name", dest)
                            )
                        if isinstance(segments[0], dict):
                            depart_code = (
                                segments[0]
                                .get("departure_airport", {})
                                .get("airport_code", search.departure)
                            )

                    carbon = option.get("carbon_emissions")
                    co2_kg = 0
                    diff_percent = 0
                    is_higher = False

                    if isinstance(carbon, dict):
                        co2_val = carbon.get("CO2e")
                        if isinstance(co2_val, (int, float)):
                            co2_kg = int(co2_val / 1000)

                        diff_val = carbon.get("difference_percent")
                        if isinstance(diff_val, (int, float)):
                            diff_percent = int(diff_val)

                        is_higher = "higher" in carbon

                    dest_flights.append(
                        {
                            "id": option.get("booking_token", secrets.token_hex(6)),
                            "depart": depart_code,
                            "arrivee": arrivee_nom,
                            "horaire_depart": option.get("departure_time", "N/A"),
                            "horaire_arrivee": option.get("arrival_time", "N/A"),
                            "prix": price,
                            "passagers": search.passengers,
                            "emissions_co2": co2_kg,
                            "emissions_diff": diff_percent,
                            "emissions_higher": is_higher,
                        }
                    )
            return dest_flights
        else:
            return []
    except Exception as e:
        print(f"Erreur critique pour {dest}: {type(e).__name__} - {str(e)}")
        return []


@app.post("/search-flights")
async def search_flights(search: FlightSearchRequest):
    rapidapi_key = RAPIDAPI_KEY
    all_flights = []

    async with httpx.AsyncClient() as client:
        for dest in DESTINATIONS:
            print(f"Recherche vers {dest} en cours...")

            airport_results = await fetch_airport(client, dest, search, rapidapi_key)
            all_flights.extend(airport_results)

            await asyncio.sleep(1.5)

    # On trie du moins cher au plus cher
    all_flights = sorted(all_flights, key=lambda x: x["prix"])
    return {"results": all_flights}


@app.post("/like")
async def add_like(like: FlightLikeRequest):
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO "Tracked_Flights" (flight_id, "from", dest, day, passengers_nbr)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT ("flight_id", "passengers_nbr") 
            DO UPDATE SET flight_id = EXCLUDED.flight_id
            RETURNING id;
        """,
            (like.flight_id, like.depart, like.arrivee, like.jour, like.passagers),
        )

        tracked_flight_id = cursor.fetchone()[0]

        cursor.execute(
            """
            INSERT INTO "Price_History" (tracked_flight_id, price)
            VALUES (%s, %s);
        """,
            (tracked_flight_id, like.prix),
        )

        cursor.execute(
            """
            INSERT INTO "Likes" (user_id, tracked_flight_id)
            VALUES (%s, %s)
            ON CONFLICT ("user_id", "tracked_flight_id") DO NOTHING;
        """,
            (like.user_id, tracked_flight_id),
        )

        conn.commit()

        if cursor.rowcount == 0:
            return {"message": "Ce vol est déjà dans tes favoris !"}

        print(f"Vol {like.flight_id} liké avec succès par l'user {like.user_id} !")
        return {"message": "Vol ajouté aux favoris avec succès"}

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Erreur SQL lors du Like : {e}")
        return {"error": "Impossible d'ajouter ce vol aux favoris"}

    finally:
        if conn:
            cursor.close()
            conn.close()


@app.post("/register")
def register(user: UserRegister):
    clean_email = sanitize_input(user.email)
    clean_name = sanitize_input(user.name)

    if not is_password_strong(user.password):
        raise HTTPException(status_code=400, detail="Mot de passe trop faible")

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            'SELECT id FROM "Users" WHERE email = %s OR name = %s',
            (clean_email, clean_name),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email ou nom déjà utilisé")

        cursor.execute('SELECT COUNT(*) as count FROM "Users"')
        count = cursor.fetchone()["count"]
        role = "admin" if count == 0 else "standard"

        hashed_password = hash_password(user.password)

        cursor.execute(
            'INSERT INTO "Users" (email, name, password, role) VALUES (%s, %s, %s, %s)',
            (clean_email, clean_name, hashed_password, role),
        )
        conn.commit()
        return {"message": "Utilisateur créé avec succès"}

    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(e, status_code=500, detail="Erreur base de données")
    finally:
        cursor.close()
        conn.close()


@app.get("/likes/{user_id}")
def get_user_likes(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT 
                tf.id, 
                tf.flight_id, 
                tf."from" as depart, 
                tf.dest as arrivee, 
                tf.day as jour, 
                tf.passengers_nbr as passagers,
                (SELECT price FROM "Price_History" ph WHERE ph.tracked_flight_id = tf.id ORDER BY id DESC LIMIT 1) as prix
            FROM "Likes" l
            JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id
            WHERE l.user_id = %s
            ORDER BY l.id DESC;
        """,
            (user_id,),
        )

        likes = cursor.fetchall()
        return {"likes": likes}

    except Exception as e:
        print(f"Erreur SQL lors de la récupération des likes : {e}")
        raise HTTPException(
            status_code=500, detail="Impossible de récupérer les favoris"
        )
    finally:
        cursor.close()
        conn.close()


@app.post("/login")
@limiter.limit("5 per minute")
def login(user: UserLogin, request: Request):
    ip_address = request.client.host if request.client else "unknown"
    clean_email = sanitize_input(user.email)

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute('SELECT * FROM "Users" WHERE email = %s', (clean_email,))
        user_entry = cursor.fetchone()

        if not user_entry:
            log_failed_login(user.email, ip_address, "unknown_user")
            raise HTTPException(
                status_code=400, detail="Email ou mot de passe incorrect"
            )

        if not verify_password(user.password, user_entry["password"]):
            log_failed_login(user.email, ip_address, "wrong_password")
            raise HTTPException(
                status_code=400, detail="Email ou mot de passe incorrect"
            )

        token = create_access_token(
            data={"sub": user_entry["email"], "role": user_entry["role"]}
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "id": user_entry["id"],
            "email": user_entry["email"],
            "role": user_entry["role"],
            "name": user_entry["name"],
        }
    finally:
        cursor.close()
        conn.close()


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


@app.post("/refresh-likes/{user_id}")
async def refresh_user_likes(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT tf.id as tracked_flight_id, tf."from" as depart, tf.dest as arrivee, tf.day as jour, tf.passengers_nbr as passagers
            FROM "Likes" l
            JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id
            WHERE l.user_id = %s
        """,
            (user_id,),
        )
        liked_flights = cursor.fetchall()

        if not liked_flights:
            return {"message": "Aucun vol à rafraîchir."}

        updates = 0

        async with httpx.AsyncClient() as client:
            for flight in liked_flights:
                url = "https://google-flights2.p.rapidapi.com/api/v1/searchFlights"
                querystring = {
                    "departure_id": flight["depart"],
                    "arrival_id": flight["arrivee"],
                    "outbound_date": flight["jour"],
                    "adults": flight["passagers"],
                    "currency": "EUR",
                }
                headers = {
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": "google-flights2.p.rapidapi.com",
                }

                try:
                    response = await client.get(
                        url, headers=headers, params=querystring, timeout=15.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        itineraries = data.get("data", {}).get("itineraries", {})
                        flights_list = itineraries.get(
                            "topFlights", []
                        ) + itineraries.get("otherFlights", [])

                        if flights_list:
                            min_price = min(
                                (
                                    opt.get("price", {}).get("raw", 9999)
                                    if isinstance(opt.get("price"), dict)
                                    else opt.get("price", 9999)
                                )
                                for opt in flights_list
                            )

                            cursor.execute(
                                """
                                INSERT INTO "Price_History" (tracked_flight_id, price)
                                VALUES (%s, %s);
                            """,
                                (flight["tracked_flight_id"], min_price),
                            )
                            updates += 1

                except Exception as e:
                    print(
                        f"Erreur API lors du rafraîchissement s du vol {flight['tracked_flight_id']}: {e}"
                    )

                await asyncio.sleep(1)

        conn.commit()
        return {"message": f"Mise à jour terminée ! {updates} prix actualisés."}

    except Exception as e:
        conn.rollback()
        print(f"Erreur SQL lors du refresh : {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du rafraîchissement")
    finally:
        cursor.close()
        conn.close()


@app.post("/search-destination")
@limiter.limit("20 per minute")
def search_destination(request: SearchRequest, request_obj: Request):
    cleaned_query = sanitize_input(request.query)
    return {"cleaned_query": cleaned_query}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
