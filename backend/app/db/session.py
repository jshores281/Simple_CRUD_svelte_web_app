import asyncio
import logging
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.db.base import Base

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

INIT_DB_ATTEMPTS = 10
INIT_DB_RETRY_DELAY_SECONDS = 1.0


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields a session and closes it afterwards."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create the tables, retrying while Postgres finishes starting up."""
    # Importing the models registers them on Base.metadata before create_all runs.
    from app import models  # noqa: F401

    last_error: Exception | None = None
    for attempt in range(1, INIT_DB_ATTEMPTS + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as exc:  # noqa: BLE001 - any driver/connection error is retryable here
            last_error = exc
            logger.warning(
                "Database not ready (attempt %s/%s): %s", attempt, INIT_DB_ATTEMPTS, exc
            )
            await asyncio.sleep(INIT_DB_RETRY_DELAY_SECONDS)

    raise RuntimeError(f"Could not initialise the database: {last_error}")
