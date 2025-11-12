# server/watchlist.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from server.database import get_db_connection

router = APIRouter()


class WatchlistItem(BaseModel):
    ticker: str


def _get_session_user(request: Request):
    username = request.cookies.get("session_user")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username


@router.post("/watchlist")
async def add_to_watchlist(request: Request, item: WatchlistItem):
    username = _get_session_user(request).strip()
    ticker = item.ticker.strip().upper()

    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker required")

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                # Verify user exists
                cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="User not found")

                # Add ticker
                cur.execute(
                    """
                    INSERT INTO watchlist (username, ticker)
                    VALUES (%s, %s)
                    ON CONFLICT (username, ticker) DO NOTHING
                    """,
                    (username, ticker),
                )
    finally:
        conn.close()

    return {"message": f"{ticker} added to {username}'s watchlist"}


@router.get("/watchlist")
async def get_watchlist(request: Request):
    username = _get_session_user(request)

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT ticker FROM watchlist WHERE username = %s ORDER BY ticker ASC",
                (username,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return {"username": username, "watchlist": [r["ticker"] for r in rows]}


@router.delete("/watchlist/{ticker}")
async def remove_from_watchlist(request: Request, ticker: str):
    username = _get_session_user(request)
    ticker = ticker.upper()

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM watchlist WHERE username = %s AND ticker = %s",
                    (username, ticker),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Ticker not found in watchlist")
    finally:
        conn.close()

    return {"message": f"{ticker} removed from {username}'s watchlist"}
