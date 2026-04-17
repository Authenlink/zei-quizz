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
