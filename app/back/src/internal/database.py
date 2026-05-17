from psycopg2 import pool
from src.internal.config import DATABASE_URL

try:
    db_pool = pool.SimpleConnectionPool(1, 20, DATABASE_URL)
    if db_pool:
        print(" Pool de connexion PostgreSQL créé avec succès")
except Exception as e:
    print(f" Erreur de création du pool BDD: {e}")


def get_db_connection():
    return db_pool.getconn()


def release_db_connection(conn):
    if conn:
        db_pool.putconn(conn)
