# server/recommendations.py
from fastapi import APIRouter, HTTPException
import httpx
import time

router = APIRouter()

ALPHA_BASE = "https://www.alphavantage.co/query"

API_KEYS = [
    "MMK62Q0AQU1ENXDT",
    "AUSEOLC1G85GIX8O",
    "MF3H2GPW27Q25Y6D",
    "DM5I4B27MZVQFFV2",
    "C5R9TNCMFVS2BSWY"
]

CACHE_TTL = 1800  # 30 minutes
_cached_data = None
_cached_at = 0


async def _fetch_from_alpha():
    last_error = None

    for key in API_KEYS:
        url = f"{ALPHA_BASE}?function=TOP_GAINERS_LOSERS&apikey={key}"

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=10)
                data = resp.json()

            if "top_gainers" in data:
                gainers = [item["ticker"] for item in data.get("top_gainers", [])]
                actives = [item["ticker"] for item in data.get("most_actively_traded", [])]

                return {
                    "gainers": gainers[:10],
                    "actives": actives[:10]
                }

            last_error = data
        except Exception as e:
            last_error = str(e)
            continue

    raise HTTPException(status_code=500, detail=f"All API keys failed: {last_error}")


@router.get("/recommendations")
async def get_recommendations():
    global _cached_data, _cached_at

    now = time.time()
    if _cached_data and now - _cached_at < CACHE_TTL:
        return _cached_data

    result = await _fetch_from_alpha()
    _cached_data = result
    _cached_at = now
    return result
