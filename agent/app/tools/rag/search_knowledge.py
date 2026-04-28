"""
Outil de recherche dans la base de connaissances Qdrant (collection knowledge_docs).

Recherche hybride dense + BM25 dans les documents indexés depuis le site ZEI.
Retourne le contenu pertinent accompagné des URLs sources pour que l'agent
puisse les citer dans sa réponse.
"""

from typing import Optional

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.tools.rag.knowledge_tool_common import hybrid_search_knowledge_for_tool


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

    Retourne une string structurée avec le contenu et les sources (source_url ou noms).
    Le LLM doit citer les sources dans sa réponse.
    """
    return hybrid_search_knowledge_for_tool(
        query,
        category,
        allowed_categories=None,
    )


search_knowledge_tool = StructuredTool.from_function(
    func=search_knowledge_impl,
    name="search_knowledge",
    description=(
        "Recherche des informations dans la base de connaissances ZEI. "
        "Utilise cet outil pour répondre à toute question sur ZEI : offres, tarifs, "
        "fonctionnalités, entreprise, équipe, processus, FAQ. "
        "Retourne le contenu pertinent avec source_url (ou intitulé) à citer dans la réponse."
    ),
    args_schema=SearchKnowledgeInput,
)
