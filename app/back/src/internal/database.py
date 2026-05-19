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
