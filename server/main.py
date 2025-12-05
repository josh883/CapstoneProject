import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
from server.auth import router as auth_router
from server.database import init_db
from server.api_data_fetch import get_prices, analyze_cross
from server.api_news_fetch import get_news
from server.watchlist import router as watchlist_router
from server.portfolio import router as portfolio_router
from . import risk_gauge
from server.settings import router as settings_router
from server.recommendations import router as recommendations_router
from apscheduler.schedulers.background import BackgroundScheduler
from server.tasks import run_weekly_training
from server.analysis import (
    load_prediction_model,
    get_prediction,
    calculate_historical_volatility,
    calculate_beta,
    calculate_gauge_score,
    get_sentiment_analysis
)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)

app = FastAPI()

DEFAULT_ORIGIN_REGEX = (
    r"https?://(?:localhost|127(?:\.[0-9]{1,3}){3}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?"
)


def build_allowed_origins():
    base_origins = {
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://172.24.141.32:3000",
        "http://127.0.0.1:3002",
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

@app.on_event("startup")
def startup_event():
    init_db()
    print("Loading initial ML model...")
    app.state.model, app.state.scaler = load_prediction_model()

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_weekly_training,
        "cron",
        # day_of_week="fri",
        hour=18,
        minute=00,
        args=[app.state],
    )
    scheduler.start()
    print("Weekly retraining scheduler started (Fridays @ 18:00).")


app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(portfolio_router)
app.include_router(recommendations_router)
app.include_router(settings_router)  


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
    interval: Optional[str] = None,
):
    try:
        data = get_prices(function=function, symbol=symbol, interval=interval)
        return json_safe(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/sma_status")
def sma_status(symbol: str = Query(..., min_length=1)):
    """
    Returns whether a stock is currently in a Golden Cross or Death Cross
    based on 20-day and 80-day SMAs.
    """
    try:
        result = analyze_cross(symbol)
        return {"symbol": symbol.upper(), "status": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/news")
def news(ticker: str = Query(None), limit: int = Query(10, ge=1, le=50)):
    """
    Returns up to `limit` news articles. If `ticker` is provided the backend will
    attempt a ticker-specific query and fall back to general news if none found.
    """
    try:
        articles = get_news(ticker, limit)
        return {"articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sentiment/{symbol}")
async def sentiment(symbol: str):
    symbol = symbol.upper()
    try:
        stock_data = get_prices(function="TIME_SERIES_DAILY", symbol=symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch daily price data for {symbol}: {e}")

    sentiment_result = get_sentiment_analysis(stock_data)
    return sentiment_result


@app.get("/analysis/{symbol}")
async def get_analysis(symbol: str):
    symbol = symbol.upper()
    prediction = get_prediction(symbol, app.state.model, app.state.scaler)

    current_price = None
    try:
        data = get_prices(function="TIME_SERIES_DAILY", symbol=symbol)
        if data and "rows" in data and len(data["rows"]) > 0:
            current_price = data["rows"][-1]["close"]
    except:
        pass

    gauge_score = calculate_gauge_score(current_price, prediction)
    volatility = calculate_historical_volatility(symbol)
    beta = calculate_beta(symbol, "SPY")

    return {
        "symbol": symbol,
        "prediction": {
            "next_day_price": prediction,
            "gauge_score": gauge_score,
            "info": "Predicted closing price for the next trading day." if prediction else "Prediction not available.",
        },
        "risk": {"volatility": volatility, "beta": beta},
    }


@app.get(
    "/v1/api/risk_gauge/{probability}",
    response_class=FileResponse,
    tags=["analysis"],
)
async def get_risk_gauge(probability: float):
    if not (0 <= probability <= 100):
        raise HTTPException(status_code=400, detail="Probability must be between 0 and 100.")

    image_filename = f"risk_gauge_{int(probability)}.png"
    image_path = os.path.join(STATIC_DIR, image_filename)
    risk_gauge.features(probability, file_path=image_path)
    return FileResponse(path=image_path, media_type="image/png")
