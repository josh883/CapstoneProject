# IF YOU ARE FRONTEND:
# Scroll to the bottom to see the one function you'll ever have to call

import os
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional
import time
from collections import deque

API_KEYS = [
    "MMK62Q0AQU1ENXDT",
    "AUSEOLC1G85GIX8O",
    "MF3H2GPW27Q25Y6D",
    "DM5I4B27MZVQFFV2",
    "C5R9TNCMFVS2BSWY"    # hardcoded to cycle thru api keys now, can fix later
]

# --- Dev helpers ---
DEMO_MODE = False  # set True to use AV 'demo' key (IBM/MSFT only)
ROTATE_ON_DAILY = False  # set True to try the next key even after a daily cap message
CACHE_TTL_SEC = 120  # in memory cache TTL; set 0 to disable
_cache: Dict[Tuple[str, str, Optional[str]], Tuple[datetime, Dict[str, Any]]] = {}

# per key rate gate to not trip per/minute throttles
# AV free tier is about 5/min; we cap at 4/min per key
MAX_CALLS_PER_MIN = 4
_MINUTE_WINDOW_SEC = 60
_RATE_WINDOW: Dict[str, deque] = {k: deque() for k in API_KEYS}

# when AV replies with a minute throttle, wait and retry same key
RETRIES_ON_MINUTE = 2
MINUTE_BACKOFF_SEC = 15
# ---------------------------

# dict of valid fns we can call from api
VALID_FUNCS = {
    "TIME_SERIES_INTRADAY",
    "TIME_SERIES_DAILY",
    "TIME_SERIES_WEEKLY",
    "TIME_SERIES_MONTHLY",
}

class InvalidAPIParameters(Exception):
    pass

# function that builds our api call
def build_url(function: str, symbol: str, interval: Optional[str] = None, api_key: Optional[str] = None) -> str:
    if function not in VALID_FUNCS:
        raise ValueError(f"unsupported function: {function}")

    # use the passed key, otherwise fall back to the first in API_KEYS
    # respect DEMO_MODE
    if DEMO_MODE:
        api_key = "demo"
        # demo key only supports a few symbols - keep UX predictable
        if symbol not in {"IBM", "MSFT"}:
            symbol = "IBM"
    else:
        api_key = api_key or API_KEYS[0]

    base = "https://www.alphavantage.co/query"
    params = {
        "function": function,
        "symbol": symbol,
        "apikey": api_key,
    }
    if function == "TIME_SERIES_INTRADAY":
        if not interval:
            raise ValueError("`interval` is reqd. for TIME_SERIES_INTRADAY (e.g., '1min','5min','15min','30min','60min')")
        params["interval"] = interval

    return base + "?" + "&".join(f"{k}={v}" for k, v in params.items())

def _is_throttle_or_info(d: dict) -> tuple[bool, str, str]:
    # AV returns informational/throttle messages under "Note" or "Information"
    if not isinstance(d, dict):
        return (False, "", "")
    msg = d.get("Note") or d.get("Information") or ""
    if isinstance(msg, str) and msg.strip():
        m = msg.lower()
        if "per minute" in m or "calls per minute" in m or "throttle" in m:
            return (True, msg, "minute")
        if "per day" in m or "daily" in m or "24 hour" in m or "24-hour" in m:
            return (True, msg, "day")
        return (True, msg, "minute")
    return (False, "", "")

def _rate_gate_allow(key: str):
    
    # per key rate gate: allow <= MAX_CALLS_PER_MIN over rolling 60s
    # if over, sleep until next slot opens.

    q = _RATE_WINDOW.setdefault(key, deque())
    now = time.time()
    # drop timestamps older than window
    while q and now - q[0] >= _MINUTE_WINDOW_SEC:
        q.popleft()
    if len(q) >= MAX_CALLS_PER_MIN:
        # sleep until earliest call falls out of the window
        wait = _MINUTE_WINDOW_SEC - (now - q[0]) + 0.01
        if wait > 0:
            print(f"[RATE] key ...{key[-4:]} sleeping {wait:.1f}s to honor {MAX_CALLS_PER_MIN}/min")
            time.sleep(wait)
        # after sleep, queue will be trimmed on next call
    # record this call
    q.append(time.time())

