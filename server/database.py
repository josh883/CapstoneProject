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
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_settings (
                        username TEXT PRIMARY KEY
                            REFERENCES users(username)
                            ON DELETE CASCADE,

                        -- Algorithm toggles
                        enable_ai_prediction   BOOLEAN NOT NULL DEFAULT TRUE,
                        enable_trend_sentiment BOOLEAN NOT NULL DEFAULT TRUE,
                        enable_golden_cross    BOOLEAN NOT NULL DEFAULT TRUE,
                        enable_volatility      BOOLEAN NOT NULL DEFAULT TRUE,
                        enable_beta            BOOLEAN NOT NULL DEFAULT TRUE,
                        enable_signal_gauge    BOOLEAN NOT NULL DEFAULT TRUE,

                        -- Sliders / numeric tuning
                        risk_sensitivity   INTEGER NOT NULL DEFAULT 50,
                        prediction_weight  INTEGER NOT NULL DEFAULT 50,
                        smoothing_factor   INTEGER NOT NULL DEFAULT 30,
                        chart_history_days INTEGER NOT NULL DEFAULT 30,

                        -- Display toggles (only 2 like you asked)
                        show_chart_fill        BOOLEAN NOT NULL DEFAULT TRUE,
                        show_prediction_marker BOOLEAN NOT NULL DEFAULT TRUE
                    );
                    """
                )

    finally:
        conn.close()
