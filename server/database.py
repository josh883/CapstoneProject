import os
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def _database_url() -> str:
    url: Optional[str] = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Example: postgresql://user:password@localhost:5432/capstone"
        )
    return url

def get_db_connection():
    conn = psycopg2.connect(_database_url(), cursor_factory=RealDictCursor)
    return conn

def init_db():
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL
                    )
                    """
                )

                #new watchlist table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS watchlist (
                        id SERIAL PRIMARY KEY,
                        username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
                        ticker TEXT NOT NULL,
                        UNIQUE (username, ticker)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS portfolio_holdings (
                        id SERIAL PRIMARY KEY,
                        username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
                        asset TEXT NOT NULL,
                        shares NUMERIC NOT NULL,
                        total_cost NUMERIC NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE (username, asset)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS portfolio_trades (
                        id SERIAL PRIMARY KEY,
                        username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
                        asset TEXT NOT NULL,
                        trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
                        price NUMERIC NOT NULL,
                        shares NUMERIC,
                        executed_at TIMESTAMPTZ NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_portfolio_trades_user_time
                    ON portfolio_trades (username, executed_at DESC)
                    """
                )
    finally:
        conn.close()
