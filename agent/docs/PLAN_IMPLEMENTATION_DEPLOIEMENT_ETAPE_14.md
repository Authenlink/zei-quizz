# Plan d'implémentation — Étape 14 : Déploiement

> **Document récapitulatif complet** pour déployer un agent IA LangChain/FastAPI en production (Railway ou autre PaaS).

**Références** : `STEPS.md` (étape 14), `docs/08_deploiement.md` (chapitres 28, 29, 30), `PROMPT_ETAPE_14_DEPLOIEMENT.md`, `langchain_guide.md`.

---

## Démarrage rapide (ordre d'implémentation)

| # | Bloc | Fichiers | Priorité |
|---|------|----------|----------|
| 1 | Config multi-environnement | `app/core/config.py` | Obligatoire |
| 2 | Dockerfile + .dockerignore | Racine projet | Obligatoire |
| 3 | CORS conditionnel | `app/main.py` | Obligatoire |
| 4 | Rate limiting | `rate_limiter.py` + routes | Obligatoire |
| 5 | Stratégie modèles (MAIN/NANO) | `app/core/config.py`, `llm.py` | Recommandé |
| 6 | Health check | `app/main.py` | Obligatoire |
| 7 | Variables Railway / PaaS | `.env.example`, README | Obligatoire |

---

## 1. Configuration multi-environnement

### 1.1 Objectif

Charger le bon fichier `.env` selon `APP_ENV` : `.env.development`, `.env.staging`, `.env.production`. En production, les variables sont injectées par la plateforme (Railway, etc.) — le fichier `.env` n'existe pas.

### 1.2 Pattern de chargement

```python
# app/core/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Chargement multi-environnement (section 28.1 du guide)
APP_ENV = os.getenv("APP_ENV", "DEVELOPMENT")
_env_file = f".env.{APP_ENV.lower()}"
if Path(_env_file).exists():
    load_dotenv(_env_file)
else:
    load_dotenv()  # Fallback sur .env
```

### 1.3 Structure des fichiers .env

```
projet/
├── .env.development   # Local (optionnel, non versionné)
├── .env.staging       # Staging (optionnel, non versionné)
├── .env.production    # Production (optionnel, non versionné)
├── .env.example       # Template (versionné)
└── .env               # Lien symbolique ou copie locale (non versionné)
```

### 1.4 Exemple .env.development

```env
APP_ENV=DEVELOPMENT
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-dev-...
MODEL=gpt-4o-mini
DATABASE_URL=postgresql://localhost:5432/monapp_dev
EXTERNAL_API_URL=http://localhost:8080
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
```

### 1.5 Exemple .env.production (template pour Railway)

```env
APP_ENV=PRODUCTION
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-prod-...
MODEL=gpt-4o
DATABASE_URL=postgresql://...
EXTERNAL_API_URL=https://api.monapp.com
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
SENTRY_DSN=https://...@sentry.io/...
CORS_ORIGINS=https://app.monapp.com,https://api.monapp.com
```

---

## 2. Dockerfile

### 2.1 Dockerfile complet

```dockerfile
# Dockerfile pour déploiement Railway / PaaS
# Référence : docs/08_deploiement.md

FROM python:3.11-slim

WORKDIR /app

# Dépendances d'abord (cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code source
COPY . .

# Railway injecte PORT automatiquement
EXPOSE 8000

# Pas de --reload en production
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

### 2.2 Points critiques

| Règle | Raison |
|-------|--------|
| **Pas de `--reload`** | En prod, uvicorn ne doit pas surveiller les fichiers |
| **`PORT` via variable** | Railway injecte `PORT` ; fallback `8000` si absent |
| **`python:3.11-slim`** | Aligner sur la version du projet (3.11 ou 3.12) |
| **`COPY` en deux étapes** | `requirements.txt` d'abord → cache Docker optimisé |

### 2.3 Multi-stage (optionnel, pour image plus légère)

```dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

---

## 3. .dockerignore

### 3.1 Contenu complet

```dockerignore
# .dockerignore — exclure fichiers sensibles et inutiles
# Référence : docs/08_deploiement.md

.env
.env.*
!.env.example

keys/
tests/
__pycache__/
*.pyc
*.pyo
.pytest_cache/
.coverage
htmlcov/

.git/
.gitignore
.cursorrules
*.md
!README.md

data/
*.log
.DS_Store

venv/
.venv/
env/
```

### 3.2 Règles essentielles

