const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;
const dbPath = path.join(__dirname, 'users.db');

// Set up middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(bodyParser.urlencoded({ extended: true }));

// --- DATABASE SETUP ---
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            }
        });
    }
});

// --- AUTHENTICATION ROUTES ---

// Registration Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send({ error: "Username and password are required." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
            if (err) {
                // Unique constraint failed
                console.error(`[REGISTER] Error: ${err.message}`);
                return res.status(409).send({ error: "Username already exists." });
            }
            res.status(201).send({ message: "User registered successfully!" });
        });
    } catch (e) {
        console.error(`[REGISTER] Hashing error: ${e}`);
        res.status(500).send({ error: "Server error during registration." });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[LOGIN] Attempt for user: ${username}`);

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        
        if (err) {
            console.error('[LOGIN] DB Query Error:', err);
            return res.status(500).send({ error: "Database error during login." });
        }
        
        if (!user) {
            console.log('[LOGIN] User not found.');
            return res.status(401).send({ error: "Invalid username or password." });
        }
        
        console.log('[LOGIN] User found: true');

        try {
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                console.log('[LOGIN] Password match: true. Login successful.');
                // NOTE: In a real app, you would issue a JWT token here.
                // FIX: Redirect the user to the main app page instead of sending raw JSON.
                res.redirect('/stock_search.html');
            } else {
                console.log('[LOGIN] Password match: false.');
                res.status(401).send({ error: "Invalid username or password." });
            }
        } catch (e) {
            console.error(`[LOGIN] bcrypt error: ${e}`);
            res.status(500).send({ error: "Server error during password comparison." });
        }
    });
});

// --- STOCK DATA & SENTIMENT ROUTES ---

// Main API Route to Fetch Stock Data AND Determine Sentiment
app.get('/api/stock', (req, res) => {
    const symbol = req.query.symbol;
    if (!symbol) {
        return res.status(400).send({ error: "Stock symbol is required." });
    }

    // Define paths for both Python scripts
    const pythonDataScriptPath = path.join(__dirname, 'api_data_fetch.py');
    const pythonSentimentScriptPath = path.join(__dirname, 'stock_sentiment_predictor.py');
    
    // --- STEP 1: Execute Data Fetcher (api_data_fetch.py) ---
    // CHANGED: Using 'python' instead of 'python3' for better Windows compatibility
    const dataFetcher = spawn('python', [pythonDataScriptPath, symbol]);
    let rawStockData = '';
    let dataFetcherError = '';

    dataFetcher.stdout.on('data', (data) => {
        rawStockData += data.toString();
    });

    dataFetcher.stderr.on('data', (data) => {
        dataFetcherError += data.toString();
    });

    dataFetcher.on('close', (code) => {
        if (code !== 0) {
            console.error(`[STOCK] Data Fetcher exited with code ${code}. Stderr: ${dataFetcherError}`);
            return res.status(500).send({ 
                error: "Failed to fetch stock data (Python script failed or API limit reached).",
                details: dataFetcherError
            });
        }
        
        // --- STEP 2: Parse and Process Data ---
        let stockDataJson;
        try {
            stockDataJson = JSON.parse(rawStockData);
        } catch (e) {
            console.error(`[STOCK] Error parsing stock data JSON: ${e.message}. Raw output: ${rawStockData.substring(0, 100)}...`);
            return res.status(500).send({ error: "Failed to parse stock data from Python." });
        }

        // Check if AlphaVantage returned an error (e.g., invalid symbol or rate limit)
        if (stockDataJson.error) {
             console.log(`[STOCK] AlphaVantage reported error: ${stockDataJson.error}`);
            return res.status(404).send({ error: stockDataJson.error });
        }
        
        // --- STEP 3: Execute Sentiment Predictor (stock_sentiment_predictor.py) ---
        // CHANGED: Using 'python' instead of 'python3' for better Windows compatibility
        const sentimentPredictor = spawn('python', [pythonSentimentScriptPath]);
        let sentimentResult = '';
        let sentimentError = '';
        
        sentimentPredictor.stdout.on('data', (data) => {
            sentimentResult += data.toString();
        });

        sentimentPredictor.stderr.on('data', (data) => {
            sentimentError += data.toString();
        });

        sentimentPredictor.on('close', (sentimentCode) => {
            if (sentimentCode !== 0) {
                console.error(`[SENTIMENT] Predictor exited with code ${sentimentCode}. Stderr: ${sentimentError}`);
                // If sentiment fails, still return the stock data, but mark sentiment as error
                stockDataJson.sentiment = { 
                    prediction: "Error", 
                    message: "Sentiment analysis failed to run."
                };
            } else {
                try {
                    // Attach the sentiment result to the main stock data object
                    const sentimentJson = JSON.parse(sentimentResult);
                    stockDataJson.sentiment = sentimentJson;
                } catch (e) {
                    console.error(`[SENTIMENT] Error parsing sentiment JSON: ${e.message}`);
                    stockDataJson.sentiment = { 
                        prediction: "Error", 
                        message: "Failed to parse sentiment result." 
                    };
                }
            }

            // --- STEP 4: Send combined result back to the frontend ---
            res.json(stockDataJson);
        });
        
        // Write the stock data (as a string) to the sentiment predictor's stdin
        sentimentPredictor.stdin.write(JSON.stringify(stockDataJson));
        sentimentPredictor.stdin.end();
    });
});


// --- SERVER STARTUP ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Login page: http://localhost:${PORT}/login.html`);
    console.log(`Stock Search page: http://localhost:${PORT}/stock_search.html`);
});
