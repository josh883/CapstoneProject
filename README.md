# CapstoneProject
Senior project


Full-Stack Stock Sentiment Predictor

💰 Project Overview

This is a full-stack web application designed to demonstrate the integration of Node.js (Express), SQLite for user authentication, and Python for external API data fetching and simple machine learning/trend analysis.

The application allows registered users to log in, search for a stock ticker symbol (e.g., IBM), retrieve the latest daily price data using the AlphaVantage API, and immediately display a basic market Bullish, Bearish, or Neutral sentiment prediction based on recent price movements.

✨ Features

User Authentication: Secure login and registration using Node.js, SQLite, and bcrypt for password hashing.

Dynamic Data Fetching: Backend communication with the AlphaVantage API to retrieve up-to-date daily stock data.

Python Integration: Uses Node.js's child_process.spawn to execute two separate Python scripts for data handling and analysis.

Basic Sentiment Analysis: A Python script utilizing NumPy performs linear regression on the last 10 closing prices to determine a simple market trend (sentiment).

Responsive Frontend: A clean, single-page HTML/JavaScript interface for searching and displaying results, styled with Tailwind CSS.

🛠️ Tech Stack & Dependencies

Backend (Node.js/Express)

Dependency

Purpose

express

Core server framework for routing.

sqlite3

Database driver for the users.db file.

bcrypt

Hashing and comparing user passwords securely.

body-parser

Middleware for parsing incoming request bodies.

child_process

Used to spawn and communicate with Python scripts.

Data/Analysis (Python)

Dependency

Purpose

requests

Making HTTP requests to the AlphaVantage API.

numpy

Used in the sentiment predictor for numerical analysis and trend calculation.

Database

SQLite: Used for persistent storage of user credentials (users.db).

🚀 Setup and Installation

Follow these steps to get the project running locally.

Prerequisites

Node.js: Ensure you have Node.js and npm installed.

Python 3: Ensure you have Python installed and accessible via the command python (as configured in server.js).

API Key: Get a free API key from AlphaVantage.

1. Install Node Dependencies

Navigate to the project root directory and install the required npm packages:

npm install express sqlite3 bcrypt body-parser


2. Install Python Dependencies

Install the two Python packages required for data fetching and analysis:

pip install requests numpy


3. Configure API Key

You must set your AlphaVantage API key in the Python data fetching script (api_data_fetch.py):

# api_data_fetch.py (Find and replace 'YOUR_ALPHA_VANTAGE_KEY_HERE')
API_KEY = "YOUR_ALPHA_VANTAGE_KEY_HERE" 


4. Run the Server

Start the Node.js server from the project root directory:

node server.js


The server will start on http://localhost:3000.

🧭 File Structure

.
├── server.js                        # Node.js Express server and routing logic
├── api_data_fetch.py                # Python script: Fetches data from AlphaVantage API
├── stock_sentiment_predictor.py     # Python script: Analyzes data and predicts sentiment
├── users.db                         # SQLite database file (created automatically)
├── package.json
└── public/
    ├── login.html                   # User login and registration form
    └── stock_search.html            # Main application UI (search and display)
