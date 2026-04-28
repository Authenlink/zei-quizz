"""
Logique partagée pour search_knowledge et search_zei_docs (hybride Qdrant + formatage).
"""

from __future__ import annotations

import logging
from typing import Optional

from qdrant_client import models

from app.core.llm import get_embeddings
from app.core.rag.qdrant_client import get_qdrant_client, get_sparse_model
from app.core.rag.vectorstore_docs import (
    COLLECTION_KNOWLEDGE,
    MIN_SCORE,
    payload_document_url,
)

logger = logging.getLogger(__name__)

SEARCH_LIMIT = 5

# Guides ZEI officiels (dossiers sous rag/documents/zei/<cat>/)
ZEI_DOC_CATEGORIES = ("csrd", "esg-collecte", "rse-performance", "zei-offre")


def _embed_query_vectors(contextualized: str) -> tuple[list[float], models.SparseVector]:
    dense_query = get_embeddings().embed_query(contextualized)
    sparse_results = list(get_sparse_model().embed([contextualized]))
    sparse_query = models.SparseVector(
        indices=sparse_results[0].indices.tolist(),
        values=sparse_results[0].values.tolist(),
    )
    return dense_query, sparse_query


def _merge_phases(phase1: list, phase2: list) -> list:
    seen_ids: set = set()
    merged = []
    for point in phase1 + phase2:
        if point.id not in seen_ids and point.score >= MIN_SCORE:
            seen_ids.add(point.id)
            merged.append(point)
    return merged


def _format_chunks_for_agent(merged: list) -> str:
    """Formate les points pour l’outil agent (dédup par URL/titre, max 3 blocs)."""
    seen_keys: set = set()
    chunks: list[str] = []
    for point in merged:
        payload = point.payload or {}
        url = payload_document_url(payload)
        source = payload.get("source", "") or ""
        title = (payload.get("title") or "").strip()
        source_key = url if url else (title or source)

        if source_key and source_key in seen_keys:
            continue
        if source_key:
            seen_keys.add(source_key)

        content = payload.get("content", "").strip()
        if len(content) > 1200:
            content = content[:1200] + "..."

        category_label = payload.get("category", "")
        header_parts = []
        if category_label:
            header_parts.append(category_label)
        if title:
            header_parts.append(title)
        elif source:
            header_parts.append(source)
        header = " › ".join(header_parts) if header_parts else "Source inconnue"

        if url:
            source_line = f"source_url: {url}"
        elif title:
            source_line = f"source_url: (non disponible) — titre: {title}"
        else:
            source_line = f"source_url: (non disponible) — source: {source}"

        chunks.append(f"[{header}]\n{source_line}\n{content}")

        if len(chunks) >= 3:
            break

    if not chunks:
        return ""

    result = "\n\n---\n\n".join(chunks)
    return (
        f"Voici les informations trouvées dans la base de connaissances ZEI "
        f"({len(chunks)} source(s)) :\n\n{result}"
    )


def hybrid_search_knowledge_for_tool(
    query: str,
    category: Optional[str] = None,
    *,
    allowed_categories: Optional[tuple[str, ...]] = None,
) -> str:
    """
    Recherche hybride 2 phases dans knowledge_docs.

    - allowed_categories=None : même comportement large que l’historique (phase 2 sans filtre catégorie).
    - allowed_categories=tuple : phase 2 (et phase 1 si besoin) restent dans ces catégories (ex. guides ZEI).
    """
    client = get_qdrant_client()

    if not client.collection_exists(COLLECTION_KNOWLEDGE):
        return "Aucune base de connaissances disponible pour le moment."

    contextualized = f"{category}: {query}" if category else query
    dense_query, sparse_query = _embed_query_vectors(contextualized)

    def filter_cat_only(match: models.Match) -> models.Filter:
        return models.Filter(
            must=[models.FieldCondition(key="category", match=match)],
        )

    phase1: list = []
    phase2: list = []

    try:
        if allowed_categories is not None:
            zei_any = filter_cat_only(
                models.MatchAny(any=list(allowed_categories)),
            )
            if category:
                single = filter_cat_only(
                    models.MatchValue(value=category),
                )
                phase1 = client.query_points(
                    collection_name=COLLECTION_KNOWLEDGE,
                    prefetch=[
                        models.Prefetch(
                            query=dense_query, using="dense", limit=20, filter=single
                        ),
                        models.Prefetch(
                            query=sparse_query, using="bm25", limit=20, filter=single
                        ),
                    ],
                    query=models.FusionQuery(fusion=models.Fusion.RRF),
                    limit=3,
                    with_payload=True,
                ).points
            phase2 = client.query_points(
                collection_name=COLLECTION_KNOWLEDGE,
                prefetch=[
                    models.Prefetch(
                        query=dense_query, using="dense", limit=20, filter=zei_any
                    ),
                    models.Prefetch(
                        query=sparse_query, using="bm25", limit=20, filter=zei_any
                    ),
                ],
                query=models.FusionQuery(fusion=models.Fusion.RRF),
                limit=SEARCH_LIMIT,
                with_payload=True,
            ).points
        else:
            if category:
                cat_filter = filter_cat_only(models.MatchValue(value=category))
                phase1 = client.query_points(
                    collection_name=COLLECTION_KNOWLEDGE,
                    prefetch=[
                        models.Prefetch(
                            query=dense_query, using="dense", limit=20, filter=cat_filter
                        ),
                        models.Prefetch(
                            query=sparse_query, using="bm25", limit=20, filter=cat_filter
                        ),
                    ],
                    query=models.FusionQuery(fusion=models.Fusion.RRF),
                    limit=3,
                    with_payload=True,
                ).points
            phase2 = client.query_points(
                collection_name=COLLECTION_KNOWLEDGE,
                prefetch=[
                    models.Prefetch(query=dense_query, using="dense", limit=20),
                    models.Prefetch(query=sparse_query, using="bm25", limit=20),
                ],
                query=models.FusionQuery(fusion=models.Fusion.RRF),
                limit=SEARCH_LIMIT,
                with_payload=True,
            ).points

        merged = _merge_phases(phase1, phase2)
        if not merged:
            return "Aucun résultat pertinent trouvé pour cette question."

        out = _format_chunks_for_agent(merged)
        if not out:
            return "Aucun résultat pertinent trouvé pour cette question."
        return out

    except Exception as e:
        logger.error("Erreur hybrid_search_knowledge_for_tool : %s", e)
        return f"Erreur lors de la recherche : {e}"
