# Plan d'implémentation — Langfuse & Sentry (Étapes 13 & 14)

> **Document récapitulatif** pour répliquer l'observabilité (Langfuse + Sentry) et le déploiement dans un autre template d'agent IA LangChain/FastAPI.

**Références** : `STEPS.md` (étapes 13 et 14), `docs/07_observabilite.md`, `docs/08_deploiement.md`, `langchain_guide.md`.

---

## Démarrage rapide (ordre recommandé)

1. **Dépendances** : ajouter `langfuse==3.10.0` et `sentry-sdk==2.45.0` dans `requirements.txt`
2. **Config** : ajouter les variables dans `app/core/config.py` (LANGFUSE_*, SENTRY_DSN)
3. **Monitoring** : copier `app/core/monitoring.py` depuis ce projet
4. **Sentry** : ajouter le bloc d'init Sentry dans `app/main.py` (avant la création de l'app FastAPI)
5. **Routes** : remplacer les appels directs à l'agent par `monitored_ainvoke` ou `monitored_astream`
6. **Lifespan** : ajouter `sentry_sdk.capture_exception(e)` dans le `except` du lifespan
7. **Variables** : documenter dans `.env.example`

---

## 1. Vue d'ensemble

| Étape | Objectif | Fichiers clés |
|-------|----------|---------------|
| **13** | Observabilité : tracing LLM (Langfuse) + monitoring erreurs (Sentry) | `app/core/monitoring.py`, `app/main.py`, `app/core/config.py` |
| **14** | Déploiement : config multi-env, CORS, rate limiting, Docker | `app/core/config.py`, `app/main.py`, `Dockerfile`, `app/api/middleware/rate_limiter.py` |

**Complémentarité Langfuse / Sentry** :
- **Langfuse** : "L'agent a-t-il bien fait son travail ?" (qualité, coûts, latence LLM, tool calls)
- **Sentry** : "L'application a-t-elle planté ?" (exceptions, erreurs HTTP, timeouts)

---

## 2. Langfuse — Implémentation complète

### 2.1 Dépendances

```txt
# requirements.txt
langfuse==3.10.0
```

### 2.2 Variables d'environnement

```env
# .env.example
# === Observabilité Langfuse ===
# LANGFUSE_SECRET_KEY=sk-lf-...
# LANGFUSE_PUBLIC_KEY=pk-lf-...
# LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

### 2.3 Configuration dans `app/core/config.py`

```python
# --- Observabilité (Langfuse) ---
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_HOST = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")
```

### 2.4 Module `app/core/monitoring.py`

**Rôle** : Couche d'abstraction entre le code applicatif et Langfuse. Si les clés sont absentes, tout dégrade silencieusement vers l'invocation directe sans tracing.

**Structure du fichier** :

| Fonction | Usage |
|----------|-------|
| `get_langfuse_handler(...)` | Crée un `CallbackHandler` Langfuse avec session, tags, metadata |
| `get_monitored_config(...)` | Enrichit une config LangChain avec le handler (fusion non destructive) |
| `trace_context()` / `async_trace_context()` | Context managers pour propager les attributs via `propagate_attributes` |
| `monitored_invoke()` | Invocation **synchrone** avec tracing |
| `monitored_ainvoke()` | Invocation **asynchrone** avec tracing |
| `monitored_astream()` | **Streaming** asynchrone avec tracing |

**Points clés** :
- **Activation conditionnelle** : `_LANGFUSE_ENABLED = bool(LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY)`
- **Configuration post-init** : Le `CallbackHandler` Langfuse 3.x est configuré après création (session_id, tags, metadata, user_id)
- **`user_id`** dans Langfuse = identifiant métier (customer_id, project_id, etc.)
- **`session_id`** : convention `{type_agent}-{identifiant}` (ex. `investor-{customer_id}`)
- **Tags** : `APP_ENV` + tags métier (ex. `["investor", "assistant", "standard"]`)
- **Streaming** : `propagate_attributes` doit englober **toute** la boucle `async for`, pas seulement l'appel initial

**Code complet** : Voir `app/core/monitoring.py` du projet Bricks-Langchain-Agent (≈ 285 lignes).

### 2.5 Utilisation dans les routes agents

**Exemple (invocation async)** :

```python
from app.core.monitoring import monitored_ainvoke

