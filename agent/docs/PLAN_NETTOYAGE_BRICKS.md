# Plan d'action — Nettoyage Bricks & Tool d'exemple

Ce document décrit les étapes pour retirer tout ce qui touche à Bricks, remplacer les tools projets par un seul tool d'exemple, et mettre à jour le README (Langfuse, Sentry, désactivation optionnelle).

---

## 1. Vue d'ensemble

| Objectif | Action |
|----------|--------|
| Retirer Bricks | Supprimer tools projets, repository, modèles domain, RAG Bricks, scripts ingest |
| Un seul tool d'exemple | Créer `example_tool` minimal (structure réutilisable) |
| Mise à jour README | Documenter Langfuse, Sentry, et leur désactivation optionnelle |

---

## 2. Fichiers à supprimer

### 2.1 Tools projets (7 fichiers)

```
app/tools/projects/
├── check_investment_format.py      ❌ Supprimer
├── get_customer_properties_dividends.py  ❌ Supprimer
├── get_project_details.py         ❌ Supprimer
├── get_project_monthly_updates.py ❌ Supprimer
├── identify_project_from_message.py ❌ Supprimer
├── identify_project_vector_search.py ❌ Supprimer
├── list_available.py               ❌ Supprimer
└── __init__.py                    ❌ Supprimer (dossier entier)
```

### 2.2 Repository & modèles

| Fichier | Action |
|---------|--------|
| `app/repository/projects.py` | ❌ Supprimer |
| `app/models/domain/projects.py` | ❌ Supprimer |

### 2.3 RAG Bricks

| Fichier / Dossier | Action |
|-------------------|--------|
| `app/core/rag/` | ❌ Supprimer (ou garder structure vide — voir § 3.4) |
| `rag/documents/` | ❌ Supprimer tout le contenu Bricks |
| `scripts/ingest_bricks_knowledge.py` | ❌ Supprimer |
| `scripts/ingest_bricks_helpdesk.py` | ❌ Supprimer |

### 2.4 Scripts de test projets

| Fichier | Action |
|---------|--------|
| `scripts/test_projects.py` | ❌ Supprimer |

### 2.5 Web search (Serper)

