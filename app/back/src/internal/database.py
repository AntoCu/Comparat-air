import psycopg2
from fastapi import HTTPException
from src.internal.config import DATABASE_URL

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base de données : {e}")
        raise HTTPException(status_code=500, detail="Erreur serveur (Base de données)")