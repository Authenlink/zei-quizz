"""
Point d'entrée de l'application.

Initialise FastAPI avec :
- Le cycle de vie (lifespan) pour le pool PostgreSQL et les agents
- Les middlewares CORS
- Les routeurs API
"""

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.factory import AgentFactory
from app.agents.registry import get_agent_configs
from app.api.routes import agents, base
from app.core.checkpointer_manager import checkpointer_lifespan
from app.core.config import (
    API_HOST,
    API_PORT,
    API_PREFIX,
    APP_ENV,
    CORS_ORIGINS,
    SENTRY_DSN,
)

# --- Monitoring Sentry (optionnel - ignoré si non configuré ou placeholder) ---
IS_PRODUCTION = APP_ENV in ["PRODUCTION", "STAGING"]
SENTRY_DSN_VALID = (
    SENTRY_DSN
    and isinstance(SENTRY_DSN, str)
    and len(SENTRY_DSN) > 20
    and "..." not in SENTRY_DSN
    and SENTRY_DSN.startswith("https://")
)

if SENTRY_DSN_VALID:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=APP_ENV,
        traces_sample_rate=0.1 if IS_PRODUCTION else 1.0,
        profiles_sample_rate=0.1 if IS_PRODUCTION else 1.0,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        default_integrations=False,
        enable_tracing=True,
        send_default_pii=False,
    )


# --- Cycle de vie de l'application ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère le cycle de vie : initialise les ressources au démarrage,
    les libère à l'arrêt.
    """
    # === DÉMARRAGE ===
    print(f"Démarrage de l'application (env: {APP_ENV})")

    async with checkpointer_lifespan():
        try:
            configs = {c.name: c for c in get_agent_configs()}
            app.state.agent_factory = AgentFactory(configs=configs)
            print("AgentFactory initialisée.")
        except Exception as e:
            if SENTRY_DSN_VALID:
                import sentry_sdk

                sentry_sdk.capture_exception(e)
            raise

        yield  # L'application tourne ici

    # === ARRÊT ===
    print("Arrêt de l'application.")


# --- Application FastAPI ---
app = FastAPI(
    title="MonApp IA - API",
    version="1.0.0",
    description="API IA conversationnelle",
    lifespan=lifespan,
)

# --- CORS ---
if IS_PRODUCTION:
    allow_origins = (
        CORS_ORIGINS
        if CORS_ORIGINS
        else [
            "https://monapp.com",
            "https://app.monapp.com",
            "https://api.monapp.com",
        ]
    )
else:
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routeurs ---
app.include_router(base.router, prefix=API_PREFIX, tags=["Chat"])
app.include_router(agents.router, prefix=API_PREFIX + "/agent", tags=["Agents"])


@app.get("/", tags=["Root"])
@app.get("/health", tags=["Root"])
async def root():
    """Health check pour Railway et monitoring."""
    return {"status": "ok", "env": APP_ENV}


@app.get("/health/ready", tags=["Root"])
async def readiness():
    """Readiness : vérifie que la DB (checkpointer) est accessible."""
    from fastapi import HTTPException

    try:
        from app.core.checkpointer_manager import get_db_pool

        pool = get_db_pool()
        async with pool.connection() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# --- Démarrage direct ---
if __name__ == "__main__":
    uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)
