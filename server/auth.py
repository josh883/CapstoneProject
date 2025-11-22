# server/auth.py
from fastapi import APIRouter, HTTPException, Response, Request
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
async def login(payload: LoginRequest, response: Response):
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

    # Set HttpOnly cookie to identify the session user on subsequent requests
    response.set_cookie(
        key="session_user",
        value=db_user["username"],
        httponly=True,
        samesite="lax",
        path="/",
    )

    return {"message": "Login successful", "username": db_user["username"]}


# ---------------------------
# PATCH /update-user
# ---------------------------
from typing import Optional
from fastapi import Body

class UpdateUserPayload(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


@router.patch("/update-user")
async def update_user(request: Request, response: Response, payload: UpdateUserPayload = Body(...)):
    session_user = request.cookies.get("session_user")
    if not session_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    new_email = payload.email.strip() if payload.email else None
    new_password = payload.password if payload.password else None

    if not any([new_email, new_password]):
        raise HTTPException(status_code=400, detail="No fields provided to update")

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                if new_email:
                    cur.execute(
                        "SELECT 1 FROM users WHERE email = %s AND username != %s",
                        (new_email, session_user)
                    )
                    if cur.fetchone():
                        raise HTTPException(status_code=400, detail="Email already taken")

                updates = []
                params = []

                if new_email:
                    updates.append("email = %s")
                    params.append(new_email)
                if new_password:
                    hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                    updates.append("password = %s")
                    params.append(hashed)

                if updates:
                    params.append(session_user)  # WHERE username = %s
                    query = f"UPDATE users SET {', '.join(updates)} WHERE username = %s"
                    cur.execute(query, tuple(params))
    finally:
        conn.close()

    return {"message": "Updated successfully", "username": session_user}
