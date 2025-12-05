# api_news_fetch.py

import requests
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import deque

API_KEYS = [
    "7Vr6YpbkXV6pbQ9cUKjBqTiBORwGDr4aW1oVsDmx",
    "nJNinuZMREy645FkqEdRSMxcI61Xs9YeFecW0oSe",
    "SxWaBXa5Wcew1p2slLGUGKLkjVLWJvp89XM5pEGk",
]

BASE_URL = "https://api.marketaux.com/v1/news/all"

CACHE_TTL_SEC = 1800
_cache: Dict[str, tuple[datetime, List[Dict[str, Any]]]] = {}

MAX_CALLS_PER_MIN = 4
_RATE_WINDOW: Dict[str, deque] = {k: deque() for k in API_KEYS}


def _rate_gate_allow(key: str):
    q = _RATE_WINDOW[key]
    now = time.time()

    while q and now - q[0] >= 60:
        q.popleft()

    if len(q) >= MAX_CALLS_PER_MIN:
        wait = 60 - (now - q[0]) + 0.01
        time.sleep(wait)

    q.append(time.time())


def _score_to_label(score: Optional[float]) -> Optional[str]:
    if score is None:
        return None
    try:
        s = float(score)
    except:
        return None

    if s > 0.15:
        return "Bullish"
    if s < -0.15:
        return "Bearish"
    return "Neutral"



def _normalize_article(item: Dict[str, Any], ticker: Optional[str]):
    entities = item.get("entities") or []
    sentiment_score = None

    if ticker:
        t = ticker.upper()
        for e in entities:
            sym = (e.get("symbol") or "").upper()
            if sym.split(".")[0] == t:
                sentiment_score = e.get("sentiment_score")
                break

    if sentiment_score is None and entities:
        sentiment_score = entities[0].get("sentiment_score")

    return {
        "title": item.get("title"),
        "summary": item.get("snippet") or item.get("description"),
        "url": item.get("url"),
        "source": item.get("source"),
        "time_published": item.get("published_at"),
        "sentiment": _score_to_label(sentiment_score),
    }



def _single_call(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    for key in API_KEYS:
        _rate_gate_allow(key)

        safe_params = {
            "api_token": key,
            "language": "en",
            "limit": 3,
            "entities": "true",       # ensure sentiment returned
            "countries": "US",        # ensure entities are populated
        }

        if "symbols" in params:
            safe_params["symbols"] = params["symbols"]

        try:
            r = requests.get(BASE_URL, params=safe_params, timeout=10)
            r.raise_for_status()
            data = r.json()
            return data.get("data", [])
        except:
            continue

    return []



def _fetch_general_news(limit: int) -> List[Dict[str, Any]]:
    call1 = _single_call({})              
    call2 = _single_call({"countries": "US"})

    combined = call1 + call2

    combined = combined[::-1]

    seen = set()
    final = []

    for item in combined:
        norm = _normalize_article(item, None)
        key = norm["title"] or norm["url"]

        if key not in seen:
            seen.add(key)
            final.append(norm)

        if len(final) >= limit:
            break

    return final


def _fetch_ticker_news(ticker: str) -> List[Dict[str, Any]]:
    raw = _single_call({"symbols": ticker.upper()})
    return [_normalize_article(a, ticker) for a in raw]


def get_news(ticker: Optional[str], limit: int):
    cache_key = f"{ticker or 'general'}_{limit}"

    hit = _cache.get(cache_key)
    if hit:
        ts, payload = hit
        if datetime.utcnow() - ts < timedelta(seconds=CACHE_TTL_SEC):
            return payload

    if ticker:
        result = _fetch_ticker_news(ticker)
    else:
        result = _fetch_general_news(limit)

    _cache[cache_key] = (datetime.utcnow(), result)
    return result
