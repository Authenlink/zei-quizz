"""
Outil de recherche dans la base de connaissances Qdrant (collection knowledge_docs).

Recherche hybride dense + BM25 dans les documents indexés depuis le site ZEI.
Retourne le contenu pertinent accompagné des URLs sources pour que l'agent
puisse les citer dans sa réponse.
"""

import logging
from typing import Optional

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
from qdrant_client import models

from app.core.llm import get_embeddings
from app.core.rag.qdrant_client import get_qdrant_client, get_sparse_model
from app.core.rag.vectorstore_docs import COLLECTION_KNOWLEDGE, MIN_SCORE

logger = logging.getLogger(__name__)

SEARCH_LIMIT = 5  # Chunks récupérés — on cible 2-3 sources uniques après dédup


class SearchKnowledgeInput(BaseModel):
    """Schéma d'entrée pour search_knowledge."""

    query: str = Field(
        description="Question ou sujet à rechercher dans la base de connaissances ZEI."
    )
    category: Optional[str] = Field(
        default=None,
        description="Catégorie optionnelle pour filtrer (ex: 'faq', 'general'). Laisser vide pour chercher partout.",
    )


def search_knowledge_impl(query: str, category: Optional[str] = None) -> str:
    """
    Recherche hybride (dense + BM25) dans knowledge_docs.

    Retourne une string structurée avec le contenu et les sources (URLs ou noms de page).
    Le LLM doit citer les sources dans sa réponse.
    """
    client = get_qdrant_client()

    if not client.collection_exists(COLLECTION_KNOWLEDGE):
        return "Aucune base de connaissances disponible pour le moment."

    try:
        contextualized = f"{category}: {query}" if category else query

        dense_query = get_embeddings().embed_query(contextualized)
        sparse_results = list(get_sparse_model().embed([contextualized]))
        sparse_query = models.SparseVector(
            indices=sparse_results[0].indices.tolist(),
            values=sparse_results[0].values.tolist(),
        )

        # Phase 1 — filtrage par catégorie si fournie
        if category:
            cat_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="category",
                        match=models.MatchValue(value=category),
                    )
                ]
            )
            phase1 = client.query_points(
                collection_name=COLLECTION_KNOWLEDGE,
                prefetch=[
                    models.Prefetch(query=dense_query, using="dense", limit=20, filter=cat_filter),
                    models.Prefetch(query=sparse_query, using="bm25", limit=20, filter=cat_filter),
                ],
                query=models.FusionQuery(fusion=models.Fusion.RRF),
                limit=3,
                with_payload=True,
            ).points
        else:
            phase1 = []

        # Phase 2 — recherche large sans filtre
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

        # Fusion et déduplication
        seen_ids: set = set()
        merged = []
        for point in phase1 + phase2:
            if point.id not in seen_ids and point.score >= MIN_SCORE:
                seen_ids.add(point.id)
                merged.append(point)

        if not merged:
            return "Aucun résultat pertinent trouvé pour cette question."

        # Déduplication par URL source (on veut 2-3 sources distinctes)
        seen_urls: set = set()
        chunks = []
        for point in merged:
            payload = point.payload or {}
            url = payload.get("url", "")
            source = payload.get("source", "")
            source_key = url if url else source

            if source_key and source_key in seen_urls:
                continue
            if source_key:
                seen_urls.add(source_key)

            content = payload.get("content", "").strip()
            if len(content) > 1200:
                content = content[:1200] + "..."

            category_label = payload.get("category", "")
            header_parts = []
            if category_label:
                header_parts.append(category_label)
            if source:
                header_parts.append(source)
            header = " › ".join(header_parts) if header_parts else "Source inconnue"

            source_line = f"SOURCE: {url}" if url else f"SOURCE: {source}"
            chunks.append(f"[{header}]\n{source_line}\n{content}")

            if len(chunks) >= 3:
                break

        if not chunks:
            return "Aucun résultat pertinent trouvé pour cette question."

        result = "\n\n---\n\n".join(chunks)
        return (
            f"Voici les informations trouvées dans la base de connaissances ZEI "
            f"({len(chunks)} source(s)) :\n\n{result}"
        )

    except Exception as e:
        logger.error(f"Erreur search_knowledge : {e}")
        return f"Erreur lors de la recherche : {e}"


search_knowledge_tool = StructuredTool.from_function(
    func=search_knowledge_impl,
    name="search_knowledge",
    description=(
        "Recherche des informations dans la base de connaissances ZEI. "
        "Utilise cet outil pour répondre à toute question sur ZEI : offres, tarifs, "
        "fonctionnalités, entreprise, équipe, processus, FAQ. "
        "Retourne le contenu pertinent avec les URLs sources à citer dans la réponse."
    ),
    args_schema=SearchKnowledgeInput,
)