| Fichier | Action |
|---------|--------|
| `app/tools/utils/web_search_tool.py` | ❌ Supprimer (ou garder comme tool d'exemple — voir § 3.1) |

**Note** : Si tu gardes `web_search_tool` comme exemple, il nécessite `SERPER_API_KEY`. Pour un template minimal sans clé externe, préférer un tool d'exemple autonome.

---

## 3. Fichiers à créer / modifier

### 3.1 Créer le tool d'exemple

**Option A — Tool minimal sans dépendance externe (recommandé)**

Créer `app/tools/example/example_tool.py` :

```python
"""
Tool d'exemple — structure de base pour créer vos propres tools.

Ce tool retourne l'heure courante. Utilisez-le comme modèle :
  1. Définir un schéma Pydantic (BaseModel) pour les paramètres
  2. Implémenter la fonction métier
  3. Créer le StructuredTool avec from_function()
  4. Exporter depuis app/tools/example/__init__.py
  5. Ajouter dans agent.py (TOOLS_PUBLIC ou TOOLS_REQUIRING_CUSTOMER_ID)
  6. Documenter dans prompt.py (<tools_selection>)
"""

from datetime import datetime
from typing import Optional

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field


class ExampleToolInput(BaseModel):
    """Schéma d'entrée pour example_tool."""

    timezone: Optional[str] = Field(
        default="Europe/Paris",
        description="Fuseau horaire (ex: Europe/Paris, UTC)",
    )


def example_tool_impl(timezone: str = "Europe/Paris") -> str:
    """Retourne l'heure courante dans le fuseau demandé."""
    try:
        from zoneinfo import ZoneInfo
        dt = datetime.now(ZoneInfo(timezone))
        return f"Heure actuelle ({timezone}) : {dt.strftime('%H:%M:%S le %d/%m/%Y')}"
    except Exception as e:
        return f"Erreur : {e}"


example_tool = StructuredTool.from_function(
    func=example_tool_impl,
    name="get_current_time",
    description="Retourne l'heure et la date courantes. Utilise pour démontrer le fonctionnement des tools.",
    args_schema=ExampleToolInput,
)
```

Créer `app/tools/example/__init__.py` :

```python
"""Tools d'exemple — modèle pour créer vos propres tools."""

from app.tools.example.example_tool import example_tool

__all__ = ["example_tool"]
```

**Option B** : Garder `web_search_tool` comme unique exemple (nécessite SERPER_API_KEY).

---

### 3.2 Modifier `app/tools/__init__.py`

Remplacer les imports projets par :

```python
from app.tools.example import example_tool

__all__ = ["example_tool"]
```

---

### 3.3 Modifier `app/agents/business/agent.py`

```python
"""
Agent assistant — un tool d'exemple.

Pour ajouter vos propres tools :
  1. Créer app/tools/<categorie>/<nom_outil>.py
  2. Exporter depuis app/tools/<categorie>/__init__.py
  3. Importer ici et ajouter à TOOLS_PUBLIC ou TOOLS_REQUIRING_CUSTOMER_ID
  4. Mettre à jour <tools_selection> dans prompt.py
"""

from app.tools.example import example_tool

TOOLS_PUBLIC = [example_tool]
TOOLS_REQUIRING_CUSTOMER_ID = []


def get_tools(has_customer_id: bool = True) -> list:
    """Retourne la liste des outils."""
    return TOOLS_PUBLIC
```

---

### 3.4 Modifier `app/agents/business/prompt.py`

- Remplacer le rôle "assistant projets immobiliers" par un rôle générique (ex. "assistant conversationnel").
- Mettre à jour `<tools_selection>` pour ne mentionner que `get_current_time` (ou le nom du tool d'exemple).
- Simplifier `<parameter_rules>` et `<output_reminder>`.
- Garder la structure `ProjectAgentContext` mais la renommer en `AgentContext` (customer_id, current_date, mode).

---

### 3.5 Modifier `app/agents/main_prompt.py`

Remplacer l'identité "projets immobiliers" par une identité générique :

```python
main_prompt = """
<identity>
Tu es un assistant conversationnel. Ton rôle : analyser la question reçue,
appeler les outils appropriés pour collecter les données, puis répondre
à l'utilisateur de manière claire et utile.
</identity>
...
"""
```

---

### 3.6 Modifier `app/repository/__init__.py`

Retirer l'export de `ProjectsRepository` et `projects_repository`. Garder uniquement `execute_select` si utilisé ailleurs, sinon simplifier.

---

### 3.7 Modifier `app/models/domain/__init__.py`

Retirer l'import de `projects`. Vérifier que rien d'autre n'importe `app.models.domain.projects`.

---

### 3.8 Gestion du RAG

**Option 1 — Supprimer complètement** (template minimal)

- Supprimer `app/core/rag/` (qdrant_client, vectorstore_docs)
- Supprimer `app/api/routes/rag.py` ou le garder vide
- Retirer l'inclusion du router RAG dans `app/main.py` si présente
- Retirer `QDRANT_URL` de `.env.example` (ou le marquer optionnel)
- Retirer les dépendances `qdrant-client`, `qdrant-sparse` de `requirements.txt` si plus utilisées

**Option 2 — Garder la structure** (pour projet avec RAG futur)

- Garder `app/core/rag/` mais supprimer les références à `bricks_docs`, `bricks_helpdesk`
- Laisser les collections vides ou génériques
- Documenter dans le README que le RAG est à configurer selon le projet

**Recommandation** : Option 1 pour un template épuré. L'utilisateur pourra réintégrer le RAG via le guide.

---

### 3.9 Modifier `app/core/config.py`

- Retirer `EXTERNAL_API_URL` (tu le retireras aussi du `.env`)
- Retirer `QDRANT_URL` si RAG supprimé

---

### 3.10 Modifier `app/main.py`

- Vérifier qu'aucun router RAG n'est inclus (ou le retirer)
- Pas d'autre changement nécessaire

---

### 3.11 Mettre à jour les scripts de test

| Script | Action |
|--------|--------|
| `scripts/test_agent.py` | Adapter le message de test (ex. "Quelle heure est-il ?") |
| `scripts/test_api_output.py` | Idem |
| `scripts/test_tools_quick.py` | Adapter pour tester `example_tool` |
| `scripts/test_serper_langfuse.py` | ❌ Supprimer (Serper retiré) |

---

## 4. Mise à jour du README

### 4.1 Section Stack (tableau)

Remplacer la ligne RAG par :

```markdown
| RAG | Optionnel — à configurer selon le projet |
```

Ou retirer la ligne si RAG supprimé.

### 4.2 Section Observabilité (nouvelle sous-section)

Ajouter après la section "Stack" ou dans "Variables d'environnement" :

```markdown
### Observabilité (optionnel)

Le template intègre **Langfuse** (tracing LLM) et **Sentry** (monitoring erreurs).
Ces services sont **optionnels** et peuvent être désactivés :

| Service | Variables | Comportement si non configuré |
|---------|-----------|-------------------------------|
| **Langfuse** | `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` | Dégradation silencieuse — l'agent fonctionne sans tracing |
| **Sentry** | `SENTRY_DSN` | Non initialisé — les erreurs ne sont pas envoyées |

Pour **désactiver** : ne pas définir ces variables dans `.env` (ou les laisser vides).
L'application fonctionne normalement sans elles.
```

### 4.3 Section Variables d'environnement

Mettre à jour la liste pour indiquer clairement les variables optionnelles :

```markdown
### Variables d'environnement (`.env`)

**Obligatoires** :
- `OPENAI_API_KEY`
- `DATABASE_URL` (pour le checkpointer)

**Optionnelles — Observabilité** (désactivées si absentes) :
- `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL`
- `SENTRY_DSN`

**Optionnelles — Autres** :
- `APP_ENV`, `LOG_LEVEL`, `SERPER_API_KEY`, etc.
```

### 4.4 Section Tools

Remplacer la table des 7 tools par :

```markdown
## Tools

Un **tool d'exemple** (`get_current_time`) est fourni pour illustrer la structure.
Voir `app/tools/example/example_tool.py` et le guide "Ajouter un nouveau tool" ci-dessous.
```

### 4.5 Section Structure

Mettre à jour l'arborescence pour refléter :
- `app/tools/example/` au lieu de `app/tools/projects/`
- Retirer les références aux scripts `ingest_bricks_*`
- Retirer `app/repository/projects.py`
- Adapter `app/models/domain/` (sans projects)

### 4.6 Section RAG

- Si RAG supprimé : retirer ou raccourcir la section
- Si RAG conservé : indiquer qu'il est à configurer selon le projet

---

## 5. Checklist d'exécution

### Phase 1 — Suppressions

- [ ] Supprimer `app/tools/projects/` (dossier entier)
- [ ] Supprimer `app/tools/utils/web_search_tool.py` (si on garde uniquement example_tool)
- [ ] Supprimer `app/repository/projects.py`
- [ ] Supprimer `app/models/domain/projects.py`
- [ ] Supprimer `scripts/ingest_bricks_knowledge.py`
- [ ] Supprimer `scripts/ingest_bricks_helpdesk.py`
- [ ] Supprimer `scripts/test_projects.py`
- [ ] Supprimer `scripts/test_serper_langfuse.py`
- [ ] Supprimer ou vider `rag/documents/`
- [ ] Supprimer `app/core/rag/` (si option 1 RAG)

### Phase 2 — Créations

- [ ] Créer `app/tools/example/example_tool.py`
- [ ] Créer `app/tools/example/__init__.py`

### Phase 3 — Modifications

- [ ] Modifier `app/tools/__init__.py`
- [ ] Modifier `app/agents/business/agent.py`
- [ ] Modifier `app/agents/business/prompt.py`
- [ ] Modifier `app/agents/main_prompt.py`
- [ ] Modifier `app/repository/__init__.py`
- [ ] Modifier `app/models/domain/__init__.py`
- [ ] Modifier `app/core/config.py` (retirer EXTERNAL_API_URL, éventuellement QDRANT)
- [ ] Modifier `app/main.py` (retirer router RAG si présent)
- [ ] Adapter `scripts/test_agent.py`, `test_api_output.py`, `test_tools_quick.py`
- [ ] Mettre à jour `README.md` (Stack, Observabilité, Variables, Tools, Structure)

### Phase 4 — Vérifications

- [ ] `uv run python scripts/test_agent.py -m "Quelle heure est-il ?"` → OK
- [ ] `uvicorn app.main:app --reload` → démarrage sans erreur
- [ ] `curl -X POST .../assistant -d '{"customer_message":"Quelle heure ?","conversation_history":[]}'` → réponse cohérente

---

## 6. Fichier .env

Tu as indiqué retirer l'URL depuis le fichier `.env`. Variables à retirer ou laisser vides :

- `EXTERNAL_API_URL` (plus utilisée après nettoyage)
- `QDRANT_URL` (si RAG supprimé)

---

## 7. Ordre recommandé

1. Créer le tool d'exemple (`app/tools/example/`)
2. Modifier l'agent et les prompts pour utiliser uniquement ce tool
3. Supprimer les tools projets et les dépendances (repository, models)
4. Supprimer le RAG (ou le simplifier)
5. Mettre à jour les scripts de test
6. Mettre à jour le README
7. Tester end-to-end
