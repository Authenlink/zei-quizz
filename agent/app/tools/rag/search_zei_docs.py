"""
Outil de recherche RAG restreint aux guides ZEI (CSRD, collecte ESG, RSE, offre).

Même moteur hybride que search_knowledge, avec filtre category ∈ guides officiels.
"""

from typing import Literal, Optional

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.tools.rag.knowledge_tool_common import ZEI_DOC_CATEGORIES, hybrid_search_knowledge_for_tool

ZeiCategory = Literal["csrd", "esg-collecte", "rse-performance", "zei-offre"]


class SearchZeiDocsInput(BaseModel):
    """Schéma d'entrée pour search_zei_docs."""

    query: str = Field(
        description="Question ou mots-clés sur CSRD, VSME, collecte ESG, RSE, offre ZEI, etc."
    )
    category: Optional[ZeiCategory] = Field(
        default=None,
        description=(
            "Filtre optionnel : un seul thème parmi csrd, esg-collecte, rse-performance, zei-offre. "
            "Laisser vide pour chercher dans les quatre."
        ),
    )


def search_zei_docs_impl(
    query: str,
    category: Optional[ZeiCategory] = None,
) -> str:
    """Recherche dans knowledge_docs limitée aux dossiers zei/<cat>/."""
    return hybrid_search_knowledge_for_tool(
        query,
        category,
        allowed_categories=ZEI_DOC_CATEGORIES,
    )


search_zei_docs_tool = StructuredTool.from_function(
    func=search_zei_docs_impl,
    name="search_zei_docs",
    description=(
        "Recherche dans les guides et documents ZEI officiels (livres blancs, CSRD, VSME, "
        "collecte ESG, RSE, plaquettes). Utiliser en priorité pour : définitions réglementaires "
        "(VSME, CSRD), méthodes de collecte ESG, RSE performance, offre commerciale ZEI. "
        "Retourne des extraits avec source_url pour citations Markdown."
    ),
    args_schema=SearchZeiDocsInput,
)
