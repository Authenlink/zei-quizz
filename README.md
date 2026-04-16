# Template IA — Next.js + Agent LangGraph

Template de démarrage pour construire une **application web avec un assistant IA intégré**. Elle combine une application **Next.js** complète (authentification, RBAC, UI) et un **agent IA Python** prêt à l'emploi, exposé via une API FastAPI et branché nativement sur l'interface web.

L'agent est basé sur **LangGraph / LangChain** (architecture ReAct) avec persistance de la mémoire conversationnelle en Postgres, support multi-fournisseurs LLM, et une base RAG optionnelle via Qdrant. L'interface de chat est directement intégrée à l'app Next.js (`/agent`) et communique avec l'agent via une route API dédiée.

---

## Stack technique

### Application web — Next.js

| Couche | Technologie |
|--------|-------------|
| Framework | **Next.js 15** — App Router, Server Components |
| Auth | **NextAuth v5** — credentials, session JWT, RBAC (`admin` / `staff` / `user`) |
| Base de données | **Drizzle ORM** + **PostgreSQL** (ex. [Neon](https://neon.tech)) |
| UI | **shadcn/ui** + **Tailwind CSS v4** |
| Chat UI | **Vercel AI SDK** (`ai` + `@ai-sdk/react`) — streaming de l'interface |
| Langage | TypeScript |

### Agent IA — Python

| Couche | Technologie |
|--------|-------------|
| API | **FastAPI** + **Uvicorn** |
| Agent | **LangGraph** (graphe ReAct) + **LangChain** |
| Mémoire | **LangGraph AsyncPostgresSaver** — persistance des threads de conversation en Postgres |
| LLM | Multi-fournisseurs : **OpenAI**, Anthropic, Mistral, Google — configurable via `LLM_PROVIDER` |
| RAG | **Qdrant** (base vectorielle) + **FastEmbed** (sparse BM25) — optionnel |
| Observabilité | **Langfuse** (traces LLM) + **Sentry** (erreurs) — optionnels |
| Déploiement | **Docker** (`Dockerfile`) + **Railway / Heroku** (`Procfile`) |
| Langage | Python 3.11+ |

---

## Démarrage rapide

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd <nom-du-repo>
```

### 2. Variables d'environnement — Next.js (racine)

```bash
cp .env.example .env
```

Ouvrir `.env` et renseigner :

| Variable | Valeur à fournir |
|----------|-----------------|
| `DATABASE_URL` | URL Postgres (ex. Neon) — `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_URL` | `http://localhost:3000` en développement local |
| `NEXTAUTH_SECRET` | Secret aléatoire — générer avec `openssl rand -base64 32` |
| `AGENT_API_BASE_URL` | `http://127.0.0.1:8000` (URL du FastAPI sans `/api/v1`) |

### 3. Variables d'environnement — Agent Python

```bash
cp agent/.env.example agent/.env
```

Ouvrir `agent/.env` et renseigner :

| Variable | Valeur à fournir |
|----------|-----------------|
| `OPENAI_API_KEY` | Clé API OpenAI (ou autre fournisseur LLM) |
| `DATABASE_URL` | Même URL Postgres que ci-dessus (utilisée par le checkpointer LangGraph) |
| `APP_ENV` | `DEVELOPMENT` en local |

Optionnel : `LLM_PROVIDER`, `MODEL`, `QDRANT_URL`, `LANGFUSE_*`, `SENTRY_DSN` — voir `agent/.env.example` pour le détail.

### 4. Base de données (première fois uniquement)

```bash
pnpm install          # installe les dépendances Node
pnpm setup:db         # applique le schéma Drizzle (tables app, auth, conversations)
```

> Les tables LangGraph (checkpointer de l'agent) sont créées automatiquement au premier démarrage de l'API Python.

### 5. Démarrer les deux services

**Terminal 1 — Next.js**

```bash
pnpm dev
# → http://localhost:3000
```

**Terminal 2 — Agent Python**

```bash
cd agent
pip install -r requirements.txt        # première fois uniquement
uvicorn app.main:app --host 0.0.0.0 --port 8000
# → API docs : http://localhost:8000/docs
```

---

## Structure du dépôt

**Racine — application Next.js**

| Dossier | Rôle |
|---------|------|
| `app/` | Routes App Router (`(admin)` back-office, `(user)` portail + `/agent`, APIs `app/api/*`) |
| `components/` | Composants UI, shells (`internal-sidebar`, `portal-sidebar`), feature Assistant (`components/agent/`) |
| `lib/` | Schéma Drizzle (`schema.ts`), auth, utilitaires |
| `types/` | Types TypeScript partagés |
| `drizzle/` | Migrations SQL générées par Drizzle Kit |
| `scripts/` | Scripts utilitaires (ex. `setup-database.sh`) |

**`agent/` — API Python**

| Zone | Rôle |
|------|------|
| `agent/app/main.py` | Point d’entrée FastAPI |
| `agent/app/api/` | Routes HTTP (`/api/v1/...`) |
| `agent/app/agents/` | LangGraph / prompts / factory |
| `agent/app/core/` | Config, LLM, RAG, checkpointer Postgres |
| `agent/requirements.txt` | Dépendances pip |
| `agent/README.md` | **Détails agent** (endpoints, tools, RAG, déploiement) — à lire pour aller plus loin |

---

## Prérequis

- **Node.js** (LTS recommandé) et **pnpm**
- **Python 3.11+** (aligné sur `agent/Dockerfile` : `python:3.11-slim`)
- **PostgreSQL** accessible (ex. compte [Neon](https://neon.tech) ou Postgres local)
- **Clés LLM** pour l’agent : au minimum ce que vous configurez dans `agent/.env` (voir `agent/.env.example`, typiquement `OPENAI_API_KEY` selon `LLM_PROVIDER`)

---

## Variables d’environnement

### Racine — `.env` (modèle : `.env.example`)

Copier et renommer :

```bash
cp .env.example .env
```

Variables documentées dans `.env.example` :

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion Postgres pour Next.js (Drizzle / NextAuth) |
| `NEXTAUTH_URL` | URL publique de l’app (ex. `http://localhost:3000` en dev) |
| `NEXTAUTH_SECRET` | Secret de signature JWT / cookies — **obligatoire en production** |
| `AGENT_API_BASE_URL` | URL de base du FastAPI **sans** suffixe `/api/v1` (ex. `http://127.0.0.1:8000`) |
| `AGENT_API_URL` | Alias de `AGENT_API_BASE_URL` (même effet dans le code) |
| `AGENT_CHAT_STREAM_CHUNK_DELAY_MS` | Optionnel — délai entre morceaux de texte pour l’effet « streaming » côté UI (défaut `12` ; `0` = envoi en rafale) |

Générer un secret NextAuth :

```bash
openssl rand -base64 32
```

### Agent — `agent/.env` (modèle : `agent/.env.example`)

L’agent charge la config via `agent/app/core/config.py` :

- **`DATABASE_URL`** : utilisée pour Postgres (dont le pool du checkpointer si `AGENT_DATABASE_URL` est absent).
- **`AGENT_DATABASE_URL`** : optionnelle ; si définie, sert au **checkpointer LangGraph** ; sinon repli sur `DATABASE_URL`.

Les autres variables LLM, CORS, Qdrant, etc. sont décrites dans `agent/.env.example` et le README agent.

---

## Base de données

- **Tables Next.js** (utilisateurs, sessions, conversations assistant côté app, workspaces, etc.) : définies dans **`lib/schema.ts`** et appliquées avec **Drizzle Kit** (`pnpm db:push` ou `pnpm setup:db`).
- **Tables LangGraph (checkpointer)** : créées au **premier démarrage** de l’API Python lors de l’initialisation du saver Postgres (`setup()` dans `agent/app/core/checkpointer_manager.py`), **pas** par Drizzle.

Script optionnel depuis la racine (équivalent `pnpm setup:db`) :

```bash
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh
```

---

## Commandes

Toutes les commandes `pnpm` ci-dessous se lancent **depuis la racine du dépôt**.

### Racine — Next.js

```bash
pnpm install          # Dépendances Node
pnpm dev              # Serveur de dev (http://localhost:3000)
pnpm build            # Build production
pnpm setup:db         # Alias de db:push — applique le schéma Drizzle
pnpm db:push          # Idem — pousse le schéma vers DATABASE_URL
pnpm db:studio        # Drizzle Studio (exploration des tables Drizzle)
pnpm lint             # ESLint
```

### `agent/` — FastAPI

```bash
cd agent

# Dépendances (au choix)
pip install -r requirements.txt
# ou, avec uv sans projet pyproject à la racine de agent/ :
#   uv pip install -r requirements.txt
#
# Note : `uv sync` exige un fichier pyproject.toml ; ce dépôt n’en fournit pas
# à la racine de agent/ (le README agent mentionne parfois uv sync pour des
# setups étendus — utiliser pip / uv pip ici).

# Lancement recommandé pour stabilité (sans reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Variante dev avec rechargement limité au package applicatif
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app
```

- Documentation interactive : [http://localhost:8000/docs](http://localhost:8000/docs)
- **Procfile** (`agent/Procfile`) : `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` (pas de `--reload` en prod)

Pour tout le détail (health checks, variables prod, Docker), voir **`agent/README.md`**.

---

## Workflow développement local

1. **Terminal 1** (racine) : `pnpm dev` → Next.js sur le port **3000**.
2. **Terminal 2** (`agent/`) : Uvicorn sur le port **8000** (commande sans `--reload` si vous subissez des redémarrages intempestifs).
3. Aligner **`AGENT_API_BASE_URL`** (ou `AGENT_API_URL`) dans `.env` sur l’URL réelle de l’agent (ex. `http://127.0.0.1:8000`).

---

## Fonctionnalité Assistant IA

| Élément | Rôle |
|---------|------|
| Page **`/agent`** | UI du chat (`AssistantView` / `assistant-chat`) — accès connecté |
| **`POST /api/chat`** | Route Next qui appelle le FastAPI `POST /api/v1/agent/assistant`, puis renvoie un flux UI |
| **`/api/conversations`** | Liste (`GET`) et création (`POST`) des conversations persistées (Drizzle) |
| **`/api/conversations/[id]`** | Suppression (`DELETE`) d’une conversation |
| **`/api/conversations/[id]/messages`** | Lecture (`GET`) et enregistrement (`PUT`) des messages (format UI) |

**Streaming** : l’agent FastAPI répond en **JSON** avec un champ texte complet (`message`). La route `app/api/chat/route.ts` **découpe** ce texte en deltas avec un léger délai pour simuler du streaming côté navigateur. Un **vrai streaming token par token** depuis le LLM passerait par une évolution côté FastAPI (SSE ou équivalent), pas encore le comportement actuel.

---

## Auth / rôles

- **RBAC** (`users.role`) : **`admin`** (back-office + portail), **`staff`** (interne / back-office), **`user`** (portail). Les shells utilisent notamment `internal-sidebar` vs `portal-sidebar` selon les routes `(admin)` vs `(user)`.
- **`accountType`** (`user` = personnel, `business` = entreprise avec workspace) est **indépendant** du rôle RBAC. Détail des comptes / workspaces : `lib/account-context.ts`, flux login/signup, et `.cursor/rules/accounts-workspaces.mdc`.

Pour activer des redirections automatiques par rôle, le code d’exemple est dans **`proxy.ts`** (section RBAC commentée).

---

## Déploiement (aperçu)

- **Vercel + Neon** : définir `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, et les variables agent nécessaires (`AGENT_API_BASE_URL` vers l’URL publique de l’API Python). Appliquer le schéma : `pnpm db:push` (CI ou manuel).
- **Agent** : voir `agent/README.md` (Railway, Docker, `CORS_ORIGINS`, etc.).

---

## Dépannage

| Symptôme | Pistes |
|----------|--------|
| Uvicorn redémarre en boucle | Éviter `--reload` en dev si l’IDE ou les outils touchent trop de fichiers ; ou utiliser `--reload --reload-dir app` uniquement |
| Next ne joint pas l’agent | Vérifier que l’API tourne, le **port** (8000), et **`AGENT_API_BASE_URL`** / **`AGENT_API_URL`** (pas de slash final requis ; le code le normalise) |
| Erreurs CORS en **production** quand le navigateur appelle l’API directement | Côté agent, renseigner **`CORS_ORIGINS`** (`agent/app/core/config.py`). En dev, le chat passe souvent par **`/api/chat`** (serveur Next → FastAPI), ce qui limite les problèmes CORS navigateur |

---

_Dernière mise à jour — avril 2026_
# template-nextapp-agentia
