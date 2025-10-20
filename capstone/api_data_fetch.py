# IF YOU ARE FRONTEND:
# Scroll to the bottom to see the one function you'll ever have to call

import os
import requests
import json
import sys # New import for command line arguments
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
# IMPORTANT: Set your API key here or as an environment variable
# If using the default, AlphaVantage may quickly rate limit you.
API_KEY = os.getenv("ALPHAVANTAGE_API_KEY", "MMK62Q0AQU1ENXDT") # hardcoded to use my api key for now, we can fix later

# dict of valid fns we can call from api
VALID_FUNCS = {
    "TIME_SERIES_INTRADAY",
    "TIME_SERIES_DAILY",
    "TIME_SERIES_WEEKLY",
    "TIME_SERIES_MONTHLY",
}

# function that builds our api call
def build_url(function: str, symbol: str, interval: Optional[str] = None, api_key: Optional[str] = None) -> str:
    if function not in VALID_FUNCS:
        raise ValueError(f"unsupported function: {function}")

    api_key = api_key or API_KEY
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


def fetch_series(function: str, symbol: str, interval: Optional[str] = None, timeout: float = 10.0) -> Dict[str, Any]:
    url = build_url(function, symbol, interval)
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    data = r.json()

    # limit handling - this is why and where we need to implement api key switching
    # note - idk what error message actually returns from AV when you exceed your max
    # api calls. Google said "Note" so that's what I used, but if thats wrong thats why.
    # Google also said "Error Message" is the return for bad params/symbol
    if isinstance(data, dict) and ("Note" in data or "Information" in data and "calls per minute" in data.get("Information","")):
        # rate limited or throttle note
        raise RuntimeError(data.get("Note") or data.get("Information"))
    if "Error Message" in data:
        raise RuntimeError(data["Error Message"])
    return data

def parse_time_series(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    
    # returns (meta, rows) `rows` are sorted oldest -> newest with typed fields.
    # handles intraday (e.g., 'Time Series (5min)') and daily/weekly/monthly variants.

    if "Meta Data" not in payload:
        # Check if the API returned an error structure we missed
        if payload.get("Error Message"):
             raise ValueError(payload["Error Message"])
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
        # Convert datetime object to ISO format string for JSON serialization
        clean["timestamp"] = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
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

    payload = fetch_series(function=function, symbol=symbol, interval=interval)
    meta, rows = parse_time_series(payload)
    return {"meta": meta, "rows": rows}


# main function for testing/demos, run file to use
# NEW: Main function to run when script is executed via Node.js
# It reads arguments and prints a JSON object to stdout.
def main():
    if len(sys.argv) < 2:
        # Exit silently if no symbol is provided, Node.js will handle the error
        return 

    # The first argument (index 1) after the script name is the symbol
    symbol = sys.argv[1].upper() 
    
    try:
        # Use TIME_SERIES_DAILY as the default for the search bar
        data = get_prices("TIME_SERIES_DAILY", symbol) 
        
        # Print the final result as a JSON string to stdout
        # Node.js will capture this output.
        print(json.dumps(data))
        
    except Exception as e:
        # Print a structured error message so Node.js can identify it
        print(json.dumps({"error": str(e), "symbol": symbol}))

if __name__ == "__main__":
    main()
