from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import bcrypt

from server.database import get_db_connection

router = APIRouter()


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
async def register(payload: RegisterRequest):
    username = payload.username
    password = payload.password
    email = payload.email

    if not username or not password or not email:
        raise HTTPException(status_code=400, detail="Username, email, and password required")

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM users WHERE username = %s OR email = %s",
                    (username, email),
                )
                if cur.fetchone():
                    raise HTTPException(
                        status_code=400, detail="Username or email already exists"
                    )

                hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode(
                    "utf-8"
                )
                cur.execute(
                    "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
                    (username, email, hashed),
                )
    finally:
        conn.close()

    return {"message": "User registered successfully"}

@router.post("/login")
async def login(payload: LoginRequest):
    username = payload.username
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, username, email, password FROM users WHERE username = %s",
                (username,),
            )
            db_user = cur.fetchone()
    finally:
        conn.close()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    stored_password = db_user["password"]
    if stored_password is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {"message": "Login successful"}
