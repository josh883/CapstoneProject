from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from server.auth import router as auth_router
from server.database import init_db
from server.api_data_fetch import get_prices
from server.api_news_fetch import get_news

app = FastAPI()

# to allow rqsts from our dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

app.include_router(auth_router)

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