# Convention session_id : {type_agent}-{conversation_id} ou {type_agent}-{customer_id}
trace_session_id = f"investor-{input.conversation_id}" if input.conversation_id else f"investor-{input.customer_id}"

result = await monitored_ainvoke(
    agent=agent,
    input={"messages": messages},
    project_id=input.customer_id,      # → user_id dans Langfuse
    session_id=trace_session_id,
    trace_name="Investor Assistant",
    tags=["investor", "assistant", mode],
    metadata={"mode": mode, "current_date": context.current_date},
    config=invoke_config,             # thread_id, checkpointer, etc.
)
```

**Exemple (streaming)** :

```python
from app.core.monitoring import monitored_astream

async for chunk in monitored_astream(
    agent=agent,
    input={"messages": messages},
    project_id=project_id,
    session_id=f"plan-{project_id}",
    trace_name="Plan Agent Stream",
    tags=["plan", "streaming"],
    config={"configurable": {"thread_id": thread_id}},
):
    yield format_sse_chunk(chunk)
```

### 2.6 Metadata et tags recommandés

| Donnée | Où la placer | Pourquoi |
|--------|--------------|----------|
| `project_id` / `customer_id` | `user_id` (project_id) | Filtrer les traces par projet/utilisateur |
| `session_id` | `session_id` | Regrouper les échanges d'une conversation |
| `subscription_type` | `metadata` + tag | Comparer usage free vs premium |
| `trace_name` + nom agent | tag | Identifier quel agent consomme le plus |
| `APP_ENV` | tag (automatique) | Séparer dev/staging/prod |

---

## 3. Sentry — Implémentation complète

### 3.1 Dépendances

```txt
# requirements.txt
sentry-sdk==2.45.0
```

### 3.2 Variables d'environnement

```env
# .env.example
# === Monitoring Sentry ===
# SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 3.3 Configuration dans `app/core/config.py`

```python
# --- Monitoring externe ---
SENTRY_DSN = os.getenv("SENTRY_DSN")
```

### 3.4 Initialisation dans `app/main.py`

**Règles** :
- Sentry est **optionnel** : si `SENTRY_DSN` est absent, vide, ou placeholder (`...`), on n'initialise pas
- **RGPD** : `send_default_pii=False` (obligatoire)
- **Échantillonnage** : 100% en dev, 10% en prod pour ne pas exploser les quotas
- **Transaction style** : `"endpoint"` pour nommer les transactions par route (évite explosion de cardinalité)

```python
# app/main.py
from app.core.config import APP_ENV, SENTRY_DSN

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
        enable_tracing=True,
        send_default_pii=False,
    )
```

### 3.5 Capture manuelle dans le lifespan

Pour les erreurs d'initialisation (ex. AgentFactory, checkpointer) qui ne remontent pas via FastAPI :

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # ... initialisation (checkpointer, AgentFactory, etc.)
        app.state.agent_factory = AgentFactory(...)
    except Exception as e:
        if SENTRY_DSN_VALID:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        raise
    yield
```

**Important** : Ne pas doubler la capture pour les erreurs HTTP standard (401, 404, 422) — Sentry les capture déjà via l'intégration FastAPI.

---

## 4. Étape 14 — Déploiement (résumé)

### 4.1 Configuration multi-environnement

```python
# app/core/config.py
APP_ENV = os.getenv("APP_ENV", "DEVELOPMENT")
_env_file = f".env.{APP_ENV.lower()}"
if Path(_env_file).exists():
    load_dotenv(_env_file)
else:
    load_dotenv()
```

### 4.2 CORS conditionnel

```python
# app/main.py
if IS_PRODUCTION:
    allow_origins = CORS_ORIGINS if CORS_ORIGINS else ["https://monapp.com", ...]
else:
    allow_origins = ["*"]

