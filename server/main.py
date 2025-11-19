import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse # NEW: Import FileResponse to serve the image file
from typing import Optional
from server.auth import router as auth_router
from server.database import init_db
from server.api_data_fetch import get_prices
from server.api_news_fetch import get_news
from server.watchlist import router as watchlist_router
from server.portfolio import router as portfolio_router
from . import risk_gauge # NEW: Import your risk_gauge module

# --- NEW: Define Static Directory and ensure it exists ---
# os.path.dirname(__file__) refers to the current directory (server/)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)
# ---------------------------------------------------------


app = FastAPI()

DEFAULT_ORIGIN_REGEX = (
    r"https?://(?:localhost|127(?:\.[0-9]{1,3}){3}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?"
)

def build_allowed_origins():
    base_origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://172.24.141.32:3000", # your network IP
    }

    extra_origins = os.getenv("FRONTEND_ORIGINS", "")
    if extra_origins:
        base_origins.update(
            origin.strip()
            for origin in extra_origins.split(",")
            if origin.strip()
        )

    host_ip = os.getenv("HOST_IP")
    if host_ip:
        base_origins.add(f"http://{host_ip}:3000")

    return sorted(base_origins)

origins = build_allowed_origins()
origin_regex = os.getenv("FRONTEND_ORIGIN_REGEX", DEFAULT_ORIGIN_REGEX)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# init database on startup
@app.on_event("startup")
def startup_event():
    init_db()

app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(portfolio_router)

def json_safe(d):
    meta, rows = d["meta"], d["rows"]
    out_rows = []
    for r in rows:
        r = dict(r)
        ts = r.get("timestamp")
        if hasattr(ts, "isoformat"):
            r["timestamp"] = ts.isoformat()
        out_rows.append(r)
    return {"meta": meta, "rows": out_rows}

@app.get("/prices")
def prices(
    function: str = Query(..., pattern="^TIME_SERIES_(INTRADAY|DAILY|WEEKLY|MONTHLY)$"),
    symbol: str = Query(..., min_length=1),
    interval: Optional[str] = None
):
    try:
        data = get_prices(function=function, symbol=symbol, interval=interval)
        return json_safe(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/news")
def news(ticker: str = Query(None)):
    return {"articles": get_news(ticker)}

# --- NEW: Risk Gauge Endpoint ---
@app.get("/v1/api/risk_gauge/{probability}", 
         response_class=FileResponse, 
         tags=["analysis"])
async def get_risk_gauge(probability: float):
    """
    Generates and returns the circular risk gauge diagram based on prediction probability.
    """
    # 1. Input Validation
    if not (0 <= probability <= 100):
        raise HTTPException(status_code=400, detail="Probability must be between 0 and 100.")

    # 2. Define the output path for the image file
    image_filename = f"risk_gauge_{int(probability)}.png"
    image_path = os.path.join(STATIC_DIR, image_filename)

    # 3. Generate the diagram
    # The risk_gauge.features function handles the matplotlib plotting and saving the file
    risk_gauge.features(probability, file_path=image_path)
    
    # 4. Return the file
    # FileResponse serves the image file with the correct media type
    return FileResponse(path=image_path, media_type="image/png")
# -----------------------------------
