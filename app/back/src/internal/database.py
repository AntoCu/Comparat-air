import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from src.internal.config import DATABASE_URL

try:
    db_pool = pool.SimpleConnectionPool(1, 20, DATABASE_URL)
    if db_pool:
        print("✅ Pool de connexion PostgreSQL créé avec succès")
except Exception as e:
    print(f"❌ Erreur de création du pool BDD: {e}")


def get_db_connection():
    try:
        return db_pool.getconn()
    except Exception as e:
        print(f"Erreur de connexion à la base de données : {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur (Base de données)")


def release_db_connection(conn):
    if conn:
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
