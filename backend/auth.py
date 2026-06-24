import hashlib
import hmac
import json
import os
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

ENV_PATH = Path("/root/apps/DHCPHub/.env")
load_dotenv(ENV_PATH)

ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "admin")
AUTH_SECRET = os.getenv("AUTH_SECRET", "change-me")
TOKEN_TTL = 86400 * 7

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


def _sign(payload: str) -> str:
    sig = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).digest()[:16]
    return urlsafe_b64encode(payload.encode() + b"." + sig).decode()


def _verify(token: str) -> dict | None:
    try:
        raw = urlsafe_b64decode(token.encode())
        dot = raw.rfind(b".")
        if dot == -1:
            return None
        payload_bytes, sig = raw[:dot], raw[dot + 1:]
        expected = hmac.new(AUTH_SECRET.encode(), payload_bytes, hashlib.sha256).digest()[:16]
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(payload_bytes)
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


def create_token(username: str) -> str:
    payload = json.dumps({"sub": username, "exp": int(time.time()) + TOKEN_TTL})
    return _sign(payload)


def verify_token(token: str) -> bool:
    return _verify(token) is not None


@router.post("/login")
async def login(body: LoginRequest):
    if body.username != ADMIN_USER or body.password != ADMIN_PASS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(body.username)
    return {"token": token}


@router.get("/verify")
async def verify(request: Request):
    token = (request.headers.get("authorization") or "").removeprefix("Bearer ").strip()
    if not token or not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True}


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, request: Request):
    global ADMIN_PASS

    token = (request.headers.get("authorization") or "").removeprefix("Bearer ").strip()
    if not token or not verify_token(token):
        raise HTTPException(status_code=401, detail="Not authenticated")

    if body.old_password != ADMIN_PASS:
        raise HTTPException(status_code=400, detail="Password lama salah")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")

    try:
        lines = ENV_PATH.read_text().splitlines()
        new_lines = []
        for line in lines:
            if line.startswith("ADMIN_PASS="):
                new_lines.append(f"ADMIN_PASS={body.new_password}")
            else:
                new_lines.append(line)
        ENV_PATH.write_text("\n".join(new_lines) + "\n")
        ADMIN_PASS = body.new_password
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal update password: {e}")

    return {"message": "Password berhasil diubah"}
