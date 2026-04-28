"""
(Re-)ingestion de knowledge_docs — base documentaire générale.

Indexe rag/documents/{category}/*.md, SAUF le dossier helpdesk/
(géré séparément par ingest_helpdesk.py).

⚠️ Ajoutez vos propres documents Markdown dans rag/documents/<category>/
   avant d'exécuter ce script. Exemples de catégories : "general", "faq", "guide".

Le nom du dossier parent = métadonnée "category" du chunk.

Chunking adaptatif (guide ch. 15) :
  - Document court (≤ 1200 chars)   → 1 chunk = document entier
  - Headers Markdown détectés       → split sémantique par headers, puis re-split si trop long
  - Pas de headers                  → split direct par taille (fallback)
  - Tableaux (>50% de lignes |)     → protégés, pas de re-split
  - Chunks < 20 mots                → filtrés
  - Headers parents absents         → préfixés dans le chunk pour le contexte

Usage :
    python scripts/ingest_knowledge.py --dry-run   # Valider le chunking
    python scripts/ingest_knowledge.py             # Indexation réelle
"""

import argparse
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import frontmatter
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

from app.core.rag.vectorstore_docs import (
    COLLECTION_KNOWLEDGE,
    create_knowledge_collection,
    upsert_chunks,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# Paramètres de chunking (guide ch. 15.2)
CHUNK_SIZE = 1200       # ~200-300 tokens — assez pour un paragraphe complet
CHUNK_OVERLAP = 200     # 16% de chevauchement — évite les coupures en plein milieu d'une idée
MIN_CHUNK_WORDS = 20    # Filtre les headers seuls, lignes vides, fragments résiduels

DOCS_ROOT = Path(__file__).resolve().parent.parent / "rag" / "documents"
EXCLUDED_CATEGORIES = {"helpdesk"}  # Géré par ingest_helpdesk.py

# Clés de frontmatter propagées dans Qdrant (uniquement si présentes).
# Voir docs/zei-knowledge/<category>/*.md et agent/rag/documents/README.md.
PROPAGATED_FRONTMATTER_KEYS = (
    "source_url",
    "title",
    "theme_slugs",
    "applicable_year",
    "audience",
)


# ---------------------------------------------------------------------------
# Helpers de chunking
# ---------------------------------------------------------------------------

def _is_table_content(text: str) -> bool:
    """
    Détecte si un chunk est majoritairement un tableau Markdown.
    Si >50% des lignes commencent par |, le chunk est protégé du re-split.
    """
    lines = [l for l in text.strip().split("\n") if l.strip()]
    if len(lines) < 3:
        return False
    return sum(1 for l in lines if l.strip().startswith("|")) > len(lines) * 0.5


def _filter_and_prefix_chunks(docs: list[Document]) -> list[str]:
    """
    Filtre les chunks trop courts.
    Préfixe les headers parents manquants (guide ch. 15.6) :
    un chunk découpé perd son contexte si le header H1/H2 n'y figure pas.
    Ex : '[Guide Financier > Investissements]\n### Matériel\nLe budget...'
    """
    results = []
    for doc in docs:
        if len(doc.page_content.split()) < MIN_CHUNK_WORDS:
            continue
        text = doc.page_content.strip()
        prefix_parts = []
        for key in ("h1", "h2"):
            val = doc.metadata.get(key, "")
            if val and val not in text:
                prefix_parts.append(val)
        if prefix_parts:
            text = f"[{' > '.join(prefix_parts)}]\n{text}"
        results.append(text)
    return results


def chunk_document(
    content: str,
    md_splitter: MarkdownHeaderTextSplitter,
    text_splitter: RecursiveCharacterTextSplitter,
) -> list[str]:
    """
    Chunking adaptatif 3 chemins (guide ch. 15.4) :
      1. Court (≤ CHUNK_SIZE)   → garder tel quel
      2. Headers Markdown        → split sémantique + re-split si trop long
      3. Fallback                → split direct par taille
    """
    content = content.strip()
    if len(content.split()) < MIN_CHUNK_WORDS:
        return []
    if len(content) <= CHUNK_SIZE:
        return [content]

    has_headers = any(l.startswith("#") for l in content.split("\n") if l.strip())

    if has_headers:
        md_docs = md_splitter.split_text(content)
        if md_docs:
            fine_docs = []
            for doc in md_docs:
                if _is_table_content(doc.page_content):
                    fine_docs.append(doc)              # Tableau → protéger
                else:
                    fine_docs.extend(text_splitter.split_documents([doc]))

            chunks = _filter_and_prefix_chunks(fine_docs)
            if chunks:
                return chunks

    # Fallback : split direct par taille
    raw_docs = text_splitter.split_documents([Document(page_content=content)])
    chunks = _filter_and_prefix_chunks(raw_docs)

    # Dernier recours : garder le document tronqué plutôt que rien
    if not chunks and len(content.split()) >= MIN_CHUNK_WORDS:
        return [content[: CHUNK_SIZE * 2]]

    return chunks


# ---------------------------------------------------------------------------
# Chargement des documents
# ---------------------------------------------------------------------------

def _iter_category_dirs(root: Path):
    """
    Yields (category_name, dir_path) pour chaque dossier contenant des .md.

    Supporte deux structures :
      - rag/documents/<category>/*.md           (legacy : general, faq, guide)
      - rag/documents/<top>/<category>/*.md     (nested : zei/csrd, zei/esg-collecte, ...)

    Le `category` retenu est toujours le nom du dossier qui contient
    directement les .md (correspond au champ `category` du frontmatter).
    Les dossiers `helpdesk/` et leurs descendants sont exclus.
    """
    for top_dir in sorted(root.iterdir()):
        if not top_dir.is_dir() or top_dir.name in EXCLUDED_CATEGORIES:
            continue
        # Niveau 1 : .md directement dans le dossier ?
        has_direct_md = any(top_dir.glob("*.md"))
        if has_direct_md:
            yield top_dir.name, top_dir
        # Niveau 2 : sous-dossiers contenant des .md (structure imbriquée)
        for sub_dir in sorted(top_dir.iterdir()):
            if not sub_dir.is_dir() or sub_dir.name in EXCLUDED_CATEGORIES:
                continue
            if any(sub_dir.glob("*.md")):
                yield sub_dir.name, sub_dir

    # Fichiers .md à la racine de rag/documents/ (hors README.md)
    has_root_md = any(
        p.is_file() and p.suffix == ".md" and p.name.lower() != "readme.md"
        for p in root.iterdir()
    )
    if has_root_md:
        yield "root", root


def load_knowledge_chunks() -> list[dict]:
    """
    Parcourt rag/documents/{category}/*.md et rag/documents/{top}/{category}/*.md
    (hors helpdesk).
    category = nom du dossier qui contient directement les .md → stocké en
    metadata pour filtrage Qdrant.
    Inclut les .md à la racine de rag/documents/ sous la catégorie payload « root » (sauf README.md).
    """
    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[("#", "h1"), ("##", "h2"), ("###", "h3")],
        strip_headers=False,  # Garder les headers dans le contenu du chunk
    )
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " "],
    )

    all_chunks = []

    for category, category_dir in _iter_category_dirs(DOCS_ROOT):
        for md_file in sorted(category_dir.glob("*.md")):
            if category == "root" and md_file.name.lower() == "readme.md":
                continue
            content = md_file.read_text(encoding="utf-8")
            if not content.strip():
                logger.warning(f"Fichier vide ignoré : {category}/{md_file.name}")
                continue

            # Parsing frontmatter YAML (rétrocompatible : fm == {} si absent).
            post = frontmatter.loads(content)
            fm = post.metadata or {}
            body = post.content if fm else content

            raw_chunks = chunk_document(body, md_splitter, text_splitter)
            if not raw_chunks:
                logger.warning(f"Aucun chunk valide : {category}/{md_file.name}")
                continue

            base_meta = {
                "category": category,
                "source": md_file.stem,
                "doc_type": "knowledge",
                "priority": fm.get("priority") or "Medium",
                "keywords": [],
            }
            for key in PROPAGATED_FRONTMATTER_KEYS:
                if key in fm and fm[key] is not None:
                    base_meta[key] = fm[key]

            for i, text in enumerate(raw_chunks):
                all_chunks.append({
                    "content": text,
                    "metadata": {**base_meta, "chunk_index": i},
                })

            extra = " (frontmatter)" if fm else ""
            logger.info(f"  {category}/{md_file.name} → {len(raw_chunks)} chunks{extra}")

    logger.info(f"\nTotal : {len(all_chunks)} chunks (knowledge_docs)")
    return all_chunks


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingestion knowledge_docs")
    parser.add_argument("--dry-run", action="store_true", help="Afficher les chunks sans indexer")
    args = parser.parse_args()

    chunks = load_knowledge_chunks()
    if not chunks:
        logger.error(
            "Aucun chunk généré. Ajoutez vos documents Markdown dans rag/documents/<category>/ "
            "(ex: rag/documents/general/, rag/documents/faq/)."
        )
        sys.exit(1)

    if args.dry_run:
        logger.info(f"\n--- DRY RUN — {len(chunks)} chunks (aucune indexation) ---")
        # On échantillonne 1 chunk par couple (category, source) pour bien
        # visualiser la metadata enrichie (notamment source_url) sur tous les docs.
        seen: set[tuple[str, str]] = set()
        sample: list[dict] = []
        for chunk in chunks:
            meta = chunk["metadata"]
            key = (meta.get("category", ""), meta.get("source", ""))
            if key in seen:
                continue
            seen.add(key)
            sample.append(chunk)
        for chunk in sample:
            meta = chunk["metadata"]
            logger.info(
                f"\n  [{meta['category']}] {meta['source']} — chunk {meta['chunk_index']} "
                f"— {len(chunk['content'].split())} mots — priority={meta.get('priority')}"
            )
            for key in PROPAGATED_FRONTMATTER_KEYS:
                if key in meta:
                    logger.info(f"    {key}: {meta[key]}")
            logger.info(f"  {chunk['content'][:200]}...")
        logger.info(f"\n  Echantillon : {len(sample)} doc(s) sur {len(chunks)} chunks total")
        return

    logger.info(f"\nCréation de la collection '{COLLECTION_KNOWLEDGE}'...")
    create_knowledge_collection()

    logger.info(f"Indexation de {len(chunks)} chunks...")
    total = upsert_chunks(
        COLLECTION_KNOWLEDGE,
        chunks,
        deterministic_ids=True,
    )

    logger.info(f"\n✓ {total} points indexés dans '{COLLECTION_KNOWLEDGE}'")
    logger.info(f"Coût embeddings estimé : ~${total * 300 / 1_000_000 * 0.13:.4f}")


if __name__ == "__main__":
    main()
