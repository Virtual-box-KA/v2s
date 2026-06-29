"""
main.py — FastAPI application entry point.
Wires together all routers, CORS, and static file serving for the React SPA.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routers import auth, issues, admin, ai, stats

app = FastAPI(
    title="Civiverse API",
    description="Civic issue reporting platform backend",
    version="2.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(issues.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(stats.router)

# ── Static files (built React app) ───────────────────────────────────────────
PUBLIC_DIR = Path(__file__).parent.parent / "public"

if PUBLIC_DIR.exists():
    # Mount static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(PUBLIC_DIR / "assets")), name="assets")

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        f = PUBLIC_DIR / "favicon.ico"
        return FileResponse(str(f)) if f.exists() else FileResponse(str(PUBLIC_DIR / "index.html"))

    # SPA catch-all — serve index.html for any non-API route
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(str(PUBLIC_DIR / "index.html"))
