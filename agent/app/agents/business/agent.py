"""
Agent assistant — un tool d'exemple.

Pour ajouter vos propres tools :
  1. Créer app/tools/<categorie>/<nom_outil>.py
  2. Exporter depuis app/tools/<categorie>/__init__.py
  3. Importer ici et ajouter à TOOLS_PUBLIC ou TOOLS_REQUIRING_CUSTOMER_ID
  4. Mettre à jour <tools_selection> dans prompt.py
"""

from app.tools.example import example_tool
from app.tools.rag import search_knowledge_tool

TOOLS_PUBLIC = [example_tool, search_knowledge_tool]
TOOLS_REQUIRING_CUSTOMER_ID = []


def get_tools(has_customer_id: bool = True) -> list:
    """Retourne la liste des outils."""
    return TOOLS_PUBLIC
