import numpy as np

def predict_linear_trend_sentiment(stock_data: dict):
    """
    Analyzes the last 10 closing prices to determine the market sentiment
    using a simple linear trend calculation (NumPy polyfit).

    Args:
        stock_data (dict): The dictionary containing 'rows' of price data,
                           where each row has a 'close' key.

    Returns:
        dict: A dictionary containing the prediction (Bullish/Bearish/Neutral)
              and a trend score (the slope).
    """
    rows = stock_data.get('rows', [])
    
    # Check for minimum data points
    REQUIRED_POINTS = 10
    if len(rows) < REQUIRED_POINTS:
        return {
            "prediction": "Neutral",
            "score": 0.0,
            "message": f"Requires at least {REQUIRED_POINTS} data points for analysis. Found {len(rows)}."
        }

    # Extract the closing prices for the last 10 days
    # Assumes 'rows' is sorted oldest to newest, which is typical for 'get_prices'
    recent_prices = np.array([row['close'] for row in rows[-REQUIRED_POINTS:]])

    # Simple Linear Regression (polyfit degree 1)
    # x values are indices (0, 1, ..., 9)
    x = np.arange(len(recent_prices))
    
    # Calculate slope (m) and intercept (c)
    m, _ = np.polyfit(x, recent_prices, 1)

    # Thresholds for sentiment determination
    BULLISH_THRESHOLD = 0.1
    BEARISH_THRESHOLD = -0.1
    
    if m > BULLISH_THRESHOLD:
        prediction = "Bullish"
        message = "Strong upward trend observed in the last 10 days (Bullish slope)."
    elif m < BEARISH_THRESHOLD:
        prediction = "Bearish"
        message = "Strong downward trend observed in the last 10 days (Bearish slope)."
    else:
        prediction = "Neutral"
        message = "Market price movement is relatively flat."

    return {
        "prediction": prediction,
        "score": round(m, 3),
        "message": message
    }