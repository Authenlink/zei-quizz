"""
Configuration centrale de l'application.

Charge toutes les variables d'environnement (.env) et définit les constantes
utilisées dans l'ensemble du projet :
- Chemins de fichiers (documents, données)
- Configuration LLM (multi-providers : OpenAI, Anthropic, Mistral, Google)
- Observabilité (Langfuse)
- Base de données PostgreSQL
- API backend externe

Référence déploiement : docs/PLAN_IMPLEMENTATION_DEPLOIEMENT_ETAPE_14.md
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# --- Chargement multi-environnement (section 28.1 du guide) ---
APP_ENV = os.getenv("APP_ENV", "DEVELOPMENT")
_env_file = Path(f".env.{APP_ENV.lower()}")
if _env_file.exists():
    load_dotenv(_env_file)
else:
    load_dotenv()  # Fallback sur .env

# --- Chemins ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

# Créer les répertoires s'ils n'existent pas
DATA_DIR.mkdir(parents=True, exist_ok=True)

# --- LLM ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")  # openai, anthropic, mistral, google
LLM_MODEL = os.getenv("MODEL", "gpt-4o")
# Stratégie de modèles (chapitre 30) : MAIN pour agent principal, NANO pour tâches simples
MAIN_MODEL = os.getenv("MAIN_MODEL", os.getenv("MODEL", "gpt-4o"))
NANO_MODEL = os.getenv("NANO_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL = "text-embedding-3-large"

# --- Observabilité (Langfuse) ---
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_HOST = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")

# --- Serveur API ---
# Railway injecte PORT automatiquement ; fallback sur API_PORT ou 8000
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PORT", os.getenv("API_PORT", "8000")))
API_PREFIX = "/api/v1"

# --- CORS ---
# Origines autorisées en production (virgules) ; vide = valeurs par défaut
_cors_raw = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = (
    [o.strip() for o in _cors_raw.split(",") if o.strip()] if _cors_raw else []
)

# --- Logging ---
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# --- Base de données PostgreSQL ---
# Neon utilise DATABASE_URL, le guide utilise POSTGRESQL_ADDON_URI
_raw_db_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRESQL_ADDON_URI")
DATABASE_URL = _raw_db_url.strip('"').strip("'") if _raw_db_url else None
POSTGRESQL_ADDON_URI = DATABASE_URL  # Alias pour compatibilité avec le guide

# --- Base de données agent (checkpointer LangGraph) ---
# Fallback sur DATABASE_URL si AGENT_DATABASE_URL n'est pas définie
_raw_agent_db_url = os.getenv("AGENT_DATABASE_URL")
AGENT_DATABASE_URL = _raw_agent_db_url.strip('"').strip("'") if _raw_agent_db_url else DATABASE_URL

# --- Monitoring externe ---
SENTRY_DSN = os.getenv("SENTRY_DSN")

# --- Vectorstore (Qdrant) ---
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)

