import os
import httpx
import asyncio
import json
from fastapi import APIRouter, HTTPException, Header, Request, BackgroundTasks
from psycopg2.extras import RealDictCursor

from src.models import (
    ChangePasswordRequest,
    FlightSearchRequest,
    FlightLikeRequest,
    GroupFlightSearchRequest,
    UserRegister,
    UserLogin,
    SearchRequest,
)
from src.internal.mail import send_price_drop_email
from src.router.tasks import fetch_airport
from src.internal.config import RAPIDAPI_KEY, DESTINATIONS, limiter, LOG_FILE_PATH

from src.internal.database import (
    get_db_connection,
    release_db_connection,
    get_total_users,
)
from src.internal.security import (
    sanitize_input,
    is_password_strong,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_role,
)
from src.internal.logger import log_failed_login

router = APIRouter()

CRON_SECRET = os.environ["CRON_SECRET"]

MAX_CONCURRENT_API_CALLS = 5

NOM_VUE_STATS = '"vue_stats_globales_trajets"'


@router.post("/search-flights")
async def search_flights(search: FlightSearchRequest):
    all_flights = []
    sem = asyncio.Semaphore(MAX_CONCURRENT_API_CALLS)

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    stats_map = {}
    try:
        month = int(search.date.split("-")[1])
        cursor.execute(
            f"SELECT * FROM {NOM_VUE_STATS} WHERE mois_recherche = %s AND origine = %s",
            (month, search.departure),
        )
        for row in cursor.fetchall():
            stats_map[row["destination"]] = row
    except Exception as e:
        print(f"Erreur lors de la récupération des stats : {e}")
    finally:
        cursor.close()
        release_db_connection(conn)

    async def fetch_with_sem(client, dest):
        async with sem:
            print(f" Recherche vers {dest} en cours...")
            await asyncio.sleep(0.5)
            return await fetch_airport(client, dest, search, RAPIDAPI_KEY)

    async with httpx.AsyncClient() as client:
        tasks = [fetch_with_sem(client, dest) for dest in DESTINATIONS]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for res in results:
            if isinstance(res, list):
                all_flights.extend(res)

    for flight in all_flights:
        flight["stats"] = stats_map.get(flight["arrivee"])

    all_flights = sorted(all_flights, key=lambda x: x["prix"])
    return {"results": all_flights}


