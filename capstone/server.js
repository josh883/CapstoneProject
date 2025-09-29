const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 3000;
const saltRounds = 10; // Standard salt rounds for bcrypt

// Connect to or create the SQLite database
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Create the users table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);
});

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Registration route
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).send('<h1>Registration Failed</h1><p>All fields are required.</p>');
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert the new user into the database
        const stmt = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        stmt.run(username, email, hashedPassword, function(err) {
            if (err) {
                // Handle duplicate username/email
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).send('<h1>Registration Failed</h1><p>Username or Email already exists.</p>');
                }
                return res.status(500).send('<h1>Registration Failed</h1><p>An internal server error occurred.</p>');
            }
            console.log(`User ${username} registered with ID: ${this.lastID}`);
            res.status(201).send('<h1>Registration Successful!</h1><p>You can now log in.</p><a href="/login.html">Go to Login</a>');
        });
        stmt.finalize();
    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Registration Failed</h1><p>An internal server error occurred.</p>');
    }
});

// Login route (updated to use the database)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) {
            return res.status(500).send('<h1>Login Failed</h1><p>An internal server error occurred.</p>');
        }
        if (!user) {
            // User not found
            return res.status(401).send('<h1>Login Failed</h1><p>Invalid username or password.</p>');
        }

        try {
            // Compare the provided password with the hashed password in the database
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                res.redirect('/dashboard.html');
            } else {
                res.status(401).send('<h1>Login Failed</h1><p>Invalid username or password.</p>');
            }
        } catch (error) {
            console.error(error);
            res.status(500).send('<h1>Login Failed</h1><p>An internal server error occurred.</p>');
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});