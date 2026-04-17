"""
Gestion du pool PostgreSQL et du checkpointer LangGraph.

Expose deux singletons globaux et un context manager `checkpointer_lifespan`
à imbriquer dans le lifespan FastAPI.

Références : docs/05_memoire_persistance.md — Chapitre 18.2
"""

from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.core.config import AGENT_DATABASE_URL

_checkpointer_instance: AsyncPostgresSaver | None = None
_db_pool_instance: AsyncConnectionPool | None = None


@asynccontextmanager
async def checkpointer_lifespan():
    """Gère le cycle de vie du pool et du checkpointer (à imbriquer dans le lifespan FastAPI)."""
    global _checkpointer_instance, _db_pool_instance
    connection_kwargs = {"autocommit": True, "row_factory": dict_row}
    async with AsyncConnectionPool(
        conninfo=AGENT_DATABASE_URL,
        kwargs=connection_kwargs,
        min_size=2,
        max_size=25,
        max_idle=120,
        check=AsyncConnectionPool.check_connection,
    ) as db_pool:
        _db_pool_instance = db_pool
        _checkpointer_instance = AsyncPostgresSaver(conn=db_pool)
        await _checkpointer_instance.setup()  # Crée les tables si elles n'existent pas
        print("Checkpointer PostgreSQL initialisé.")
        try:
            yield
        finally:
            _checkpointer_instance = None
            _db_pool_instance = None
            print("Checkpointer arrêté.")


def get_checkpointer() -> AsyncPostgresSaver:
    if _checkpointer_instance is None:
        raise RuntimeError("Checkpointer non disponible — vérifier le lifespan.")
    return _checkpointer_instance


def get_db_pool() -> AsyncConnectionPool:
    if _db_pool_instance is None:
        raise RuntimeError("DB Pool non disponible — vérifier le lifespan.")
    return _db_pool_instance
