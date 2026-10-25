import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_cache import FastAPICache
from sqlalchemy import text
from sqlmodel import SQLModel

from app.api import admin, auth, challenges, matches, players, push, rankings
from app.config import settings
from app.database import engine


async def ensure_schema_upgrades() -> None:
    """Idempotent DDL for deployments whose DB was created via create_all
    (alembic may not have run there). Safe to execute on every startup."""
    async with engine.begin() as conn:
        if conn.dialect.name == "sqlite":
            columns = await conn.execute(text("PRAGMA table_info(challenge)"))
            has_match_id = any(row[1] == "match_id" for row in columns.fetchall())
            if not has_match_id:
                await conn.execute(text("ALTER TABLE challenge ADD COLUMN match_id INTEGER"))
            player_columns = await conn.execute(text("PRAGMA table_info(player)"))
            has_email = any(row[1] == "email" for row in player_columns.fetchall())
            if not has_email:
                await conn.execute(text("ALTER TABLE player ADD COLUMN email VARCHAR"))
        else:
            # Postgres & MySQL support IF NOT EXISTS for ADD COLUMN
            await conn.execute(
                text("ALTER TABLE challenge ADD COLUMN IF NOT EXISTS match_id INTEGER")
            )
            await conn.execute(
                text("ALTER TABLE player ADD COLUMN IF NOT EXISTS email VARCHAR")
            )
        # Unique index on email (partial: NULLs allowed for password-only accounts)
        await conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_player_email_unique "
                "ON player (email) WHERE email IS NOT NULL"
            )
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure DB tables exist on startup (especially for SQLite local dev)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    await ensure_schema_upgrades()

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
    title="Quachess Rating API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for the Vite dev server (prod SPA is same-origin and needs no CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(players.router)
app.include_router(rankings.router)
app.include_router(matches.router)
app.include_router(admin.router)
app.include_router(challenges.router)
app.include_router(push.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Serve static React SPA assets if directory exists (Production Docker build)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if not os.path.exists(static_dir):
    # Check alternate build path
    static_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")

assets_dir = os.path.join(static_dir, "assets")
if os.path.exists(static_dir) and os.path.exists(assets_dir):
    app.mount(
        "/assets",
        StaticFiles(directory=assets_dir),
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
