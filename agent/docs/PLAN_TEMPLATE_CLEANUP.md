# Plan de nettoyage — Template Agent LangChain

> **Objectif** : Transformer ce repo en template réutilisable. Garder uniquement les tools **projets**, le RAG/Qdrant complet, et une structure prête à être étendue rapidement.

---

## Contexte

Ce document sert d'instruction pour un agent IA chargé de nettoyer la codebase après clonage du repo. Le résultat doit être un template fonctionnel avec :

- **Tools** : uniquement les 7 tools projets (identification, détails, dividendes, actualités, format, liste)
- **RAG** : infrastructure complète conservée (Qdrant, `search_docs`, `search_helpdesk`, collections, scripts d'ingestion)
- **Structure** : models, repository, middleware, core, API — prêts à être customisés

---

## 1. Tools — À GARDER

### 1.1 Tools projets (tous)

| Tool | Fichier | Dépendances |
|------|---------|-------------|
| `identify_project_from_message` | `app/tools/projects/identify_project_from_message.py` | `projects_repository` |
| `identify_project_vector_search` | `app/tools/projects/identify_project_vector_search.py` | `projects_repository`, `search_docs` (RAG) |
| `get_customer_properties_dividends` | `app/tools/projects/get_customer_properties_dividends.py` | `projects_repository` |
| `get_project_monthly_updates` | `app/tools/projects/get_project_monthly_updates.py` | `projects_repository` |
| `get_project_details` | `app/tools/projects/get_project_details.py` | `projects_repository` |
| `check_investment_format` | `app/tools/projects/check_investment_format.py` | `projects_repository` |
| `list_available_projects` | `app/tools/projects/list_available.py` | `projects_repository` |

**Action** : Garder `app/tools/projects/` intact (tous les fichiers).

---

## 2. Tools — À SUPPRIMER

Supprimer les dossiers et fichiers suivants :

| Dossier / Fichier | Raison |
|-------------------|--------|
| `app/tools/referral/` | Hors scope projets |
| `app/tools/documents/` | Hors scope projets |
| `app/tools/transactions/` | Hors scope projets |
| `app/tools/invest_auto/` | Hors scope projets |
| `app/tools/portfolio/` | Hors scope projets |
| `app/tools/investors/` | Hors scope projets |
| `app/tools/taxation/` | Hors scope projets |
| `app/tools/help_center/` | Hors scope projets |
| `app/tools/utils/` | Hors scope projets (web_search_tool) |
| `app/tools/shared/` | Hors scope projets (si vide ou non utilisé) |

**Note** : `app/tools/helpers.py` doit être **conservé** — utilisé par tous les tools.

---

## 3. Repository — À GARDER

| Fichier | Usage |
|---------|-------|
| `app/repository/base.py` | Classe de base |
| `app/repository/database.py` | `execute_select` |
| `app/repository/projects.py` | Utilisé par les tools projets |

---

## 4. Repository — À SUPPRIMER

| Fichier | Raison |
|---------|--------|
| `app/repository/referral.py` | Hors scope |
| `app/repository/documents.py` | Hors scope |
| `app/repository/transactions.py` | Hors scope |
| `app/repository/invest_auto.py` | Hors scope |
| `app/repository/portfolio.py` | Hors scope |
| `app/repository/investors.py` | Hors scope |
| `app/repository/taxation.py` | Hors scope |
| `app/repository/business/` | Si présent, supprimer |

---

## 5. Models — À GARDER

| Fichier | Usage |
|---------|-------|
| `app/models/base.py` | Modèles de base (ChatInput, etc.) |
| `app/models/domain/projects.py` | Modèles projets |
| `app/models/schemas/agent_output.py` | À simplifier (voir section 9) |

---

## 6. Models — À SUPPRIMER

| Fichier | Raison |
|---------|--------|
| `app/models/domain/referral.py` | Hors scope |
| `app/models/domain/document.py` | Hors scope |
| `app/models/domain/transactions.py` | Hors scope |
| `app/models/domain/invest_auto.py` | Hors scope |
| `app/models/domain/portfolio.py` | Hors scope |
| `app/models/domain/investor.py` | Hors scope |
| `app/models/domain/taxation.py` | Hors scope |
| `app/models/enums/investor.py` | Si présent et non utilisé ailleurs |

---

## 7. RAG — À CONSERVER INTÉGRALEMENT

**Ne rien supprimer** dans :

| Élément | Détail |
|---------|--------|
| `app/core/rag/` | `qdrant_client.py`, `vectorstore_docs.py`, `__init__.py` |
| Collections Qdrant | `bricks_docs`, `bricks_helpdesk` — inchangées |
| Fonctions | `search_docs`, `search_helpdesk`, `upsert_chunks`, `create_knowledge_collection`, `create_helpdesk_collection` |
| Scripts ingestion | `scripts/ingest_bricks_knowledge.py`, `scripts/ingest_bricks_helpdesk.py` |
| Documents RAG | `rag/documents/` — conserver la structure (les tools projets utilisent `search_docs` avec `category='projects'`) |

---

## 8. Agent — Modifications

### 8.1 `app/agents/business/agent.py`

**Remplacer** tout le contenu par une version simplifiée :

- Supprimer tous les imports de tools hors projets
- Garder uniquement les imports des 7 tools projets
- Définir `TOOLS_PUBLIC` : `[list_available_projects]` (pas de customer_id requis)
- Définir `TOOLS_REQUIRING_CUSTOMER_ID` : les 6 autres tools (identify_*, get_*, check_*)
- Adapter `get_tools(has_customer_id: bool)` en conséquence

**Structure cible** :

```python
# Imports : uniquement app.tools.projects
# TOOLS_PUBLIC = [list_available_projects]
# TOOLS_REQUIRING_CUSTOMER_ID = [identify_project_from_message, identify_project_vector_search, ...]
# get_tools(has_customer_id: bool) -> list
```

### 8.2 `app/agents/business/prompt.py`

- Remplacer la section `<tools_selection>` pour ne lister **que** les tools projets
- Supprimer les catégories : INVESTORS, REFERRAL, DOCUMENTS, TRANSACTIONS, INVEST_AUTO, PORTFOLIO, TAXATION, HELP_CENTER, SHARED, GÉNÉRAL
- Garder uniquement : **PROJECTS** avec la liste des 7 tools
- Adapter `<parameter_rules>` si nécessaire (customer_id, property_id)
- Conserver la structure `<context>`, `<role>`, etc.

### 8.3 `app/agents/registry.py`

- Garder les 2 agents (INVESTOR_ASSISTANT, INVESTOR_ASSISTANT_PUBLIC) ou simplifier à 1 seul agent si souhaité
- Les configs pointent déjà vers `get_tools` et `get_dynamic_investor_prompt` — pas de changement structurel
- Option : renommer les agents en `project_assistant` / `project_assistant_public` pour cohérence template

### 8.4 `app/agents/config.py`

- Optionnel : renommer `AgentNames.INVESTOR_ASSISTANT` → `project_assistant` pour le template
- Sinon, laisser tel quel

---

## 9. Schéma AgentOutput — Simplification

**Fichier** : `app/models/schemas/agent_output.py`

**Action** : Simplifier pour ne garder que la catégorie `projects` à la racine.

- Supprimer : `ReferralOutput`, `DocumentsOutput`, `TransactionsOutput`, `InvestAutoOutput`, `PortfolioOutput`, `InvestorsOutput`, `TaxationOutput`, `HelpCenterOutput`, `SharedOutput` et toutes leurs classes imbriquées
- Garder : `ProjectsOutput` et toutes ses sous-classes (`IdentifiedProjects`, `CustomerPropertiesDividends`, `MonthlyUpdates`, `ProjectDetails`, `InvestmentFormat`, `AvailableProject`, etc.)
- Modifier `AgentOutput` pour n'avoir qu'un champ `projects: ProjectsOutput | None = None`

**Important** : Vérifier que `app/api/routes/agents.py` et tout code qui utilise `AgentOutput` soit mis à jour pour ne référencer que `projects`.

---

## 10. Models domain `__init__.py`

**Fichier** : `app/models/domain/__init__.py`

- Remplacer les exports par : `from app.models.domain.projects import ...` (tous les modèles projets)
- Supprimer les exports `InvestorProfile`, `AccountDeletionStatus`, etc.

---

## 11. Repository `__init__.py`

**Fichier** : `app/repository/__init__.py`

- Remplacer les exports par : `execute_select`, `ProjectsRepository`, `projects_repository`
- Supprimer les exports `InvestorRepository`, `investor_repository`

---

## 12. API Routes — Vérifications

- `app/api/routes/agents.py` : Vérifier que le schéma `AgentOutput` simplifié est compatible (réponse JSON avec `projects` uniquement)
- `app/api/routes/rag.py` : Conserver tel quel (endpoints RAG)
- `app/api/routes/base.py` : Conserver
- `app/api/dependencies.py` : Conserver

---

## 13. Scripts — À GARDER / SUPPRIMER

| Script | Action |
|--------|--------|
| `scripts/ingest_bricks_knowledge.py` | **Garder** — ingestion RAG |
| `scripts/ingest_bricks_helpdesk.py` | **Garder** — ingestion RAG |
| `scripts/test_agent.py` | **Garder** — test générique |
| `scripts/chat.py` | **Garder** — chat CLI |
| `scripts/test_projects.py` | **Garder** — test tools projets |
| `scripts/test_api_output.py` | **Garder** — adapter si nécessaire au nouveau schéma |
| `scripts/test_transactions.py` | **Supprimer** |
| `scripts/test_invest_auto.py` | **Supprimer** |
| `get_project_from_message_script.py` | **Supprimer** (racine du repo) |

---

## 14. Documentation — À SUPPRIMER / ADAPTER

| Fichier | Action |
|---------|--------|
| `docs/API_DOCS/` | **Supprimer** tout le dossier (DATA.md, DATA_API_REFERENCE.md, API_OUTPUT_EXAMPLE.md) — spécifique CRI |
| `docs/PROMPT_ETAPE_*.md` | **Supprimer** ou garder 1–2 pour référence |
| `docs/TOOLS_PROMPT.md`, `docs/TOOLS_ORCHESTRATION.md` | **Supprimer** ou conserver si générique |
| `TOOLS.md` | **Supprimer** ou réécrire pour lister uniquement les tools projets |
| `STEPS.md` | **Garder** — guide d'architecture |
| `PROJECT.md` | **Remplacer** — décrire le template (agent projets + RAG) |
| `langchain_guide.md` | **Garder** |
| `docs/01_fondations.md` à `docs/08_deploiement.md` | **Garder** |

---

## 15. Core, Middleware, Main — À CONSERVER

**Ne rien modifier** dans :

- `app/core/` : `config.py`, `llm.py`, `rag/`, `checkpointer_manager.py`, `monitoring.py`, `context.py`, `memory/`
- `app/middleware/` : `smart_cleanup.py`, `custom_summarization.py`
- `app/main.py`
- `app/agents/factory.py`, `app/agents/stream_handler.py`, `app/agents/main_prompt.py`

---

## 16. Enums

**Fichier** : `app/models/enums/__init__.py`

- Si `investor.py` (CustomerType, LemonwayStatus) n'est plus utilisé nulle part après suppression des tools investors → supprimer le fichier et vider/adapter `enums/__init__.py`
- Sinon, garder

---

## 17. Checklist finale

Après nettoyage, vérifier :

- [ ] `uv run python -c "from app.main import app"` — pas d'erreur d'import
- [ ] `uv run python scripts/test_projects.py` — tests passent
- [ ] `uv run python scripts/test_agent.py` — agent répond
- [ ] Aucun import cassé (référence à un module supprimé)
- [ ] `app/tools/__init__.py` — exporter uniquement `app.tools.projects` si nécessaire, ou garder structure actuelle
- [ ] `app/tools/projects/__init__.py` — inchangé

---

## 18. Structure finale attendue

```
app/
├── api/
│   ├── dependencies.py
│   └── routes/
│       ├── agents.py
│       ├── base.py
│       └── rag.py
├── agents/
│   ├── business/
│   │   ├── agent.py          # Tools projets uniquement
│   │   └── prompt.py         # tools_selection projets uniquement
│   ├── config.py
│   ├── factory.py
│   ├── main_prompt.py
│   ├── registry.py
│   └── stream_handler.py
├── core/
│   ├── config.py
│   ├── context.py
│   ├── llm.py
│   ├── rag/                  # Intact
│   ├── checkpointer_manager.py
│   ├── monitoring.py
│   └── memory/
├── middleware/
├── models/
│   ├── base.py
│   ├── domain/
│   │   ├── projects.py       # Seul domain model
│   │   └── __init__.py
│   ├── schemas/
│   │   └── agent_output.py   # Simplifié : projects uniquement
│   └── enums/
├── repository/
│   ├── base.py
│   ├── database.py
│   ├── projects.py           # Seul repository
│   └── __init__.py
└── tools/
    ├── helpers.py
    └── projects/             # 7 tools
        ├── __init__.py
        ├── check_investment_format.py
        ├── get_customer_properties_dividends.py
        ├── get_project_details.py
        ├── get_project_monthly_updates.py
        ├── identify_project_from_message.py
        ├── identify_project_vector_search.py
        └── list_available.py

rag/
└── documents/                # Intact (structure + contenu projects)
```

---

## 19. Instruction pour l'agent IA

> **Prompt à fournir à l'agent** :
>
> "Exécute le plan défini dans PLAN_TEMPLATE_CLEANUP.md. Supprime tous les tools, repositories et models hors scope projets. Simplifie app/agents/business/agent.py et prompt.py pour ne garder que les tools projets. Simplifie app/models/schemas/agent_output.py pour n'avoir que la catégorie projects. Mets à jour les __init__.py (repository, models/domain). Supprime les scripts et docs listés. Conserve intégralement le RAG (app/core/rag/, scripts d'ingestion, rag/documents/). À la fin, vérifie que les imports fonctionnent et que les tests projets passent."
