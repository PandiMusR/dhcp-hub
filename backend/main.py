from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from auth import router as auth_router, verify_token
from database import init_db
from routers import config, hotspots, leases, reservations, system, wireguard

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="DHCP Hub", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_PATHS = {"/api/auth/login", "/api/health"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api") and path not in PUBLIC_PATHS and not path.startswith("/api/auth/"):
        token = (request.headers.get("authorization") or "").removeprefix("Bearer ").strip()
        if not token or not verify_token(token):
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    return await call_next(request)


app.include_router(auth_router)
app.include_router(hotspots.router)
app.include_router(reservations.router)
app.include_router(leases.router)
app.include_router(config.router)
app.include_router(wireguard.router)
app.include_router(system.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = DIST_DIR / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(DIST_DIR / "index.html")
