import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse 
from typing import Optional
from server.auth import router as auth_router
from server.database import init_db
from server.api_data_fetch import get_prices
from server.api_news_fetch import get_news
from server.watchlist import router as watchlist_router
# Import your existing risk_gauge module
from server.portfolio import router as portfolio_router
from . import risk_gauge 

# --- NEW: Import Scheduler ---
from apscheduler.schedulers.background import BackgroundScheduler
from server.tasks import run_weekly_training

# --- NEW: Import the Analysis logic ---
# NOTE: The assumption is that 'get_sentiment_analysis' maps to your 
# 'predict_linear_trend_sentiment' function in server/analysis.
from server.analysis import (
    load_prediction_model, 
    get_prediction, 
    calculate_historical_volatility, 
    calculate_beta,
    calculate_gauge_score,
    get_sentiment_analysis # <--- ENSURE THIS IS NOW LISTED
)

# --- Define Static Directory and ensure it exists ---
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
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://172.24.141.32:3000", # your network IP
        "http://127.0.0.1:3002",   # another localhost port
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

# Initialize database, ML model, and Scheduler on startup
@app.on_event("startup")
def startup_event():
    init_db()
    
    # 1. Load initial model
    print("Loading initial ML model...")
    app.state.model, app.state.scaler = load_prediction_model()

    # 2. Start the Scheduler
    scheduler = BackgroundScheduler()
    # Schedule the task to run every Friday at 6:00 PM server time
    # We pass 'app.state' so the task can update the running model without restarting
    scheduler.add_job(
        run_weekly_training, 
        'cron', 
        day_of_week='fri', 
        hour=18, 
        minute=00,
        args=[app.state] 
    )
    scheduler.start()
    print("Weekly retraining scheduler started (Fridays @ 18:00).")

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

@app.get("/news")
def news(ticker: str = Query(None)):
    return {"articles": get_news(ticker)}

# --- NEW: Sentiment Analysis Endpoint ---
@app.get("/sentiment/{symbol}")
async def sentiment(symbol: str):
    """
    Retrieves the last 10 days of daily price data and performs linear trend sentiment analysis.
    """
    symbol = symbol.upper()
    
    # 1. Fetch the necessary data using the existing price function
    # NOTE: The analysis requires price data rows, so we use the daily function.
    try:
        # get_prices is used to fetch the raw data, which we then pass to the analysis function
        stock_data = get_prices(function="TIME_SERIES_DAILY", symbol=symbol)
    except Exception as e:
        # If price fetching fails, we can't perform the analysis
        raise HTTPException(status_code=404, detail=f"Could not fetch daily price data for {symbol}: {e}")

    # 2. Run the sentiment analysis logic
    sentiment_result = get_sentiment_analysis(stock_data)

    # 3. Return the result
    return sentiment_result

# --- NEW: Analysis Endpoint ---
@app.get("/analysis/{symbol}")
async def get_analysis(symbol: str):
    """
    Runs prediction and risk analysis for a given stock symbol.
    """
    symbol = symbol.upper()
    
    # 1. Get Prediction
    prediction = get_prediction(symbol, app.state.model, app.state.scaler)
    
    # --- NEW: Get Current Price to calculate change ---
    # We need the latest close price to compare the prediction against.
    current_price = None
    try:
        # Fetch data to get the latest price
        data = get_prices(function="TIME_SERIES_DAILY", symbol=symbol)
        if data and 'rows' in data and len(data['rows']) > 0:
            # rows are sorted oldest -> newest, so [-1] is the latest
            current_price = data['rows'][-1]['close']
    except:
        pass # Fallback handled in calculation func
        
    # --- NEW: Calculate Gauge Score ---
    gauge_score = calculate_gauge_score(current_price, prediction)

    # 2. Get Risk Metrics
    volatility = calculate_historical_volatility(symbol)
    beta = calculate_beta(symbol, "SPY")

    return {
        "symbol": symbol,
        "prediction": {
            "next_day_price": prediction,
            "gauge_score": gauge_score, 
            "info": "Predicted closing price for the next trading day." if prediction else "Prediction not available."
        },
        "risk": {
            "volatility": volatility,
            "beta": beta
        }
    }

# --- Risk Gauge Endpoint ---
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
    return FileResponse(path=image_path, media_type="image/png")
# -----------------------------------