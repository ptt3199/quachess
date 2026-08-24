from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "postgresql+asyncpg://" in url:
        # asyncpg dialect expects 'ssl' instead of 'sslmode' and ignores 'channel_binding'
        parsed = urlparse(url)
        if parsed.query:
            query_params = parse_qs(parsed.query)
            new_params = {}
            for k, v in query_params.items():
                if k == "sslmode":
                    new_params["ssl"] = v
                elif k == "channel_binding":
                    continue
                else:
                    new_params[k] = v
            new_query = urlencode(new_params, doseq=True)
            url = urlunparse(parsed._replace(query=new_query))

    return url


db_url = normalize_database_url(settings.DATABASE_URL)

# Connect args for SQLite if needed
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
