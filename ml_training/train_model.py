import sys
import os
# Add the parent directory (project root) to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from server.api_data_fetch import get_prices
import joblib

# --- Configuration ---
TRAINING_SYMBOL = "IBM" 
WINDOW_SIZE = 60         
MODEL_PATH = "server/pennysworthe_model.keras"
SCALER_PATH = "server/scaler.gz"

# CHANGE: Wrapped logic in a function that accepts an 'automated' flag
def train_model(automated=False):
    print(f"Starting model training for symbol: {TRAINING_SYMBOL}")
    
    try:
        data = get_prices(function="TIME_SERIES_DAILY", symbol=TRAINING_SYMBOL)
        df = pd.DataFrame(data['rows'])
        if df.empty:
            print("Failed to fetch training data. Exiting.")
            return
        
        # We only care about the closing price for this simple model
        close_prices = df['close'].values.reshape(-1, 1)

    except Exception as e:
        print(f"Error fetching data: {e}")
        return

    # 2. Scale Data
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(close_prices)

    # 3. Create Training Sequences
    X_train, y_train = [], []
    for i in range(WINDOW_SIZE, len(scaled_data)):
        X_train.append(scaled_data[i-WINDOW_SIZE:i, 0])
        y_train.append(scaled_data[i, 0])
    
    X_train, y_train = np.array(X_train), np.array(y_train)
    
    # Reshape for LSTM [samples, time_steps, features]
    X_train = np.reshape(X_train, (X_train.shape[0], X_train.shape[1], 1))

    # 4. Build LSTM Model
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=(X_train.shape[1], 1)))
    model.add(Dropout(0.2))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(units=25))
    model.add(Dense(units=1))

    model.compile(optimizer='adam', loss='mean_squared_error')
    
    # 5. Train Model
    print("Training model... This may take a few minutes.")
    # We can use the automated flag to adjust parameters if needed (e.g. fewer epochs for testing)
    model.fit(X_train, y_train, batch_size=32, epochs=25)

    # 6. Save Model and Scaler
    # Ensure server directory exists before saving
    if not os.path.exists("server"):
        os.makedirs("server", exist_ok=True)

    model.save(MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    print(f"Model training complete!")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Scaler saved to: {SCALER_PATH}")

# CHANGE: Only run immediately if executed as a script
if __name__ == "__main__":
    train_model(automated=False)