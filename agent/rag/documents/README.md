# Documents RAG

Ce dossier contient les documents Markdown indexés dans Qdrant pour le RAG (Retrieval Augmented Generation).

## ⚠️ Ajoutez vos propres documents

**Le template est livré vide.** Vous devez ajouter vos propres documents avant d'exécuter les scripts d'ingestion.

## Structure

- **`<category>/*.md`** — Base documentaire générale (indexée par `ingest_knowledge.py`)
  - Chaque sous-dossier = une catégorie (ex: `blog/`, `zei_site/`, `general/`, ou `zei/csrd/` imbriqué)
  - Le nom du dossier qui contient directement les `.md` devient la métadonnée `category` pour le filtrage Qdrant

- **Fichiers `.md` à la racine de ce dossier** — Indexés avec la catégorie payload **`root`** (sauf `README.md`).

- **`helpdesk/*.md`** — Articles du centre d'aide (indexés par `ingest_helpdesk.py`)
  - Format spécial : sections H3 avec métadonnées (URL, Catégorie, Mots-clés)
  - Voir la docstring de `scripts/ingest_helpdesk.py` pour le format exact

## Indexation

```bash
# Base documentaire (rag/documents/<category>/*.md)
python scripts/ingest_knowledge.py --dry-run   # Valider
python scripts/ingest_knowledge.py             # Indexer

# Centre d'aide (rag/documents/helpdesk/*.md)
python scripts/ingest_helpdesk.py --dry-run    # Valider
python scripts/ingest_helpdesk.py              # Indexer
```

## Format des documents

- Fichiers `.md` avec titres (`#`, `##`, `###`)
- Chunking adaptatif : documents courts, headers, tableaux

## Catégorie `zei/` — Knowledge base ZEI officielle

La sous-arborescence `zei/` regroupe les documents Zei convertis depuis les PDFs sources (livres blancs, plaquettes, propositions). Elle est **synchronisée**, pas éditée à la main ici.

### Structure

```
zei/
├── csrd/                  # CSRD, ESRS, VSME
├── esg-collecte/          # Collecte ESG, qualité de la donnée
├── rse-performance/       # ROI RSE, témoignages, projection 2027
└── zei-offre/             # Plaquette, propositions commerciales
```

### Source de vérité

La source unique est [`docs/zei-knowledge/<category>/*.md`](../../../docs/zei-knowledge/) à la racine du repo. Ne pas modifier les fichiers `agent/rag/documents/zei/...` directement : ils seraient écrasés au prochain sync.

### Sync

```bash
# Depuis la racine du repo
bash scripts/sync-zei-knowledge.sh
```

- Idempotent (`rsync --delete`)
- Copie uniquement les `*.md` des 4 sous-dossiers
- N'embarque pas `INDEX.md` ni `.tmp/`

### Frontmatter YAML

Chaque `.md` ZEI commence par un frontmatter parsé par `ingest_knowledge.py` (via `python-frontmatter`) :

```yaml
---
title: "Titre lisible du document"
source_pdf: "docs/<nom du PDF>.pdf"
source_url: "https://..."
category: csrd                          # csrd | esg-collecte | rse-performance | zei-offre
theme_slugs: [csrd, obligations-2025-2026]
applicable_year: 2025                   # optionnel
audience: ["dirigeant", "rse-manager"]  # optionnel
priority: high                          # high | medium | low
---
```

Métadonnées propagées dans Qdrant (en plus des champs legacy `category`, `source`, `doc_type`, `priority`, `chunk_index`) :

- `source_url`
- `title`
- `theme_slugs`
- `applicable_year` (si présent)
- `audience` (si présent)

Les fichiers `.md` **sans** frontmatter restent supportés (rétrocompatibilité : comportement legacy `priority="Medium"`).