@router.post("/search-group-flights")
async def search_group_flights(search: GroupFlightSearchRequest):
    all_combinations = []
    sem = asyncio.Semaphore(MAX_CONCURRENT_API_CALLS)

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    stats_map = {}
    try:
        month = int(search.date.split("-")[1])
        cursor.execute(
            f"SELECT * FROM {NOM_VUE_STATS} WHERE mois_recherche = %s", (month,)
        )
        for row in cursor.fetchall():
            stats_map[(row["origine"], row["destination"])] = row
    except Exception as e:
        print(f"Erreur stats groupe : {e}")
    finally:
        cursor.close()
        release_db_connection(conn)

    async def fetch_dep_with_sem(client, dest, dep):
        async with sem:
            await asyncio.sleep(0.5)
            s = FlightSearchRequest(
                departure=dep,
                date=search.date,
                max_price=search.max_price,
                passengers=1,
                is_direct=search.is_direct,
            )
            return await fetch_airport(client, dest, s, RAPIDAPI_KEY)

    async with httpx.AsyncClient() as client:
        for dest in DESTINATIONS:
            print(f"👯 Recherche de groupe vers {dest} en cours...")
            tasks = [
                fetch_dep_with_sem(client, dest, dep)
                for dep in search.departures
                if dep.strip()
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            dest_flights_by_dep = []
            for res in results:
                if isinstance(res, list) and res:
                    cheapest = min(res, key=lambda x: x["prix"])
                    dest_flights_by_dep.append(cheapest)

            if len(dest_flights_by_dep) == len(
                [d for d in search.departures if d.strip()]
            ):
                total_price = sum(f["prix"] for f in dest_flights_by_dep)
                if total_price <= search.max_price:
                    for flight in dest_flights_by_dep:
                        flight["stats"] = stats_map.get(
                            (flight["depart"], flight["arrivee"])
                        )

                    all_combinations.append(
                        {
                            "destination": dest,
                            "total_price": total_price,
                            "flights": dest_flights_by_dep,
                        }
                    )

    all_combinations = sorted(all_combinations, key=lambda x: x["total_price"])
    return {"results": all_combinations}


@router.post("/like")
async def add_like(like: FlightLikeRequest):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        signature = f"{like.depart}-{like.arrivee}-{like.jour}"
        cursor.execute(
            """
            INSERT INTO "Tracked_Flights" (flight_id, "from", dest, day, passengers_nbr,eco_percent)
            VALUES (%s, %s, %s, %s, %s,%s)
            ON CONFLICT ("flight_id", "passengers_nbr") 
            DO NOTHING
            RETURNING id;
        """,
            (
                signature,
                like.depart,
                like.arrivee,
                like.jour,
                like.passagers,
                like.eco_percent,
            ),
        )

        result = cursor.fetchone()
        tracked_flight_id = (
            result[0]
            if result
            else cursor.execute(
                'SELECT id FROM "Tracked_Flights" WHERE flight_id = %s AND passengers_nbr = %s',
                (signature, like.passagers),
            )
            or cursor.fetchone()[0]
        )

        cursor.execute(
            'INSERT INTO "Price_History" (tracked_flight_id, price) VALUES (%s, %s);',
            (tracked_flight_id, like.prix),
        )
        cursor.execute(
            'INSERT INTO "Likes" (user_id, tracked_flight_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;',
            (like.user_id, tracked_flight_id),
        )

        conn.commit()
        return {"message": "Vol ajouté aux favoris avec succès"}
    except Exception:
        if conn:
            conn.rollback()
        return {"error": "Impossible d'ajouter ce vol aux favoris"}
    finally:
        if conn:
            cursor.close()
            release_db_connection(conn)


@router.post("/register")
def register(user: UserRegister):
    clean_email, clean_name = sanitize_input(user.email), sanitize_input(user.name)
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
        role = "admin" if cursor.fetchone()["count"] == 0 else "standard"
        hashed_password = hash_password(user.password)

        cursor.execute(
            'INSERT INTO "Users" (email, name, password, role) VALUES (%s, %s, %s, %s)',
            (clean_email, clean_name, hashed_password, role),
        )
        conn.commit()
        return {"message": "Utilisateur créé avec succès"}
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Erreur base de données")
    finally:
        cursor.close()
        release_db_connection(conn)


@router.get("/likes/{user_id}")
def get_user_likes(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            SELECT tf.id, tf.flight_id, tf."from" as depart, tf.dest as arrivee, tf.day as jour, tf.passengers_nbr as passagers, tf.eco_percent,
                   (SELECT price FROM "Price_History" ph WHERE ph.tracked_flight_id = tf.id ORDER BY id DESC LIMIT 1) as prix
            FROM "Likes" l JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id
            WHERE l.user_id = %s ORDER BY l.id DESC;
        """,
            (user_id,),
        )
        likes = cursor.fetchall()

        cursor.execute(f"SELECT * FROM {NOM_VUE_STATS}")
        all_stats = cursor.fetchall()
        stats_map = {
            (row["origine"], row["destination"], int(row["mois_recherche"])): row
            for row in all_stats
        }

        for like in likes:
            try:
                raw_date = like["jour"].split("|")[0].split(" ")[0]
                parts = raw_date.split("-")
                month = int(parts[1]) if len(parts[0]) == 4 else int(parts[1])
                like["stats"] = stats_map.get((like["depart"], like["arrivee"], month))
            except Exception:
                like["stats"] = None

        return {"likes": likes}
    except Exception as e:
        print("Erreur likes :", e)
        raise HTTPException(
            status_code=500, detail="Impossible de récupérer les favoris"
        )
    finally:
        cursor.close()
        release_db_connection(conn)


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
        release_db_connection(conn)


@router.get("/admin/logs")
def get_logs(request: Request):
    if get_current_user_role(request) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    if not LOG_FILE_PATH.exists():
        return []
    try:
        with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
            return [json.loads(line) for line in f.readlines() if line.strip()][::-1][
                :50
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lecture logs: {str(e)}")


@router.post("/search-destination")
@limiter.limit("20 per minute")
def search_destination(request: SearchRequest, request_obj: Request):
    return {"cleaned_query": sanitize_input(request.query)}


@router.get("/admin/stats")
def get_dashboard_stats():
    total_users = get_total_users()

    return {"kpis": {"total_utilisateurs": total_users}}


@router.post("/refresh-likes/{user_id}")
async def refresh_user_likes(user_id: int, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            """
            SELECT u.email as user_email, tf.id as tracked_flight_id, tf."from" as depart, 
                   tf.dest as arrivee, tf.day as jour, tf.passengers_nbr as passagers,
                   (SELECT price FROM "Price_History" ph WHERE ph.tracked_flight_id = tf.id ORDER BY id DESC LIMIT 1) as old_price
            FROM "Likes" l JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id JOIN "Users" u ON l.user_id = u.id
            WHERE l.user_id = %s
            """,
            (user_id,),
        )
        liked_flights = cursor.fetchall()
    finally:
        cursor.close()
        release_db_connection(conn)

    if not liked_flights:
        return {"message": "Aucun vol à rafraîchir."}

    sem = asyncio.Semaphore(MAX_CONCURRENT_API_CALLS)

    async def fetch_flight_price(client, flight):
        async with sem:
            await asyncio.sleep(0.5)
            try:
                raw_date = flight["jour"].split("|")[0].split(" ")[0]
                parts = raw_date.split("-")
                api_date = (
                    f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    if len(parts) == 3 and len(parts[0]) == 4
                    else (
                        f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                        if len(parts) == 3
                        else raw_date
                    )
                )
            except Exception:
                api_date = flight["jour"]

            url = "https://google-flights2.p.rapidapi.com/api/v1/searchFlights"
            querystring = {
                "departure_id": flight["depart"],
                "arrival_id": flight["arrivee"],
                "outbound_date": api_date,
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
                    flights_list = response.json().get("data", {}).get(
                        "itineraries", {}
                    ).get("topFlights", []) + response.json().get("data", {}).get(
                        "itineraries", {}
                    ).get("otherFlights", [])
                    if flights_list:
                        min_price = min(
                            opt.get("price", {}).get("raw", 9999)
                            if isinstance(opt.get("price"), dict)
                            else opt.get("price", 9999)
                            for opt in flights_list
                        )
                        return {"flight": flight, "new_price": min_price}
            except Exception as e:
                print(f"Erreur API pour {flight['arrivee']}: {e}")
            return None

    async with httpx.AsyncClient() as client:
        tasks = [fetch_flight_price(client, flight) for flight in liked_flights]
        results = await asyncio.gather(*tasks)

    updates = 0
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        for res in results:
            if res:
                flight = res["flight"]
                new_price = float(res["new_price"])
                old_price_raw = flight["old_price"]
                old_price = float(old_price_raw) if old_price_raw is not None else None

                if old_price is None or new_price != old_price:
                    cursor.execute(
                        'INSERT INTO "Price_History" (tracked_flight_id, price) VALUES (%s, %s);',
                        (flight["tracked_flight_id"], new_price),
                    )
                    updates += 1

                    if old_price is not None:
                        action = "Baisse" if new_price < old_price else "Hausse"
                        print(
                            f"[{action}] détectée pour {flight['arrivee']} : {old_price}€ ➔ {new_price}€"
                        )
                        background_tasks.add_task(
                            send_price_drop_email,
                            user_email=flight["user_email"],
                            depart=flight["depart"],
                            arrivee=flight["arrivee"],
                            old_price=old_price,
                            new_price=new_price,
                        )
        conn.commit()
    finally:
        cursor.close()
        release_db_connection(conn)

    if updates == 0:
        return {"message": "Vérification terminée. Aucun prix n'a changé !"}
    return {
        "message": f"Mise à jour terminée ! {updates} prix modifiés. Les alertes ont été envoyées."
    }


@router.get("/cron/refresh-prices")
async def auto_refresh_flight_prices(
    background_tasks: BackgroundTasks, authorization: str = Header(None)
):
    if authorization != f"Bearer {CRON_SECRET}":
        raise HTTPException(status_code=401, detail="Accès refusé. Mauvais token.")

    print("[VERCEL CRON] Démarrage de l'actualisation automatique...")
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(
            'SELECT id, "from" as depart, dest as arrivee, day as jour, passengers_nbr as passagers, (SELECT price FROM "Price_History" ph WHERE ph.tracked_flight_id = "Tracked_Flights".id ORDER BY id DESC LIMIT 1) as old_price FROM "Tracked_Flights"'
        )
        tracked_flights = cursor.fetchall()
    finally:
        cursor.close()
        release_db_connection(conn)

    if not tracked_flights:
        return {"status": "ok", "message": "Aucun vol à actualiser."}

    sem = asyncio.Semaphore(MAX_CONCURRENT_API_CALLS)

    async def fetch_cron_price(client, flight):
        async with sem:
            await asyncio.sleep(0.5)
            try:
                raw_date = flight["jour"].split("|")[0].split(" ")[0]
                parts = raw_date.split("-")
                api_date = (
                    f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    if len(parts) == 3 and len(parts[0]) == 4
                    else (
                        f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                        if len(parts) == 3
                        else raw_date
                    )
                )
            except Exception:
                api_date = flight["jour"]

            url = "https://google-flights2.p.rapidapi.com/api/v1/searchFlights"
            querystring = {
                "departure_id": flight["depart"],
                "arrival_id": flight["arrivee"],
                "outbound_date": api_date,
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
                    flights_list = response.json().get("data", {}).get(
                        "itineraries", {}
                    ).get("topFlights", []) + response.json().get("data", {}).get(
                        "itineraries", {}
                    ).get("otherFlights", [])
                    if flights_list:
                        min_price = min(
                            opt.get("price", {}).get("raw", 9999)
                            if isinstance(opt.get("price"), dict)
                            else opt.get("price", 9999)
                            for opt in flights_list
                        )
                        return {"flight": flight, "new_price": min_price}
            except Exception:
                pass
            return None

    async with httpx.AsyncClient() as client:
        tasks = [fetch_cron_price(client, flight) for flight in tracked_flights]
        results = await asyncio.gather(*tasks)

    updates, mails_sent = 0, 0
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        for res in results:
            if res:
                flight = res["flight"]
                new_price = float(res["new_price"])
                old_price_raw = flight["old_price"]
                old_price = float(old_price_raw) if old_price_raw is not None else None

                if old_price is None or new_price != old_price:
                    cursor.execute(
                        'INSERT INTO "Price_History" (tracked_flight_id, price) VALUES (%s, %s);',
                        (flight["id"], new_price),
                    )
                    updates += 1

                    if old_price is not None:
                        action = "Baisse" if new_price < old_price else "Hausse"
                        print(
                            f"[CRON] {action} pour {flight['arrivee']} : {old_price}€ ➔ {new_price}€"
                        )
                        cursor.execute(
                            'SELECT u.email FROM "Likes" l JOIN "Users" u ON l.user_id = u.id WHERE l.tracked_flight_id = %s',
                            (flight["id"],),
                        )
                        users_to_notify = cursor.fetchall()

                        for user in users_to_notify:
                            background_tasks.add_task(
                                send_price_drop_email,
                                user_email=user["email"],
                                depart=flight["depart"],
                                arrivee=flight["arrivee"],
                                old_price=old_price,
                                new_price=new_price,
                            )
                            mails_sent += 1
        conn.commit()
    finally:
        cursor.close()
        release_db_connection(conn)

    return {"status": "success", "updates": updates, "mails_queued": mails_sent}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest):
    if not is_password_strong(req.new_password):
        raise HTTPException(
            status_code=400,
            detail="Le nouveau mot de passe est trop faible (maj, min, chiffre, car. spécial requis).",
        )

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute('SELECT password FROM "Users" WHERE id = %s', (req.user_id,))
        user = cursor.fetchone()

        if not user or not verify_password(req.old_password, user["password"]):
            raise HTTPException(
                status_code=400, detail="Ancien mot de passe incorrect."
            )

        hashed_new = hash_password(req.new_password)
        cursor.execute(
            'UPDATE "Users" SET password = %s WHERE id = %s', (hashed_new, req.user_id)
        )
        conn.commit()

        return {"message": "Mot de passe modifié avec succès !"}
    except HTTPException:
        raise
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour.")
    finally:
        cursor.close()
        release_db_connection(conn)
