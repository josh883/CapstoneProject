from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field, validator

from server.database import get_db_connection

router = APIRouter()


def _get_session_user(request: Request) -> str:
    username = request.cookies.get("session_user")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username.strip()


def _serialize_decimal(value: Optional[Decimal]) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _serialize_datetime(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat()


def _serialize_holding(row):
    return {
        "id": row["id"],
        "asset": row["asset"],
        "shares": _serialize_decimal(row["shares"]),
        "totalCost": _serialize_decimal(row["total_cost"]),
        "createdAt": _serialize_datetime(row.get("created_at")),
        "updatedAt": _serialize_datetime(row.get("updated_at")),
    }


def _serialize_trade(row):
    return {
        "id": row["id"],
        "asset": row["asset"],
        "type": row["trade_type"],
        "price": _serialize_decimal(row["price"]),
        "shares": _serialize_decimal(row.get("shares")),
        "timestamp": _serialize_datetime(row["executed_at"]),
        "createdAt": _serialize_datetime(row.get("created_at")),
    }


class HoldingPayload(BaseModel):
    asset: str = Field(..., min_length=1)
    shares: float = Field(..., gt=0)
    totalCost: float = Field(..., gt=0)

    @validator("asset")
    def validate_asset(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("Asset required")
        return normalized


class TradePayload(BaseModel):
    asset: str = Field(..., min_length=1)
    type: Literal["buy", "sell"]
    price: float = Field(..., gt=0)
    shares: Optional[float] = Field(None, gt=0)
    timestamp: datetime

    @validator("asset")
    def validate_asset(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("Asset required")
        return normalized


@router.get("/portfolio/holdings")
async def get_holdings(request: Request):
    username = _get_session_user(request)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, asset, shares, total_cost, created_at, updated_at
                FROM portfolio_holdings
                WHERE username = %s
                ORDER BY asset ASC
                """,
                (username,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return {"username": username, "holdings": [_serialize_holding(row) for row in rows]}


@router.post("/portfolio/holdings")
async def upsert_holding(request: Request, payload: HoldingPayload):
    username = _get_session_user(request)
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO portfolio_holdings (username, asset, shares, total_cost)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (username, asset)
                    DO UPDATE
                    SET shares = portfolio_holdings.shares + EXCLUDED.shares,
                        total_cost = portfolio_holdings.total_cost + EXCLUDED.total_cost,
                        updated_at = NOW()
                    RETURNING id, asset, shares, total_cost, created_at, updated_at
                    """,
                    (username, payload.asset, payload.shares, payload.totalCost),
                )
                holding = cur.fetchone()
    finally:
        conn.close()

    return {"holding": _serialize_holding(holding)}


@router.get("/portfolio/trades")
async def get_trades(
    request: Request,
    limit: int = Query(25, ge=1, le=100),
):
    username = _get_session_user(request)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, asset, trade_type, price, shares, executed_at, created_at
                FROM portfolio_trades
                WHERE username = %s
                ORDER BY executed_at DESC, id DESC
                LIMIT %s
                """,
                (username, limit),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return {"username": username, "trades": [_serialize_trade(row) for row in rows]}


@router.post("/portfolio/trades")
async def add_trade(request: Request, payload: TradePayload):
    username = _get_session_user(request)
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO portfolio_trades
                        (username, asset, trade_type, price, shares, executed_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, asset, trade_type, price, shares, executed_at, created_at
                    """,
                    (
                        username,
                        payload.asset,
                        payload.type,
                        payload.price,
                        payload.shares,
                        payload.timestamp,
                    ),
                )
                trade = cur.fetchone()
    finally:
        conn.close()

    return {"trade": _serialize_trade(trade)}
