import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel

from app.api import admin, matches, players, rankings
from app.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure DB tables exist on startup (especially for SQLite local dev)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


app = FastAPI(
    title="Quaveo Chess Club Rating API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(players.router)
app.include_router(rankings.router)
app.include_router(matches.router)
app.include_router(admin.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Serve static React SPA assets if directory exists (Production Docker build)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if not os.path.exists(static_dir):
    # Check alternate build path
    static_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")

if os.path.exists(static_dir):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(static_dir, "assets")),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path == "health":
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
