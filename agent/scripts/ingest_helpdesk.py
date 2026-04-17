"""
(Re-)ingestion de helpdesk — articles du centre d'aide.

Collection dédiée séparée de knowledge_docs :
  - Cas d'usage différent : récupération de titre + URL, pas de contenu long
  - Isolation : ré-indexer les articles n'affecte pas la base documentaire

⚠️ Ajoutez vos propres articles dans rag/documents/helpdesk/*.md
   avant d'exécuter ce script.

Format attendu pour chaque article (section H3) :
    ### Titre de l'article
    URL: https://example.com/article/...
    Catégorie: questions-generales
    Mots-clés: mot1, mot2, mot3

    Corps de l'article (optionnel)...

Chaque section H3 → 1 point dans helpdesk.
Payload : title, url, keywords, sub_category, content.

Usage :
    python scripts/ingest_helpdesk.py --dry-run   # Valider l'extraction
    python scripts/ingest_helpdesk.py             # Indexation réelle
"""

import argparse
import logging
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from app.core.rag.vectorstore_docs import (
    COLLECTION_HELPDESK,
    create_helpdesk_collection,
    upsert_chunks,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# Articles sans corps : on accepte dès que titre + mots-clés font ≥ 3 mots
MIN_WORDS = 3
HELPDESK_DIR = Path(__file__).resolve().parent.parent / "rag" / "documents" / "helpdesk"


def parse_helpdesk_articles(file_path: Path) -> list[dict]:
    """
    Découpe un fichier helpdesk en chunks individuels (1 chunk = 1 article H3).

    Pour chaque article, extrait :
      title        → texte du header ### (ex: "Comment déposer de l'argent ?")
      url          → lien complet
      keywords     → liste de mots-clés (champ "Mots-clés:")
      sub_category → catégorie (champ "Catégorie:")
      content      → titre + corps si présent, sinon titre + mots-clés

    Les articles sans corps sont indexés avec titre + mots-clés :
    cela donne des embeddings denses suffisamment discriminants pour la
    recherche sémantique, sans exclure des articles valides.
    """
    raw = file_path.read_text(encoding="utf-8")
    source = file_path.stem
    chunks = []

    # Découper par section H3
    sections = re.split(r'\n(?=### )', raw)

    for section in sections:
        section = section.strip()
        if not section.startswith("###"):
            continue

        lines = section.split("\n")
        title = lines[0].lstrip("#").strip()

        url = ""
        keywords = []
        sub_category = ""
        body_lines = []
        in_meta = True

        for line in lines[1:]:
            stripped = line.strip()
            if in_meta:
                if stripped.startswith("URL:"):
                    url = stripped[4:].strip()
                elif stripped.lower().startswith(("catégorie:", "categorie:")):
                    sub_category = stripped.split(":", 1)[1].strip()
                elif stripped.lower().startswith(("mots-clés:", "mots-cles:")):
                    raw_kw = stripped.split(":", 1)[1].strip()
                    keywords = [k.strip() for k in raw_kw.split(",") if k.strip()]
                elif stripped == "" and not body_lines:
                    continue
                else:
                    in_meta = False
                    if stripped:
                        body_lines.append(line)
            else:
                body_lines.append(line)

        body = "\n".join(body_lines).strip()

        if body:
            indexed_text = f"{title}\n\n{body}"
        elif keywords:
            # Enrichir avec les mots-clés quand il n'y a pas de corps
            indexed_text = f"{title}\n\nMots-clés: {', '.join(keywords)}"
        else:
            indexed_text = title

        if len(indexed_text.split()) < MIN_WORDS:
            logger.warning(f"Article ignoré (trop court) : '{title}'")
            continue

        chunks.append({
            "content": indexed_text,
            "metadata": {
                "title": title,
                "url": url,
                "keywords": keywords,
                "sub_category": sub_category,
                "source": source,
                "doc_type": "helpdesk_article",
                "priority": "High",
            },
        })

    logger.info(f"  {file_path.name} → {len(chunks)} articles parsés")
    return chunks


def main():
    parser = argparse.ArgumentParser(description="Ingestion helpdesk")
    parser.add_argument("--dry-run", action="store_true", help="Afficher les articles sans indexer")
    args = parser.parse_args()

    if not HELPDESK_DIR.exists():
        logger.error(
            f"Dossier introuvable : {HELPDESK_DIR}. "
            "Créez le dossier et ajoutez vos articles Markdown."
        )
        sys.exit(1)

    all_chunks = []
    for md_file in sorted(HELPDESK_DIR.glob("*.md")):
        all_chunks.extend(parse_helpdesk_articles(md_file))

    if not all_chunks:
        logger.error(
            "Aucun article trouvé. Ajoutez vos articles dans rag/documents/helpdesk/*.md "
            "au format décrit dans la docstring du script."
        )
        sys.exit(1)

    logger.info(f"\nTotal : {len(all_chunks)} articles trouvés")

    if args.dry_run:
        logger.info("\n--- DRY RUN (aucune indexation) ---")
        for chunk in all_chunks[:5]:
            meta = chunk["metadata"]
            logger.info(f"\n  Titre    : {meta['title']}")
            logger.info(f"  URL      : {meta['url']}")
            logger.info(f"  Keywords : {meta['keywords']}")
            logger.info(f"  Sous-cat : {meta['sub_category']}")
            logger.info(f"  Contenu  : {chunk['content'][:200]}...")
        if len(all_chunks) > 5:
            logger.info(f"\n  ... et {len(all_chunks) - 5} autres articles")
        return

    logger.info(f"\nCréation de la collection '{COLLECTION_HELPDESK}'...")
    create_helpdesk_collection()

    logger.info(f"Indexation de {len(all_chunks)} articles...")
    total = upsert_chunks(COLLECTION_HELPDESK, all_chunks)

    logger.info(f"\n✓ {total} articles indexés dans '{COLLECTION_HELPDESK}'")


if __name__ == "__main__":
    main()
