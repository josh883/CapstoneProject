from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import sqlite3
import bcrypt
from typing import Optional

router = APIRouter()
DB_PATH = "server/users.db"

class User(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@router.post("/register")
async def register(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")

    if not username or not password or not email:
        raise HTTPException(status_code=400, detail="Username, email, and password required")

    conn = get_db_connection()
    cur = conn.cursor()

    # Check for existing username or email
    cur.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username, email))
    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username or email already exists")

    # Hash password and insert
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    cur.execute(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        (username, email, hashed),
    )
    conn.commit()
    conn.close()

    return {"message": "User registered successfully"}

@router.post("/login")
async def login(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    db_user = cur.fetchone()
    conn.close()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not bcrypt.checkpw(password.encode("utf-8"), db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {"message": "Login successful"}