def fetch_series(function: str, symbol: str, interval: Optional[str] = None, timeout: float = 10.0) -> Dict[str, Any]:
    # try each api key until success (need to handle this much better for prod)
    if DEMO_MODE:
        # in demo mode, we don't rotate keys
        key_iter = [API_KEYS[0]]
    else:
        key_iter = API_KEYS

    last_err = None
    day_limit_message = None

    for key in key_iter:
        # per/key pacing
        _rate_gate_allow(key)

        url = build_url(function, symbol, interval, api_key=key)
        try:
            # try request, with limited retries on minute throttle
            attempt = 0
            while True:
                r = requests.get(url, timeout=timeout)
                r.raise_for_status()
                data = r.json()

                # if the request itself is invalid (e.g., bad symbol), don't burn other keys
                if isinstance(data, dict) and "Error Message" in data:
                    raise InvalidAPIParameters(data["Error Message"])

                # AV returns a 'note' or 'information' for calls over the limit
                throttled, msg, klass = _is_throttle_or_info(data)
                if throttled:
                    if klass == "day":
                        print(f"[WARN] Daily limit detected on key {key[-4:]}: {msg[:120]}...")
                        day_limit_message = msg
                        if ROTATE_ON_DAILY and not DEMO_MODE:
                            # try the next key (may fail if IP guarded)
                            break  # exit retry loop; continue outer for loop to next key
                        # otherwise stop here to avoid pointless rotation
                        raise RuntimeError("Daily limit")
                    else:
                        # minute throttle -> short sleep + retry same key a few times
                        attempt += 1
                        if attempt <= RETRIES_ON_MINUTE:
                            print(f"[WARN] Minute throttle on key {key[-4:]}: backing off {MINUTE_BACKOFF_SEC}s (attempt {attempt}/{RETRIES_ON_MINUTE})")
                            time.sleep(MINUTE_BACKOFF_SEC)
                            # before retrying, honor rate gate again
                            _rate_gate_allow(key)
                            continue
                        print(f"[WARN] Minute throttle persisted on key {key[-4:]} after retries; trying next key")
                        break  # try next key

                # success (and also check it's a time series payload)
                if not (isinstance(data, dict) and "Meta Data" in data):
                    raise RuntimeError(f"Alpha Vantage returned an unexpected payload without 'Meta Data' (key ...{key[-4:]})")

                print(f"[INFO] success with key ending with ...{key[-4:]}")
                return data

        except InvalidAPIParameters as e:
            print(f"[ERROR] invalid request: {e}")
            raise
        except Exception as e:
            last_err = e
            print(f"[WARN] Request with key {key[-4:]} failed: {e}")

    # If we get here, either we exhausted keys, or we hit a daily cap we respected
    if day_limit_message:
        raise RuntimeError(f"Alpha Vantage daily limit reached: {day_limit_message}")
    raise RuntimeError(f"all api keys exhausted. last error: {last_err}")


