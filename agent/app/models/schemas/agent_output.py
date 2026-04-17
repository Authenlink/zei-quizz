"""
Schéma de réponse de l'agent (référence pour template).

Pour la template, l'API retourne simplement {"message": "..."}.
Ce fichier est conservé pour référence future si vous souhaitez
implémenter un output structuré (JSON) par catégorie.
"""

from pydantic import BaseModel


class AgentMessageOutput(BaseModel):
    """Réponse simple de l'agent — message texte."""

    message: str


# Pour un projet avec output JSON structuré, définir ici les schémas par catégorie.
# Exemple : AgentOutput avec projects, referral, etc.
