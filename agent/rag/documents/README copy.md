# Documents RAG

Ce dossier contient les documents Markdown indexés dans Qdrant pour le RAG (Retrieval Augmented Generation).

## ⚠️ Ajoutez vos propres documents

**Le template est livré vide.** Vous devez ajouter vos propres documents avant d'exécuter les scripts d'ingestion.

## Structure

- **`<category>/*.md`** — Base documentaire générale (indexée par `ingest_knowledge.py`)
  - Chaque sous-dossier = une catégorie (ex: `general/`, `faq/`, `guide/`)
  - Le nom du dossier devient la métadonnée `category` pour le filtrage

- **`helpdesk/*.md`** — Articles du centre d'aide (indexés par `ingest_helpdesk.py`)
  - Format spécial : sections H3 avec métadonnées (URL, Catégorie, Mots-clés)
  - Voir la docstring de `scripts/ingest_helpdesk.py` pour le format exact

## Indexation

```bash
# (Optionnel) Crawl du site ZEI → Markdown + frontmatter sous zei_site/, blog/, zei_positioning/
python scripts/crawl_zei_world.py --dry-run
python scripts/crawl_zei_world.py

# Base documentaire (rag/documents/<category>/*.md)
PYTHONPATH=. python scripts/ingest_knowledge.py --dry-run   # Valider
PYTHONPATH=. python scripts/ingest_knowledge.py             # Indexer

# Centre d'aide (rag/documents/helpdesk/*.md)
PYTHONPATH=. python scripts/ingest_helpdesk.py --dry-run    # Valider
PYTHONPATH=. python scripts/ingest_helpdesk.py              # Indexer
```

## Format des documents

- Fichiers `.md` avec titres (`#`, `##`, `###`)
- Chunking adaptatif : documents courts, headers, tableaux
- Optionnel : **frontmatter YAML** (`---` … `---`) pour titres, URL canonique, mots-clés, etc.
  (généré par `scripts/crawl_zei_world.py` pour le site ZEI)
