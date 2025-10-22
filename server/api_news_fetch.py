# api_news_fetch.py

import requests
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import deque

API_KEYS = [
    "MMK62Q0AQU1ENXDT",
    "AUSEOLC1G85GIX8O",
    "MF3H2GPW27Q25Y6D",
    "DM5I4B27MZVQFFV2",
    "C5R9TNCMFVS2BSWY"
]

#caches setup to avoid hitting limits
CACHE_TTL_SEC = 1800  # 30 mins
_cache: Dict[str, tuple[datetime, List[Dict[str, Any]]]] = {}

# per-key rate limiter
MAX_CALLS_PER_MIN = 4
_RATE_WINDOW: Dict[str, deque] = {k: deque() for k in API_KEYS}
_MINUTE_WINDOW_SEC = 60

def _rate_gate_allow(key: str):
    q = _RATE_WINDOW.setdefault(key, deque())
    now = time.time()
    while q and now - q[0] >= _MINUTE_WINDOW_SEC:
        q.popleft()
    if len(q) >= MAX_CALLS_PER_MIN:
        wait = _MINUTE_WINDOW_SEC - (now - q[0]) + 0.01
        print(f"[RATE] Key ...{key[-4:]} sleeping {wait:.1f}s")
        time.sleep(wait)
    q.append(time.time())

def _fetch_from_api(ticker: Optional[str] = None) -> List[Dict[str, Any]]:
    base = "https://www.alphavantage.co/query"
    key_iter = API_KEYS
    last_err = None

    for key in key_iter:
        _rate_gate_allow(key)
        params = {
            "function": "NEWS_SENTIMENT",
            "apikey": key,
        }
        if ticker:
            params["tickers"] = ticker
        else:
            params["topics"] = "financial_markets"

        try:
            r = requests.get(base, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()

            if "feed" not in data:
                msg = data.get("Note") or data.get("Information")
                if msg:
                    print(f"[WARN] Throttled or limited: {msg}")
                    continue
                raise RuntimeError(f"Unexpected payload: {data}")

            feed = data["feed"]
            articles = []
            for item in feed[:10]:  # limit to 10 articles
                articles.append({
                    "title": item.get("title"),
                    "summary": item.get("summary"),
                    "url": item.get("url"),
                    "source": item.get("source"),
                    "time_published": item.get("time_published"),
                    "sentiment": item.get("overall_sentiment_label")
                })
            print(f"[INFO] Success with key ending ...{key[-4:]}")
            return articles

        except Exception as e:
            last_err = e
            print(f"[WARN] Key {key[-4:]} failed: {e}")
            continue

    raise RuntimeError(f"All API keys failed: {last_err}")

def get_news(ticker: Optional[str] = None) -> List[Dict[str, Any]]:
    cache_key = ticker or "general"
    hit = _cache.get(cache_key)
    if hit:
        ts, payload = hit
        if datetime.utcnow() - ts < timedelta(seconds=CACHE_TTL_SEC):
            print("[CACHE] Returning cached news")
            return payload

    payload = _fetch_from_api(ticker)
    _cache[cache_key] = (datetime.utcnow(), payload)
    return payload
