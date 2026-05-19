import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from src.internal.config import DATABASE_URL

db_pool = None


def init_pool():
    global db_pool
    try:
        db_pool = pool.ThreadedConnectionPool(1, 20, DATABASE_URL)
        if db_pool:
            print("Pool de connexion PostgreSQL créé avec succès")
    except Exception as e:
        print(f" Erreur de création du pool BDD: {e}")


init_pool()


def get_db_connection():
    global db_pool
    if not db_pool:
        init_pool()
        if not db_pool:
            raise HTTPException(status_code=500, detail="Base de données inaccessible")

    for _ in range(5):
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
            conn.commit()
            return conn
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            if conn:
                db_pool.putconn(conn, close=True)

    print(" Toutes les connexions du pool sont mortes.")
    raise HTTPException(status_code=500, detail="Erreur serveur (Base de données)")


def release_db_connection(conn):
    if conn and db_pool:
        try:
            conn.rollback()
        except Exception:
            pass
        db_pool.putconn(conn)


# 1. Nombre d'utilisateurs
def get_total_users():
    query = 'SELECT COUNT(*) AS total_users FROM "Users";'
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            result = cursor.fetchone()
            return result["total_users"] if result else 0
    finally:
        release_db_connection(conn)


# 2. Volume Moyen
def get_mean_passengers_per_flight():
    query = 'SELECT ROUND(AVG(passengers_nbr), 1) AS mean_passengers FROM "Tracked_Flights";'
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            result = cursor.fetchone()
            # On vérifie si result n'est pas None et on retourne la clé exacte
            return (
                float(result["mean_passengers"])
                if result and result["mean_passengers"]
                else 0
            )
    finally:
        release_db_connection(conn)


# 3. Top 5 Aéroports de Départ
def get_top_departure_airports():
    query = """
        SELECT "from" AS airport, COUNT(*) AS count 
        FROM "Tracked_Flights" 
        GROUP BY "from" 
        ORDER BY count DESC LIMIT 5;
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)


# 4. Top 5 Aéroports d'Arrivée
def get_top_arrival_airports():
    query = """
        SELECT dest AS airport, COUNT(*) AS count 
        FROM "Tracked_Flights" 
        GROUP BY dest 
        ORDER BY count DESC LIMIT 5;
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)


# 5. Jours les plus likés
def get_popular_departure_days():
    query = """
        WITH FormattedDates AS (
            SELECT 
                l.id AS like_id,
                -- On vérifie où se trouve le tiret pour deviner le format
                CASE 
                    WHEN SUBSTRING(tf.day, 5, 1) = '-' THEN TO_DATE(SUBSTRING(tf.day, 1, 10), 'YYYY-MM-DD')
                    WHEN SUBSTRING(tf.day, 3, 1) = '-' THEN TO_DATE(SUBSTRING(tf.day, 1, 10), 'DD-MM-YYYY')
                    ELSE NULL 
                END AS real_date
            FROM "Likes" l
            JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id
        )
        SELECT 
            TRIM(TO_CHAR(real_date, 'Day')) AS date,
            COUNT(like_id) AS count
        FROM FormattedDates
        WHERE real_date IS NOT NULL
        GROUP BY 
            TRIM(TO_CHAR(real_date, 'Day')), 
            EXTRACT(ISODOW FROM real_date)
        ORDER BY EXTRACT(ISODOW FROM real_date);
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
            # Renverra par ex: [{"departure_day": "Friday", "likes_count": 45}, ...]
    finally:
        release_db_connection(conn)


# 6. Indice Éco-responsable
def get_eco_index_distribution():
    query = """
        SELECT 
            CASE 
                WHEN eco_percent > 75 THEN 'Rouge'
                WHEN eco_percent > 10 THEN 'Orange'
                ELSE 'Vert'
            END AS category,
            COUNT(*) AS count
        FROM "Tracked_Flights"
        GROUP BY category;
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)


# 7. Corrélation Likes vs Indicateur de Prix
def get_likes_price_correlation():
    query = """
        WITH Cleaned_Tracked_Flights AS (
            -- 1. Uniformisation des dates hétérogènes
            SELECT 
                id,
                flight_id,
                CASE 
                    WHEN SUBSTRING(day, 5, 1) = '-' THEN TO_DATE(SUBSTRING(day, 1, 10), 'YYYY-MM-DD')
                    WHEN SUBSTRING(day, 3, 1) = '-' THEN TO_DATE(SUBSTRING(day, 1, 10), 'DD-MM-YYYY')
                    ELSE NULL 
                END AS real_date
            FROM "Tracked_Flights"
        ),
        Latest_Prices AS (
            -- 2. Récupération du dernier prix enregistré
            SELECT DISTINCT ON (tracked_flight_id)
                tracked_flight_id,
                price AS dernier_prix
            FROM "Price_History"
            ORDER BY tracked_flight_id, date DESC
        ),
        Statut_Prix_Vol AS (
            -- 3. Association avec les seuils mensuels
            SELECT 
                ctf.id AS flight_id,
                CASE
                    WHEN lp.dernier_prix <= v.seuil_bon_plan_q1_mensuel THEN 'Vert (Bon plan)'
                    WHEN lp.dernier_prix >= v.seuil_alerte_q3_mensuel THEN 'Rouge (Trop cher)'
                    ELSE 'Orange (Normal)'
                END AS price_status
            FROM Cleaned_Tracked_Flights ctf
            JOIN vue_indicateurs_prix_saisonniers v 
                ON ctf.flight_id = v.flight_id 
                -- Extraction du mois depuis la date nettoyée
                AND EXTRACT(MONTH FROM ctf.real_date)::integer = v.mois_recherche
            LEFT JOIN Latest_Prices lp ON ctf.id = lp.tracked_flight_id
            WHERE ctf.real_date IS NOT NULL
        )
        -- 4. Décompte final avec les Likes
        SELECT sp.price_status AS status, COUNT(l.id) AS count
        FROM "Likes" l
        JOIN Statut_Prix_Vol sp ON l.tracked_flight_id = sp.flight_id
        GROUP BY sp.price_status;
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)