| Exclusion | Raison |
|-----------|--------|
| `.env`, `.env.*` | Secrets — jamais dans l'image |
| `keys/` | Clés JWT, certificats |
| `tests/` | Réduit la taille de l'image |
| `data/` | Données volumineuses, souvent locales |
| `__pycache__/`, `*.pyc` | Inutiles dans le conteneur |

---

## 4. Configuration serveur (PORT, CORS)

### 4.1 Port dynamique

Railway et la plupart des PaaS injectent `PORT`. La config doit le prendre en compte :

```python
# app/core/config.py
# Railway injecte PORT automatiquement ; fallback sur API_PORT ou 8000
API_PORT = int(os.getenv("PORT", os.getenv("API_PORT", "8000")))
API_HOST = os.getenv("API_HOST", "0.0.0.0")
```

### 4.2 CORS conditionnel

```python
# app/core/config.py
_cors_raw = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()] if _cors_raw else []
```

```python
# app/main.py
from app.core.config import APP_ENV, CORS_ORIGINS

IS_PRODUCTION = APP_ENV in ["PRODUCTION", "STAGING"]

if IS_PRODUCTION:
    allow_origins = CORS_ORIGINS if CORS_ORIGINS else [
        "https://monapp.com",
        "https://app.monapp.com",
        "https://api.monapp.com",
    ]
else:
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4.3 Points CORS

- **`allow_credentials=True`** : incompatible avec `["*"]` en prod (spéc CORS)
- **Lister chaque domaine** : pas de wildcards (ex. `*.monapp.com` non supporté)
- **Inclure staging** : si le frontend staging appelle l'API staging

---

## 5. Rate limiting

### 5.1 Module complet

```python
# app/api/middleware/rate_limiter.py
"""
Rate limiter simple basé sur un cache en mémoire.

Limite le nombre de requêtes par customer_id ou par IP sur une fenêtre glissante.
Sans auth JWT : utilise customer_id si fourni, sinon IP client.
Pour un déploiement multi-instances, utiliser Redis à la place du dict.
Référence : docs/08_deploiement.md chapitre 29.4
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request

# Configuration (configurable via variables d'environnement)
MAX_REQUESTS_PER_MINUTE = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "20"))
WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
WINDOW_SIZE = timedelta(seconds=WINDOW_SECONDS)

_rate_limit_cache: dict[str, list] = {}


def _get_client_key(customer_id: Optional[str], request: Request) -> str:
    """Identifiant unique pour le rate limit : customer_id ou IP."""
    if customer_id and str(customer_id).strip():
        return f"customer:{customer_id}"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}"


async def check_rate_limit(
    customer_id: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    """
    Vérifie que le client n'a pas dépassé la limite de requêtes.
    Lève HTTPException 429 si la limite est atteinte.
    """
    if request is None:
        return

    key = _get_client_key(customer_id, request)
    now = datetime.now()

    if key in _rate_limit_cache:
        last_reset, count = _rate_limit_cache[key]

        if (now - last_reset) >= WINDOW_SIZE:
            _rate_limit_cache[key] = [now, 1]
            return

        if count >= MAX_REQUESTS_PER_MINUTE:
            retry_after = int((WINDOW_SIZE - (now - last_reset)).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Trop de requêtes. Réessayez dans {retry_after} secondes.",
                headers={"Retry-After": str(max(1, retry_after))},
            )

        _rate_limit_cache[key][1] += 1
    else:
        _rate_limit_cache[key] = [now, 1]
```

### 5.2 Utilisation dans les routes

```python
# app/api/routes/agents.py
from app.api.middleware.rate_limiter import check_rate_limit

@router.post("/assistant")
async def chat_with_agent(
    input: ChatInput,
    request: Request,
    ...
):
    await check_rate_limit(customer_id=input.customer_id, request=request)
    # ... suite du traitement
```

### 5.3 Variante avec auth JWT

Si le projet utilise `get_current_user` :

```python
async def check_rate_limit(user: AuthUser = Depends(get_current_user)) -> None:
    # ...
    user_key = str(user.id)
```

### 5.4 Multi-instances : Redis

Pour un déploiement multi-conteneurs, remplacer le dict par Redis :

```python
# Exemple avec Redis (INCR + EXPIRE)
import redis
r = redis.Redis()

key = f"rate:{user_key}"
count = r.incr(key)
if count == 1:
    r.expire(key, WINDOW_SECONDS)
if count > MAX_REQUESTS_PER_MINUTE:
    raise HTTPException(status_code=429, ...)
```

### 5.5 Variables d'environnement

```env
RATE_LIMIT_MAX_REQUESTS=20
RATE_LIMIT_WINDOW_SECONDS=60
```

---

## 6. Stratégie de modèles (MAIN_MODEL / NANO_MODEL)

### 6.1 Configuration

```python
# app/core/config.py
# Stratégie de modèles (chapitre 30) : MAIN pour agent principal, NANO pour tâches simples
MAIN_MODEL = os.getenv("MAIN_MODEL", os.getenv("MODEL", "gpt-4o"))
NANO_MODEL = os.getenv("NANO_MODEL", "gpt-4o-mini")
```

### 6.2 Utilisation

| Cas d'usage | Modèle | Justification |
|-------------|--------|---------------|
| Agent conversationnel principal | `MAIN_MODEL` | Raisonnement, contexte long, tool calling |
| Résumé de conversation | `NANO_MODEL` | Tâche structurée, pas de raisonnement complexe |
| Classification, extraction | `NANO_MODEL` | Sortie courte, déterministe |
| Génération d'emails | `MAIN_MODEL` | Qualité rédactionnelle |

```python
# app/core/llm.py
def get_openai_llm(
    model: str = None,
    ...
):
    from app.core.config import MAIN_MODEL
    model = model or MAIN_MODEL
    return ChatOpenAI(model=model, ...)

# Pour les résumés
from app.core.config import NANO_MODEL
summary_llm = get_openai_llm(model=NANO_MODEL, streaming=False, temperature=0.0)
```

---

## 7. Health check

### 7.1 Endpoint minimal

```python
# app/main.py
@app.get("/", tags=["Root"])
@app.get("/health", tags=["Root"])
async def root():
    """Health check pour Railway et monitoring."""
    return {"status": "ok", "env": APP_ENV}
```

### 7.2 Readiness (optionnel)

Si Railway ou le load balancer doit vérifier la connexion DB :

```python
@app.get("/health/ready", tags=["Root"])
async def readiness():
    """Readiness : vérifie que la DB est accessible."""
    try:
        pool = get_db_pool()
        async with pool.connection() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
```

---

## 8. Pool de connexions PostgreSQL

### 8.1 Checkpointer (référence actuelle)

```python
# app/core/checkpointer_manager.py
async with AsyncConnectionPool(
    conninfo=AGENT_DATABASE_URL,
    kwargs={"autocommit": True, "row_factory": dict_row},
    min_size=2,
    max_size=25,
    max_idle=120,
    check=AsyncConnectionPool.check_connection,
) as db_pool:
    # ...
```

### 8.2 Dimensionnement

- **Workers uvicorn** : règle empirique `2 * CPU + 1` pour I/O bound
- **Connexions totales** : `workers × max_size` — vérifier la limite PostgreSQL (défaut 100)
- **Exemple** : 4 workers × 25 = 100 connexions max

---

## 9. Procfile (Heroku / Railway sans Docker)

Si la plateforme utilise un Procfile au lieu du Dockerfile :

```procfile
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Pas de `--reload`** en production.

---

## 10. Variables d'environnement — Inventaire complet

### 10.1 Obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Clé API OpenAI | `sk-...` |
| `DATABASE_URL` | URL PostgreSQL | `postgresql://...` |
| `EXTERNAL_API_URL` | URL API backend | `https://api.monapp.com` |
| `APP_ENV` | Environnement | `PRODUCTION` |
| `CORS_ORIGINS` | Origines autorisées (virgules) | `https://app.example.com,https://api.example.com` |

### 10.2 Optionnelles (avec défaut)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `8000` | Injecté par Railway |
| `AGENT_DATABASE_URL` | `DATABASE_URL` | Base checkpointer |
| `QDRANT_URL` | `http://localhost:6333` | Vectorstore |
| `QDRANT_API_KEY` | — | Si Qdrant cloud |
| `MAIN_MODEL` | `gpt-4o` | Modele agent principal |
| `NANO_MODEL` | `gpt-4o-mini` | Modele tâches simples |
| `RATE_LIMIT_MAX_REQUESTS` | `20` | Requêtes max par fenêtre |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Fenêtre en secondes |
| `LOG_LEVEL` | `INFO` | Niveau de log |

### 10.3 Observabilité

| Variable | Description |
|----------|-------------|
| `LANGFUSE_SECRET_KEY` | Clé secrète Langfuse |
| `LANGFUSE_PUBLIC_KEY` | Clé publique Langfuse |
| `LANGFUSE_BASE_URL` | URL Langfuse (cloud ou self-hosted) |
| `SENTRY_DSN` | DSN Sentry |

### 10.4 .env.example complet

```env
# === OBLIGATOIRE ===
OPENAI_API_KEY=sk-...
APP_ENV=PRODUCTION
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
EXTERNAL_API_URL=https://api.monapp.com
CORS_ORIGINS=https://app.monapp.com,https://api.monapp.com

# === Environnement et serveur ===
PORT=8000
API_HOST=0.0.0.0
API_PORT=8000

# === Base de données ===
# AGENT_DATABASE_URL=postgresql://... (optionnel, fallback sur DATABASE_URL)

# === Stratégie de modèles ===
MODEL=gpt-4o
MAIN_MODEL=gpt-4o
NANO_MODEL=gpt-4o-mini

# === Vectorstore Qdrant ===
QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY=

# === Observabilité ===
# LANGFUSE_SECRET_KEY=sk-lf-...
# LANGFUSE_PUBLIC_KEY=pk-lf-...
# LANGFUSE_BASE_URL=https://cloud.langfuse.com
# SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# === Rate limiting ===
# RATE_LIMIT_MAX_REQUESTS=20
# RATE_LIMIT_WINDOW_SECONDS=60

# === Logging ===
# LOG_LEVEL=INFO
```

---

## 11. Déploiement Railway — Procédure

### 11.1 Étapes

1. **Connexion GitHub** : Connecter le dépôt à Railway
2. **Détection** : Railway détecte le `Dockerfile` et build automatiquement
3. **Variables** : Configurer toutes les variables dans le dashboard Railway
4. **PostgreSQL** : Ajouter un service PostgreSQL (Neon ou Railway)
5. **Déploiement** : Push sur `main` → déploiement automatique

### 11.2 Test local avant déploiement

```bash
# Build
docker build -t mon-agent .

# Run avec variables
docker run -p 8000:8000 --env-file .env mon-agent

# Vérifier le health check
curl http://localhost:8000/health
```

---

## 12. Checklist finale avant déploiement

### 12.1 Configuration

- [ ] Chargement multi-env selon `APP_ENV` dans `config.py`
- [ ] `PORT` lu depuis `os.getenv("PORT", "8000")`
- [ ] `CORS_ORIGINS` configurable (liste séparée par virgules)
- [ ] `MAIN_MODEL` et `NANO_MODEL` définis

### 12.2 Sécurité

- [ ] CORS : origines restreintes en production (pas `*`)
- [ ] Rate limiting actif sur les endpoints agents
- [ ] Secrets : jamais en clair, tout via variables d'environnement
- [ ] Sentry : `send_default_pii=False`

### 12.3 Docker

- [ ] Dockerfile : pas de `--reload`, port via `PORT`
- [ ] `.dockerignore` : exclut `.env`, `keys/`, `tests/`
- [ ] Image buildée et testée localement

### 12.4 Monitoring

- [ ] Health check : `GET /` ou `GET /health` fonctionnel
- [ ] Langfuse : clés configurées en prod
- [ ] Sentry : DSN configuré, `traces_sample_rate=0.1`

### 12.5 Logs

- [ ] `LOG_LEVEL=INFO` en production (pas `DEBUG`)

---

## 13. Fichiers à créer ou modifier — Récapitulatif

| Fichier | Action |
|---------|--------|
| `app/core/config.py` | Modifier : multi-env, PORT, CORS_ORIGINS, MAIN_MODEL, NANO_MODEL |
| `app/main.py` | Modifier : CORS conditionnel, health check |
| `app/api/middleware/rate_limiter.py` | Créer |
| `app/api/routes/agents.py` | Modifier : `check_rate_limit` sur les endpoints |
| `Dockerfile` | Créer |
| `.dockerignore` | Créer |
| `.env.example` | Compléter (toutes les variables) |
| `Procfile` | Créer (si Heroku / Railway sans Docker) |
| `README.md` | Mettre à jour (section déploiement) |

---

## 14. Références rapides

- **Guide déploiement** : `docs/08_deploiement.md` (chapitres 28 à 30)
- **STEPS.md** : étape 14
- **Sécurité** : chapitre 29 (CORS, rate limiting, JWT)
- **Optimisation coûts** : chapitre 30 (stratégie modèles)
- **Code de référence** : `app/core/config.py`, `app/main.py`, `app/api/middleware/rate_limiter.py`, `Dockerfile`
