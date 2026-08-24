import pytest
from sqlmodel import SQLModel, delete
from app.database import async_session_maker, engine
from app.models import Match, Player, RatingHistory, Challenge
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend


@pytest.fixture(scope="session", autouse=True)
def setup_cache():
    FastAPICache.init(InMemoryBackend(), prefix="test-cache")


@pytest.fixture(autouse=True)
async def setup_test_database():
    async with engine.begin() as conn:
        # Create all tables including challenge
        await conn.run_sync(SQLModel.metadata.create_all)

    async with async_session_maker() as db:
        # Clean all tables before each test
        await db.execute(delete(Challenge))
        await db.execute(delete(RatingHistory))
        await db.execute(delete(Match))
        await db.execute(delete(Player))
        await db.commit()
    yield
