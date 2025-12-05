# server/settings.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from server.database import get_db_connection

router = APIRouter()

def _get_session_user(request: Request) -> str:
    username = request.cookies.get("session_user")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username.strip()


DEFAULT_SETTINGS = {
    "enable_ai_prediction": True,
    "enable_trend_sentiment": True,
    "enable_golden_cross": True,
    "enable_volatility": True,
    "enable_beta": True,
    "enable_signal_gauge": True,
    "risk_sensitivity": 50,
    "prediction_weight": 50,
    "smoothing_factor": 30,
    "chart_history_days": 30,
    "show_chart_fill": True,
    "show_prediction_marker": True,
}


class SettingsPayload(BaseModel):
    enable_ai_prediction: bool
    enable_trend_sentiment: bool
    enable_golden_cross: bool
    enable_volatility: bool
    enable_beta: bool
    enable_signal_gauge: bool

    risk_sensitivity: int
    prediction_weight: int
    smoothing_factor: int
    chart_history_days: int

    show_chart_fill: bool
    show_prediction_marker: bool


@router.get("/settings")
async def get_settings(request: Request):
    """
    Returns per user settings. If none exist yet, create a default row and return it.
    """
    username = _get_session_user(request)
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    enable_ai_prediction,
                    enable_trend_sentiment,
                    enable_golden_cross,
                    enable_volatility,
                    enable_beta,
                    enable_signal_gauge,
                    risk_sensitivity,
                    prediction_weight,
                    smoothing_factor,
                    chart_history_days,
                    show_chart_fill,
                    show_prediction_marker
                FROM user_settings
                WHERE username = %s
                """,
                (username,),
            )
            row = cur.fetchone()

        if row:
            # row is dict-like because of RealDictCursor
            settings = dict(row)
        else:
            # Insert defaults for this user, then return them
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO user_settings (
                            username,
                            enable_ai_prediction,
                            enable_trend_sentiment,
                            enable_golden_cross,
                            enable_volatility,
                            enable_beta,
                            enable_signal_gauge,
                            risk_sensitivity,
                            prediction_weight,
                            smoothing_factor,
                            chart_history_days,
                            show_chart_fill,
                            show_prediction_marker
                        ) VALUES (
                            %(username)s,
                            %(enable_ai_prediction)s,
                            %(enable_trend_sentiment)s,
                            %(enable_golden_cross)s,
                            %(enable_volatility)s,
                            %(enable_beta)s,
                            %(enable_signal_gauge)s,
                            %(risk_sensitivity)s,
                            %(prediction_weight)s,
                            %(smoothing_factor)s,
                            %(chart_history_days)s,
                            %(show_chart_fill)s,
                            %(show_prediction_marker)s
                        )
                        """,
                        {
                            "username": username,
                            **DEFAULT_SETTINGS,
                        },
                    )
            settings = DEFAULT_SETTINGS.copy()

    finally:
        conn.close()

    return {
        "username": username,
        "settings": settings,
    }


@router.post("/settings")
async def update_settings(request: Request, payload: SettingsPayload):
    """
    Upserts full settings for the current user.
    Frontend should send the complete settings object.
    """
    username = _get_session_user(request)

    risk = max(0, min(100, payload.risk_sensitivity))
    weight = max(0, min(100, payload.prediction_weight))
    smooth = max(0, min(100, payload.smoothing_factor))
    if payload.chart_history_days not in (15, 30, 60, 120):
        history_days = 30
    else:
        history_days = payload.chart_history_days

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO user_settings (
                        username,
                        enable_ai_prediction,
                        enable_trend_sentiment,
                        enable_golden_cross,
                        enable_volatility,
                        enable_beta,
                        enable_signal_gauge,
                        risk_sensitivity,
                        prediction_weight,
                        smoothing_factor,
                        chart_history_days,
                        show_chart_fill,
                        show_prediction_marker
                    ) VALUES (
                        %(username)s,
                        %(enable_ai_prediction)s,
                        %(enable_trend_sentiment)s,
                        %(enable_golden_cross)s,
                        %(enable_volatility)s,
                        %(enable_beta)s,
                        %(enable_signal_gauge)s,
                        %(risk_sensitivity)s,
                        %(prediction_weight)s,
                        %(smoothing_factor)s,
                        %(chart_history_days)s,
                        %(show_chart_fill)s,
                        %(show_prediction_marker)s
                    )
                    ON CONFLICT (username)
                    DO UPDATE SET
                        enable_ai_prediction   = EXCLUDED.enable_ai_prediction,
                        enable_trend_sentiment = EXCLUDED.enable_trend_sentiment,
                        enable_golden_cross    = EXCLUDED.enable_golden_cross,
                        enable_volatility      = EXCLUDED.enable_volatility,
                        enable_beta            = EXCLUDED.enable_beta,
                        enable_signal_gauge    = EXCLUDED.enable_signal_gauge,
                        risk_sensitivity       = EXCLUDED.risk_sensitivity,
                        prediction_weight      = EXCLUDED.prediction_weight,
                        smoothing_factor       = EXCLUDED.smoothing_factor,
                        chart_history_days     = EXCLUDED.chart_history_days,
                        show_chart_fill        = EXCLUDED.show_chart_fill,
                        show_prediction_marker = EXCLUDED.show_prediction_marker
                    """,
                    {
                        "username": username,
                        "enable_ai_prediction": payload.enable_ai_prediction,
                        "enable_trend_sentiment": payload.enable_trend_sentiment,
                        "enable_golden_cross": payload.enable_golden_cross,
                        "enable_volatility": payload.enable_volatility,
                        "enable_beta": payload.enable_beta,
                        "enable_signal_gauge": payload.enable_signal_gauge,
                        "risk_sensitivity": risk,
                        "prediction_weight": weight,
                        "smoothing_factor": smooth,
                        "chart_history_days": history_days,
                        "show_chart_fill": payload.show_chart_fill,
                        "show_prediction_marker": payload.show_prediction_marker,
                    },
                )
    finally:
        conn.close()

    return {"username": username, "status": "ok"}
