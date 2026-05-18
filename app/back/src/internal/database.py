import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
from src.internal.config import DATABASE_URL


def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base de données : {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur (Base de données)")


def get_total_users():
    query = 'SELECT COUNT(*) AS total_users FROM "Users";'

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query)
            result = cursor.fetchone()
            return result["total_users"] if result else 0
    finally:
        conn.close()
