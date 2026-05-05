import httpx
import asyncio
import json
from fastapi import APIRouter, HTTPException, Request
from psycopg2.extras import RealDictCursor

from src.models import FlightSearchRequest, FlightLikeRequest, UserRegister, UserLogin, SearchRequest
from src.router.tasks import fetch_airport
from src.internal.config import RAPIDAPI_KEY, DESTINATIONS, limiter, LOG_FILE_PATH
from src.internal.database import get_db_connection
from src.internal.security import (
    sanitize_input, is_password_strong, hash_password, verify_password,
    create_access_token, get_current_user_role
)
from src.internal.logger import log_failed_login

# C'est ici que la magie opère : APIRouter remplace le "app"
router = APIRouter()

@router.post("/search-flights")
async def search_flights(search: FlightSearchRequest):
    all_flights = []
    async with httpx.AsyncClient() as client:
        for dest in DESTINATIONS:
            print(f"✈️ Recherche vers {dest} en cours...")
            airport_results = await fetch_airport(client, dest, search, RAPIDAPI_KEY)
            all_flights.extend(airport_results)
            await asyncio.sleep(1.5)

    all_flights = sorted(all_flights, key=lambda x: x["prix"])
    return {"results": all_flights}


@router.post("/like")
async def add_like(like: FlightLikeRequest):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO "Tracked_Flights" (flight_id, "from", dest, day, passengers_nbr)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT ("flight_id", "passengers_nbr") 
            DO UPDATE SET flight_id = EXCLUDED.flight_id
            RETURNING id;
        """, (like.flight_id, like.depart, like.arrivee, like.jour, like.passagers))
        
        tracked_flight_id = cursor.fetchone()[0]

        cursor.execute('INSERT INTO "Price_History" (tracked_flight_id, price) VALUES (%s, %s);', (tracked_flight_id, like.prix))
        cursor.execute('INSERT INTO "Likes" (user_id, tracked_flight_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;', (like.user_id, tracked_flight_id))
        conn.commit()
        
        if cursor.rowcount == 0: return {"message": "Ce vol est déjà dans tes favoris !"}
        return {"message": "Vol ajouté aux favoris avec succès"}
    except Exception as e:
        if conn: conn.rollback()
        return {"error": "Impossible d'ajouter ce vol aux favoris"}
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/register")
def register(user: UserRegister):
    clean_email, clean_name = sanitize_input(user.email), sanitize_input(user.name)
    if not is_password_strong(user.password): raise HTTPException(status_code=400, detail="Mot de passe trop faible")

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute('SELECT id FROM "Users" WHERE email = %s OR name = %s', (clean_email, clean_name))
        if cursor.fetchone(): raise HTTPException(status_code=400, detail="Email ou nom déjà utilisé")

        cursor.execute('SELECT COUNT(*) as count FROM "Users"')
        role = "admin" if cursor.fetchone()["count"] == 0 else "standard"
        hashed_password = hash_password(user.password)

        cursor.execute('INSERT INTO "Users" (email, name, password, role) VALUES (%s, %s, %s, %s)', (clean_email, clean_name, hashed_password, role))
        conn.commit()
        return {"message": "Utilisateur créé avec succès"}
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Erreur base de données")
    finally:
        cursor.close()
        conn.close()


@router.get("/likes/{user_id}")
def get_user_likes(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("""
            SELECT tf.id, tf.flight_id, tf."from" as depart, tf.dest as arrivee, tf.day as jour, tf.passengers_nbr as passagers,
                   (SELECT price FROM "Price_History" ph WHERE ph.tracked_flight_id = tf.id ORDER BY id DESC LIMIT 1) as prix
            FROM "Likes" l JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id
            WHERE l.user_id = %s ORDER BY l.id DESC;
        """, (user_id,))
        return {"likes": cursor.fetchall()}
    except Exception:
        raise HTTPException(status_code=500, detail="Impossible de récupérer les favoris")
    finally:
        cursor.close()
        conn.close()


@router.post("/login")
@limiter.limit("5 per minute")
def login(user: UserLogin, request: Request):
    ip_address = request.client.host if request.client else "unknown"
    clean_email = sanitize_input(user.email)
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute('SELECT * FROM "Users" WHERE email = %s', (clean_email,))
        user_entry = cursor.fetchone()

        if not user_entry or not verify_password(user.password, user_entry["password"]):
            log_failed_login(user.email, ip_address, "auth_failed")
            raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

        token = create_access_token(data={"sub": user_entry["email"], "role": user_entry["role"]})
        return {"access_token": token, "token_type": "bearer", "id": user_entry["id"], "email": user_entry["email"], "role": user_entry["role"], "name": user_entry["name"]}
    finally:
        cursor.close()
        conn.close()


@router.get("/admin/logs")
def get_logs(request: Request):
    if get_current_user_role(request) != "admin": raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    if not LOG_FILE_PATH.exists(): return []
    try:
        with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
            logs = [json.loads(line) for line in f.readlines() if line.strip()]
            return logs[::-1][:50]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lecture logs: {str(e)}")


@router.post("/refresh-likes/{user_id}")
async def refresh_user_likes(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute('SELECT tf.id as tracked_flight_id, tf."from" as depart, tf.dest as arrivee, tf.day as jour, tf.passengers_nbr as passagers FROM "Likes" l JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id WHERE l.user_id = %s', (user_id,))
        liked_flights = cursor.fetchall()
        if not liked_flights: return {"message": "Aucun vol à rafraîchir."}

        updates = 0
        async with httpx.AsyncClient() as client:
            for flight in liked_flights:
                url, querystring = "https://google-flights2.p.rapidapi.com/api/v1/searchFlights", {"departure_id": flight["depart"], "arrival_id": flight["arrivee"], "outbound_date": flight["jour"], "adults": flight["passagers"], "currency": "EUR"}
                headers = {"X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "google-flights2.p.rapidapi.com"}
                try:
                    response = await client.get(url, headers=headers, params=querystring, timeout=15.0)
                    if response.status_code == 200:
                        flights_list = response.json().get("data", {}).get("itineraries", {}).get("topFlights", []) + response.json().get("data", {}).get("itineraries", {}).get("otherFlights", [])
                        if flights_list:
                            min_price = min((opt.get("price", {}).get("raw", 9999) if isinstance(opt.get("price"), dict) else opt.get("price", 9999)) for opt in flights_list)
                            cursor.execute('INSERT INTO "Price_History" (tracked_flight_id, price) VALUES (%s, %s);', (flight["tracked_flight_id"], min_price))
                            updates += 1
                except Exception: pass
                await asyncio.sleep(1)
        conn.commit()
        return {"message": f"Mise à jour terminée ! {updates} prix actualisés."}
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors du rafraîchissement")
    finally:
        cursor.close()
        conn.close()


@router.post("/search-destination")
@limiter.limit("20 per minute")
def search_destination(request: SearchRequest, request_obj: Request):
    return {"cleaned_query": sanitize_input(request.query)}