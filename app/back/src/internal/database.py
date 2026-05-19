from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from src.internal.config import DATABASE_URL

try:
    db_pool = pool.SimpleConnectionPool(1, 20, DATABASE_URL)
    if db_pool:
        print(" Pool de connexion PostgreSQL créé avec succès")
except Exception as e:
    print(f" Erreur de création du pool BDD: {e}")


def get_db_connection():
    try:
        return db_pool.getconn()
    except Exception as e:
        print(f"Erreur de connexion à la base de données : {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur (Base de données)")


def release_db_connection(conn):
    if conn:
        db_pool.putconn(conn)

#1. Nombre d'utilisateurs
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
            return float(result["mean_passengers"]) if result and result["mean_passengers"] else 0
    finally:
        release_db_connection(conn)

# 3. Top 5 Aéroports de Départ
def get_top_departure_airports():
    query = '''
        SELECT "from" AS airport, COUNT(*) AS count 
        FROM "Tracked_Flights" 
        GROUP BY "from" 
        ORDER BY count DESC LIMIT 5;
    '''
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)

# 4. Top 5 Aéroports d'Arrivée
def get_top_arrival_airports():
    query = '''
        SELECT dest AS airport, COUNT(*) AS count 
        FROM "Tracked_Flights" 
        GROUP BY dest 
        ORDER BY count DESC LIMIT 5;
    '''
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)

# 5. Jours les plus likés
def get_popular_departure_days():
    query = '''
        SELECT 
            TRIM(TO_CHAR(CAST(tf.day AS DATE), 'Day')) AS departure_day,
            COUNT(l.id) AS likes_count
        FROM "Likes" l
        JOIN "Tracked_Flights" tf ON l.tracked_flight_id = tf.id
        GROUP BY 
            TRIM(TO_CHAR(CAST(tf.day AS DATE), 'Day')), 
            EXTRACT(ISODOW FROM CAST(tf.day AS DATE))
        ORDER BY EXTRACT(ISODOW FROM CAST(tf.day AS DATE));
    '''
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
    query = '''
        SELECT 
            CASE 
                WHEN eco_percent >= 80 THEN 'Vert'
                WHEN eco_percent >= 50 THEN 'Orange'
                ELSE 'Rouge'
            END AS category,
            COUNT(*) AS count
        FROM "Tracked_Flights"
        GROUP BY category;
    '''
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)

# 7. Corrélation Likes vs Indicateur de Prix
def get_likes_price_correlation():
    query = '''
        WITH Statut_Prix_Vol AS (
            SELECT 
                tf.id AS flight_id,
                CASE
                    WHEN v.prix_moyen_mensuel <= v.seuil_bon_plan_q1_mensuel THEN 'Vert (Bon plan)'
                    WHEN v.prix_moyen_mensuel >= v.seuil_alerte_q3_mensuel THEN 'Rouge (Trop cher)'
                    ELSE 'Orange (Normal)'
                END AS price_status
            FROM "Tracked_Flights" tf
            JOIN vue_indicateurs_prix_saisonniers v ON tf.flight_id = v.flight_id
        )
        SELECT sp.price_status AS status, COUNT(l.id) AS count
        FROM "Likes" l
        JOIN Statut_Prix_Vol sp ON l.tracked_flight_id = sp.flight_id
        GROUP BY sp.price_status;
    '''
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            return cursor.fetchall()
    finally:
        release_db_connection(conn)

