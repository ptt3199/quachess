import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel

from app.api import admin, matches, players, rankings
from app.config import settings
from app.database import engine
from fastapi_cache import FastAPICache


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure DB tables exist on startup (especially for SQLite local dev)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # Initialize Cache
    if settings.REDIS_URL:
        try:
            import redis.asyncio as aioredis
            from fastapi_cache.backends.redis import RedisBackend
            redis_client = aioredis.from_url(
                settings.REDIS_URL, encoding="utf8", decode_responses=True
            )
            # Ping Redis to verify connection
            await redis_client.ping()
            FastAPICache.init(RedisBackend(redis_client), prefix="quaveo-chess-cache")
            print("FastAPICache initialized with Redis backend.")
        except Exception as e:
            print(f"Failed to connect to Redis: {e}. Falling back to InMemoryBackend.")
            from fastapi_cache.backends.inmemory import InMemoryBackend
            FastAPICache.init(InMemoryBackend(), prefix="quaveo-chess-cache")
    else:
        from fastapi_cache.backends.inmemory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="quaveo-chess-cache")
        print("FastAPICache initialized with InMemory backend.")

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
