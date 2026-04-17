# Template Agent IA LangChain

Template réutilisable pour construire un agent IA conversationnel avec LangChain, LangGraph et FastAPI. L'agent utilise des outils métier (RAG + base de données) et répond en message texte naturel.

---

## Stack

| Couche | Technologie |
|--------|-------------|
| API | FastAPI + Uvicorn |
| Agent | LangGraph / LangChain (ReAct) |
| LLM | OpenAI `gpt-4o` (multi-provider : Anthropic, Mistral, Google) |
| Base de données | PostgreSQL |
| Recherche vectorielle | Qdrant (dense `text-embedding-3-large` + BM25 sparse) |
| RAG | Optionnel — à configurer selon le projet (collections `knowledge_docs`, `helpdesk`) |
| Observabilité | Langfuse (optionnel) |
| Monitoring erreurs | Sentry (optionnel) |

### Observabilité (optionnel)

Le template intègre **Langfuse** (tracing LLM) et **Sentry** (monitoring erreurs).
Ces services sont **optionnels** et peuvent être désactivés :

| Service | Variables | Comportement si non configuré |
|---------|-----------|-------------------------------|
| **Langfuse** | `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` | Dégradation silencieuse — l'agent fonctionne sans tracing |
| **Sentry** | `SENTRY_DSN` | Non initialisé — les erreurs ne sont pas envoyées |

Pour **désactiver** : ne pas définir ces variables dans `.env` (ou les laisser vides).
L'application fonctionne normalement sans elles.

---

## Structure

```
app/
├── main.py                        # Point d'entrée FastAPI
├── agents/
│   ├── factory.py                 # AgentFactory : construit et cache les agents
│   ├── registry.py                # Déclare les agents disponibles
│   ├── config.py                  # AgentConfig, AgentNames
│   ├── main_prompt.py             # Couche 1 — identité globale, règles
│   └── business/
│       ├── agent.py               # Liste des outils (1 tool d'exemple)
│       └── prompt.py              # Couche 2 — rôle métier, contexte runtime
├── api/
│   ├── dependencies.py            # get_agent_factory (injection FastAPI)
│   └── routes/
│       ├── agents.py              # POST /assistant — retourne {"message": "..."}
│       └── base.py                # POST /chat — LLM simple sans agent
├── tools/
│   ├── helpers.py                 # success_response(), error_response()
│   └── example/                   # Tool d'exemple (get_current_time)
├── core/
│   ├── llm.py                     # get_llm() — factory multi-provider
│   ├── config.py                  # Variables d'environnement
│   ├── context.py                 # current_customer_id (ContextVar)
│   └── rag/
│       ├── qdrant_client.py       # Client Qdrant + BM25
│       └── vectorstore_docs.py     # search_docs(), search_helpdesk()
├── models/
│   ├── base.py                    # ChatInput, MessageHistory
│   └── schemas/agent_output.py    # Référence (output = message pour la template)
└── repository/
    ├── base.py, database.py       # Accès BDD
    └── __init__.py                # execute_select

scripts/
├── ingest_knowledge.py            # Indexe knowledge_docs (ajoutez vos docs dans rag/documents/)
├── ingest_helpdesk.py             # Indexe helpdesk (ajoutez vos articles)
├── run_uns_mcp.sh                # Lance le serveur MCP Unstructured
├── test_agent.py                  # Test CLI de l'agent
├── test_api_output.py             # Test du format de réponse API
└── test_tools_quick.py            # Test rapide du tool d'exemple

rag/
└── documents/                     # Ajoutez vos documents Markdown (voir README)
```

---

## API

### `POST /api/v1/agent/assistant`

**Input**
```json
{
  "customer_id": "uuid | null",
  "customer_message": "string",
  "conversation_history": [
    { "role": "human | assistant", "content": "string" }
  ]
}
```

- `customer_id` : optionnel. Si fourni → agent avec outils complets (données personnelles). Sinon → agent public (outils limités).
- `customer_message` : message de l'utilisateur.
- `conversation_history` : historique de conversation (utilisé en mode public sans checkpointer).

**Output — succès `200`**
```json
{
  "message": "Réponse texte de l'agent en langage naturel."
}
```

**Exemple curl**
```bash
# Mode public (sans customer_id)
curl -X POST http://localhost:8000/api/v1/agent/assistant \
  -H "Content-Type: application/json" \
  -d '{"customer_message": "Quelle heure est-il ?", "conversation_history": []}'

# Mode authentifié (avec customer_id)
curl -X POST http://localhost:8000/api/v1/agent/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "3f1b2c4d-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "customer_message": "Quelle heure est-il à Paris ?",
    "conversation_history": []
  }'
```

---

## Tools

Un **tool d'exemple** (`get_current_time`) est fourni pour illustrer la structure.
Voir `app/tools/example/example_tool.py` et le guide "Ajouter un nouveau tool" ci-dessous.

---

## RAG

### Collections Qdrant