app.add_middleware(CORSMiddleware, allow_origins=allow_origins, ...)
```

Avec `CORS_ORIGINS` dans config : liste séparée par virgules.

### 4.3 Rate limiting

Fichier `app/api/middleware/rate_limiter.py` :
- Cache en mémoire (pour multi-instances, utiliser Redis)
- Clé : `customer_id` si fourni, sinon IP (`X-Forwarded-For` ou `client.host`)
- Variables : `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`

```python
# Dans la route
await check_rate_limit(customer_id=input.customer_id, request=request)
```

### 4.4 Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

- **Pas de `--reload`** en production
- `PORT` injecté par Railway (ou autre plateforme)

### 4.5 `.dockerignore`

Exclure : `.env`, `.env.*`, `keys/`, `tests/`, `__pycache__/`, `.git/`, `*.pyc`, `data/`

---

## 5. Checklist d'implémentation pour l'autre template

### Étape 13 — Observabilité

| # | Action | Fichier |
|---|--------|---------|
| 1 | Ajouter `langfuse==3.10.0` et `sentry-sdk==2.45.0` | `requirements.txt` |
| 2 | Ajouter variables Langfuse et Sentry | `app/core/config.py` |
| 3 | Créer `app/core/monitoring.py` (copier depuis ce projet) | Nouveau fichier |
| 4 | Initialiser Sentry dans `app/main.py` (conditionnel) | `app/main.py` |
| 5 | Capturer les exceptions du lifespan avec `sentry_sdk.capture_exception` | `app/main.py` |
| 6 | Remplacer `agent.invoke` / `agent.ainvoke` / `agent.astream` par `monitored_*` | Routes agents |
| 7 | Documenter les variables dans `.env.example` | `.env.example` |

### Étape 14 — Déploiement

| # | Action | Fichier |
|---|--------|---------|
| 1 | Chargement multi-env selon `APP_ENV` | `app/core/config.py` |
| 2 | Ajouter `CORS_ORIGINS`, `PORT`, `MAIN_MODEL`, `NANO_MODEL` | `app/core/config.py` |
| 3 | CORS conditionnel (prod vs dev) | `app/main.py` |
| 4 | Créer le rate limiter | `app/api/middleware/rate_limiter.py` |
| 5 | Appliquer `check_rate_limit` sur les endpoints agents | Routes |
| 6 | Créer `Dockerfile` | Nouveau fichier |
| 7 | Créer `.dockerignore` | Nouveau fichier |
| 8 | Vérifier endpoint `/` ou `/health` | `app/main.py` |

---

## 6. Fichiers à copier / adapter

| Fichier source | Action |
|----------------|--------|
| `app/core/monitoring.py` | **Copier tel quel** (adapter les imports si structure différente) |
| `app/main.py` (bloc Sentry + lifespan) | **Adapter** (nom de l'app, lifespan existant) |
| `app/core/config.py` (variables) | **Ajouter** les variables manquantes |
| `app/api/middleware/rate_limiter.py` | **Copier** si pas de rate limit existant |
| `Dockerfile` | **Copier** et ajuster la version Python si besoin |
| `.dockerignore` | **Copier** et compléter selon le projet |
| `.env.example` | **Compléter** avec les nouvelles variables |

---

## 7. Variables d'environnement — Récapitulatif

```env
# Observabilité (étape 13)
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Déploiement (étape 14)
APP_ENV=PRODUCTION
PORT=8000
CORS_ORIGINS=https://app.example.com,https://api.example.com
RATE_LIMIT_MAX_REQUESTS=20
RATE_LIMIT_WINDOW_SECONDS=60
MAIN_MODEL=gpt-4o
NANO_MODEL=gpt-4o-mini
```

---

## 8. Points d'attention pour l'autre template

1. **Convention `session_id`** : Adapter au domaine métier (ex. `{agent_name}-{user_id}`, `{agent_name}-{conversation_id}`).

2. **`project_id` vs `user_id`** : Dans Langfuse, `user_id` = identifiant métier. Si ton autre agent utilise `project_id`, `customer_id`, ou `organization_id`, mapper correctement.

3. **Paramètre `context`** : Si ton agent a un middleware de prompt qui attend un `context`, le passer via `**kwargs` dans `monitored_ainvoke` (ex. `context=context`). Le module monitoring le transmet à `agent.ainvoke()`.

4. **Streaming** : Si tu utilises `monitored_astream`, vérifier que le `propagate_attributes` englobe bien toute la boucle `async for` (déjà géré dans le code fourni).

5. **Tests** : En dev/test, Langfuse et Sentry peuvent être désactivés (clés absentes) — le code dégrade silencieusement.

6. **RGPD** : Toujours `send_default_pii=False` pour Sentry.

---

## 9. Références rapides

- **Guide observabilité** : `docs/07_observabilite.md` (chapitres 26.1 à 26.5)
- **Guide déploiement** : `docs/08_deploiement.md` (chapitres 28 à 30)
- **STEPS.md** : étapes 13 et 14
- **Code de référence** : `app/core/monitoring.py`, `app/main.py`, `app/api/routes/agents.py`
