import os
import sys
import logging

# Configure logging to show us when training happens
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure we can import from the project root and ml_training
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the training logic (we need to slightly modify train_model.py first)
from ml_training import train_model as trainer
from server.analysis import load_prediction_model

def run_weekly_training(app_state):
    """
    Scheduled task to retrain the model and reload it into the running app.
    """
    logger.info("--- Starting scheduled weekly model retraining ---")
    try:
        # 1. Run the training script's main function
        # We pass a flag to tell it it's running automatically
        trainer.train_model(automated=True)
        logger.info("Training complete. Reloading model into server...")

        # 2. Reload the new model and scaler from disk
        new_model, new_scaler = load_prediction_model()
        
        # 3. Update the running FastAPI application's state
        if new_model and new_scaler:
            app_state.model = new_model
            app_state.scaler = new_scaler
            logger.info("--- Model successfully reloaded and active ---")
        else:
            logger.error("Failed to reload model after training.")
            
    except Exception as e:
        logger.error(f"Error during automated retraining: {e}")