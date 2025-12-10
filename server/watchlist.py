# server/watchlist.py
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Optional
from server.database import get_db_connection
from server.api_data_fetch import get_prices

router = APIRouter()


class WatchlistItem(BaseModel):
    ticker: str


def _get_session_user(request: Request):
    username = request.cookies.get("session_user")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username


def _safe_iso(dt) -> Optional[str]:
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt) if dt is not None else None


def _daily_change(ticker: str) -> Optional[dict]:
    """
    Compute the latest daily % change for a ticker using cached price data.
    Returns None if data is missing or an error occurs.
    """
    try:
        data = get_prices("TIME_SERIES_DAILY", ticker)
    except Exception as exc:
        # Avoid failing the whole request if one symbol errors
        print(f"[watchlist] skipping {ticker}: {exc}")
        return None

    rows = data.get("rows") or []
    if len(rows) < 2:
        return None

    latest, prev = rows[-1], rows[-2]
    latest_close = latest.get("close")
    prev_close = prev.get("close")
    if latest_close is None or prev_close in (None, 0):
        return None

    raw_pct = ((latest_close - prev_close) / prev_close) * 100
    return {
        "ticker": ticker,
        "changePercent": round(raw_pct, 2),
        "latestClose": latest_close,
        "previousClose": prev_close,
        "asOf": _safe_iso(latest.get("timestamp")),
    }


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
async def get_watchlist(
    request: Request,
    include_changes: bool = Query(False, description="Include top movers for this watchlist"),
    mover_limit: int = Query(3, ge=1, le=10, description="Number of movers to return"),
):
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

    watchlist: List[str] = [r["ticker"] for r in rows]
    response = {"username": username, "watchlist": watchlist}

    if include_changes and watchlist:
        movers = []
        for ticker in watchlist:
            change = _daily_change(ticker)
            if change:
                movers.append(change)

        movers.sort(key=lambda item: abs(item["changePercent"]), reverse=True)
        response["movers"] = movers[:mover_limit]

    return response


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
