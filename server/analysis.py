import numpy as np
import pandas as pd
from server.api_data_fetch import get_prices
from tensorflow.keras.models import load_model
from .sentiment_linear_trend import predict_linear_trend_sentiment as get_sentiment_analysis
import joblib
import os

# --- Constants ---
# We use the paths where the training script saved them
MODEL_PATH = "server/pennysworthe_model.keras"
SCALER_PATH = "server/scaler.gz"
WINDOW_SIZE = 60 

# --- Model Loading ---
def load_prediction_model():
    """Loads the ML model and scaler from disk."""
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        print("WARNING: Model or scaler file not found. Run training script.")
        return None, None
    
    try:
        model = load_model(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        print("Prediction model and scaler loaded successfully.")
        return model, scaler
    except Exception as e:
        print(f"Error loading model: {e}")
        return None, None

# --- Prediction Function ---
def get_prediction(symbol: str, model, scaler) -> float | None:
    """Predicts the next day's closing price for a symbol."""
    if model is None or scaler is None:
        return None
        
    try:
        # 1. Get recent data (enough to cover the window size)
        # Fetching 100 days to be safe for a 60-day window
        data = get_prices(function="TIME_SERIES_DAILY", symbol=symbol)
        df = pd.DataFrame(data['rows'])
        
        if len(df) < WINDOW_SIZE:
            return None # Not enough data

        # 2. Prepare data (Last 60 days of closing prices)
        # We must reshape to (-1, 1) because the scaler expects 2D array
        last_60_days = df['close'].values[-WINDOW_SIZE:].reshape(-1, 1)
        scaled_data = scaler.transform(last_60_days)
        
        # Reshape for LSTM [samples, time_steps, features]
        X_pred = np.array([scaled_data.flatten()])
        X_pred = np.reshape(X_pred, (X_pred.shape[0], X_pred.shape[1], 1))
        
        # 3. Predict
        pred_scaled = model.predict(X_pred)
        
        # 4. Inverse transform to get actual price
        prediction = scaler.inverse_transform(pred_scaled)
        
        return float(prediction[0][0])
        
    except Exception as e:
        print(f"Error during prediction for {symbol}: {e}")
        return None

# --- Risk Calculation Functions ---
def _get_daily_returns(symbol: str, period_days: int = 252) -> pd.Series:
    """Helper to get daily percentage returns."""
    data = get_prices(function="TIME_SERIES_DAILY", symbol=symbol)
    df = pd.DataFrame(data['rows'])
    if df.empty:
        return pd.Series(dtype=float)
    
    # Ensure 'timestamp' is datetime and sorted
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    # Get last N trading days (approx 1 year)
    df = df.tail(period_days)
    
    return df['close'].pct_change().dropna()

def calculate_historical_volatility(symbol: str) -> str:
    """Calculates annualized volatility and returns a risk rating."""
    try:
        returns = _get_daily_returns(symbol)
        if returns.empty:
            return "Unknown"
            
        # Annualized volatility (std dev * sqrt(252 trading days))
        volatility = returns.std() * np.sqrt(252) 
        
        if volatility > 0.40: # > 40%
            return "High"
        elif volatility > 0.20: # > 20%
            return "Medium"
        else:
            return "Low"
            
    except Exception as e:
        print(f"Error calculating volatility for {symbol}: {e}")
        return "Error"

def calculate_beta(symbol: str, market_symbol: str = "SPY") -> float | str:
    """Calculates Beta (volatility relative to the market)."""
    try:
        stock_returns = _get_daily_returns(symbol)
        market_returns = _get_daily_returns(market_symbol)
        
        if stock_returns.empty or market_returns.empty:
            return "Unknown"

        # Align data (dates must match)
        df = pd.DataFrame({'stock': stock_returns, 'market': market_returns}).dropna()
        
        if df.empty:
             return "Unknown"

        # Beta calculation: Covariance / Variance of Market
        covariance = df.cov().iloc[0, 1]
        market_variance = df['market'].var()
        
        if market_variance == 0:
            return "Unknown"
            
        beta = covariance / market_variance
        return round(beta, 2)

    except Exception as e:
        print(f"Error calculating beta for {symbol}: {e}")
        return "Error"

def calculate_gauge_score(current_price: float, predicted_price: float) -> int:
    """
    Maps predicted % change to a 0-100 gauge score.
    50 is neutral (0% change).
    0 is strong negative change (-2% or more).
    100 is strong positive change (+2% or more).
    """
    if current_price is None or predicted_price is None or current_price == 0:
        return 50 # Default neutral

    # Calculate percentage change (e.g., 0.015 for 1.5%)
    pct_change = (predicted_price - current_price) / current_price
    
    # Define the range we care about (e.g., +/- 2% move is a "strong" move)
    max_change_threshold = 0.02 

    # Normalize to -1.0 to 1.0 scale based on threshold
    # Cap at thresholds so we don't go out of bounds
    normalized_change = max(min(pct_change / max_change_threshold, 1.0), -1.0)
    
    # Map [-1, 1] to [0, 100]
    # -1 becomes 0, 0 becomes 50, 1 becomes 100
    gauge_score = int((normalized_change + 1) * 50)
    
    return gauge_score