| Collection | Contenu | Recherche |
|------------|---------|-----------|
| `helpdesk` | Articles du centre d'aide | `search_helpdesk(query, limit)` |
| `knowledge_docs` | Base documentaire générale | `search_docs(query, category)` |

### Indexation

⚠️ **Ajoutez vos propres documents** dans `rag/documents/` avant d'exécuter les scripts.
Voir `rag/documents/README.md` pour la structure.

```bash
# Indexer la base documentaire (sources : rag/documents/<category>/*.md)
python scripts/ingest_knowledge.py --dry-run   # Valider
python scripts/ingest_knowledge.py             # Indexer

# Indexer les articles helpdesk (sources : rag/documents/helpdesk/*.md)
python scripts/ingest_helpdesk.py --dry-run    # Valider
python scripts/ingest_helpdesk.py              # Indexer
```

---

## Personnalisation

### Ajouter un nouveau tool

1. Créer `app/tools/<categorie>/<nom_outil>.py`
2. Exporter depuis `app/tools/<categorie>/__init__.py`
3. Importer dans `app/agents/business/agent.py` et ajouter à `TOOLS_PUBLIC` ou `TOOLS_REQUIRING_CUSTOMER_ID`
4. Mettre à jour `<tools_selection>` dans `app/agents/business/prompt.py`

### Modifier le prompt

- `app/agents/main_prompt.py` : identité globale, règles absolues
- `app/agents/business/prompt.py` : rôle métier, liste des tools, paramètres

### Output structuré (JSON)

Pour un projet nécessitant un output JSON structuré au lieu d'un message texte :
- Adapter `app/agents/main_prompt.py` et `prompt.py` pour demander un JSON
- Réactiver la validation dans `app/api/routes/agents.py` avec un schéma Pydantic (voir `app/models/schemas/agent_output.py` pour référence)

---

## Tests

```bash
# Test rapide du tool d'exemple
uv run python scripts/test_tools_quick.py

# Test de l'agent (CLI)
uv run python scripts/test_agent.py -m "Quelle heure est-il ?"

# Test de l'API (serveur doit être démarré)
uvicorn app.main:app --reload &
uv run python scripts/test_api_output.py --message "Quelle heure est-il ?"
```

---

## Lancement

### Variables d'environnement (`.env`)

Voir `.env.example` pour la liste complète.

**Obligatoires** :
- `OPENAI_API_KEY`
- `DATABASE_URL` (pour le checkpointer)

**Optionnelles — Observabilité** (désactivées si absentes) :
- `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL`
- `SENTRY_DSN`

**Optionnelles — Autres** :
- `APP_ENV`, `LOG_LEVEL`, `QDRANT_URL`, etc.

### Démarrage

```bash
# Installer les dépendances
uv sync
# ou : pip install -r requirements.txt

# Lancer le serveur (recommandé pour tester avec Next.js sans redémarrages intempestifs)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Variante dev : rechargement auto si tu modifies le code Python
# Avec --reload, Uvicorn surveille les fichiers : l’IDE, les indexeurs ou une
# sauvegarde groupée peuvent déclencher des rechargements en chaîne. Limite la
# surveillance au package applicatif :
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app
```

L'API est disponible sur `http://localhost:8000`. Documentation interactive : `http://localhost:8000/docs`.

### Health check

- `GET /` ou `GET /health` : statut de l'API (`{"status": "ok", "env": "..."}`)
- `GET /health/ready` : readiness (vérifie la connexion PostgreSQL)

---

## Déploiement (Railway, PaaS)

Référence : `docs/PLAN_IMPLEMENTATION_DEPLOIEMENT_ETAPE_14.md`

### Docker

```bash
# Build
docker build -t mon-agent .

# Run avec variables
docker run -p 8000:8000 --env-file .env mon-agent

# Vérifier le health check
curl http://localhost:8000/health
```

### Variables production

| Variable | Description |
|----------|-------------|
| `APP_ENV` | `PRODUCTION` ou `STAGING` |
| `CORS_ORIGINS` | Origines autorisées (virgules) |
| `PORT` | Injecté par Railway |
| `MAIN_MODEL` / `NANO_MODEL` | Stratégie de modèles |
| `RATE_LIMIT_MAX_REQUESTS` | Limite requêtes (défaut 20/min) |

### Procfile (Heroku / Railway sans Docker)

```procfile
web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

---

## MCP (Model Context Protocol)

Le projet inclut le serveur MCP **Unstructured** pour partitionner des documents (PDF, Word, etc.) via l'API Unstructured.

### Configuration

1. Copier : `cp .cursor/mcp.json.example .cursor/mcp.json`
2. Remplacer `ta-cle-api-unstructured` par ta clé API (ou `UNS_API_KEY` de ton `.env`)
3. Redémarrer Cursor

Voir `mcp-servers/README.md` pour les détails.

---

## Documents de référence

- `PROJECT.md` : guide pour renseigner les informations de votre projet
- `langchain_guide.md` : bonnes pratiques LangChain + FastAPI
- `STEPS.md` : étapes d'architecture (si présent)
# Growth-Machine-Classification-IA-Agent
