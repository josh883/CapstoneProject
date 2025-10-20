import sys
import json
import numpy as np

def predict_sentiment(stock_data):
    """
    Analyzes the last 10 closing prices to determine the market sentiment
    using a simple linear trend calculation.

    Args:
        stock_data (dict): The cleaned dictionary containing 'rows' of price data.

    Returns:
        dict: A dictionary containing the prediction (Bullish/Bearish) and a trend score.
    """
    rows = stock_data.get('rows', [])
    
    if len(rows) < 10:
        return {
            "prediction": "Neutral",
            "score": 0.0,
            "message": f"Requires at least 10 data points for analysis. Found {len(rows)}."
        }

    # Get the closing prices for the last 10 days
    # We use rows[-10:] to get the last 10 elements
    recent_prices = np.array([row['close'] for row in rows[-10:]])

    # Simple Linear Regression to find the trend slope (score)
    # x values are just indices (0, 1, 2, ..., 9)
    x = np.arange(len(recent_prices))
    
    # Calculate slope (m) and intercept (c)
    # The slope (m) indicates the average daily trend over the period.
    m, c = np.polyfit(x, recent_prices, 1)

    # Determine sentiment based on the slope (m)
    if m > 0.1: # Significant positive movement
        prediction = "Bullish"
        message = "Strong upward trend observed in the last 10 days."
    elif m < -0.1: # Significant negative movement
        prediction = "Bearish"
        message = "Strong downward trend observed in the last 10 days."
    else:
        prediction = "Neutral"
        message = "Market price movement is relatively flat."

    return {
        "prediction": prediction,
        "score": round(m, 3),
        "message": message
    }

if __name__ == "__main__":
    try:
        # 1. Read the JSON input (which is passed from Node.js)
        data_string = sys.stdin.read()
        stock_data = json.loads(data_string)
        
        # 2. Run the prediction
        sentiment_result = predict_sentiment(stock_data)

        # 3. Print the result as JSON to stdout (Node.js will capture this)
        print(json.dumps(sentiment_result))

    except Exception as e:
        # In case of any error during execution, print an error JSON
        print(json.dumps({"error": f"Sentiment script failed: {e}"}))
        sys.exit(1)