def parse_time_series(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    
    # returns (meta, rows) `rows` are sorted oldest -> newest with typed fields.
    # handles intraday (e.g., 'Time Series (5min)') and daily/weekly/monthly variants.

    if "Meta Data" not in payload:
        raise ValueError("unexpected payload: missing 'Meta Data'")

    meta_raw = payload["Meta Data"]

    # identifies time series key (intraday/daily/weekly/monthly)
    ts_key = next((k for k in payload.keys() if k.startswith("Time Series")), None)
    if not ts_key:
        raise ValueError("unexpected payload: missing time series key")

    series = payload[ts_key]
    if not isinstance(series, dict) or not series:
        return simplify_meta(meta_raw), []

    # map numbered keys to names
    def clean_bar(bar: Dict[str, str]) -> Dict[str, Any]:
        return {
            "open": float(bar.get("1. open", "nan")),
            "high": float(bar.get("2. high", "nan")),
            "low":  float(bar.get("3. low",  "nan")),
            "close":float(bar.get("4. close","nan")),
            "volume": int(float(bar.get("5. volume", "0"))),
        }

    # build rows
    rows = []
    for ts_str, bar in series.items():
        # timestamps are in Meta Data time zone (string) keep string or parse to naive dt
        # keep as naive local (per Meta Data) unless we know we’ll convert to UTC
        try:
            ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            # daily/weekly/monthly use dates without time sometimes
            try:
                ts = datetime.strptime(ts_str, "%Y-%m-%d")
            except ValueError:
                # last resort, keep raw
                ts = ts_str

        clean = clean_bar(bar)
        clean["timestamp"] = ts
        rows.append(clean)

    # sort oldest -> newest
    rows.sort(key=lambda x: x["timestamp"])

    meta = simplify_meta(meta_raw)
    return meta, rows

def simplify_meta(meta_raw: Dict[str, Any]) -> Dict[str, Any]:
    # normalize known keys with fallbacks
    return {
        "symbol": meta_raw.get("2. Symbol"),
        "last_refreshed": meta_raw.get("3. Last Refreshed"),
        "interval": meta_raw.get("4. Interval"),  # may be None for non intraday
        "time_zone": meta_raw.get("6. Time Zone") or meta_raw.get("5. Time Zone"),
        "info": meta_raw.get("1. Information"),   # optional
    }



# ----------- One Function To Rule Them All ----------- #
# If you are frontend, this is the only function you ever need to call
# to request API data.
# Returns: {"meta": {...}. "rows": [ {timestamp, open, high, low, close, volume}, ... ]}

def get_prices(function: str,
               symbol: str,
               interval: Optional[str] = None) -> Dict[str, Any]:
    
    if function == "TIME_SERIES_INTRADAY" and not interval:
        raise ValueError("for intraday requests, pass an interval value like '1min','5min','15min','30min','60min'")

    # --- tiny in memory cache ---
    if CACHE_TTL_SEC > 0:
        key = (function, symbol, interval)
        hit = _cache.get(key)
        if hit:
            ts, payload = hit
            if datetime.utcnow() - ts < timedelta(seconds=CACHE_TTL_SEC):
                # guard: only parse proper time series payloads
                if isinstance(payload, dict) and "Meta Data" in payload:
                    meta, rows = parse_time_series(payload)
                    return {"meta": meta, "rows": rows}
                # otherwise fall through and refetch
    # ------------------------------------

    payload = fetch_series(function=function, symbol=symbol, interval=interval)

    # guard: only parse proper time series payloads
    if not isinstance(payload, dict) or "Meta Data" not in payload:
        raise RuntimeError("Upstream returned non-time-series JSON (rate limit or invalid request).")

    # --- cache store ---
    if CACHE_TTL_SEC > 0:
        _cache[(function, symbol, interval)] = (datetime.utcnow(), payload)
    # ---------------------------

    meta, rows = parse_time_series(payload)
    return {"meta": meta, "rows": rows}


# main function for testing/demos, run file to use

def main():
    try:
        d1 = get_prices("TIME_SERIES_DAILY", "IBM")  # no interval needed
        print("=== DAILY IBM ===")
        print("meta:", {k: d1["meta"].get(k) for k in ("symbol","last_refreshed","time_zone")})
        for r in d1["rows"][-3:]:
            ts = r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"])
            print(ts, r["open"], r["high"], r["low"], r["close"], r["volume"])
    except Exception as e:
        print("daily demo failed:", e)

    try:
        d2 = get_prices("TIME_SERIES_INTRADAY", "IBM", interval="5min")
        print("\n=== INTRADAY IBM (5min) ===")
        print("meta:", {k: d2["meta"].get(k) for k in ("symbol","last_refreshed","interval","time_zone")})
        for r in d2["rows"][-3:]:
            ts = r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"])
            print(ts, r["open"], r["high"], r["low"], r["close"], r["volume"])
    except Exception as e:
        print("intraday demo failed:", e)

if __name__ == "__main__":
    main()
