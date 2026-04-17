"""
Module d'exécution SQL minimal pour les tools.

Exécute des requêtes SELECT avec paramètres nommés (psycopg %(name)s).
Utilisé par les tools Investors (étape 4) avant généralisation Repository (étape 5).
"""

import logging
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.core.config import DATABASE_URL

logger = logging.getLogger(__name__)


def execute_select(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """
    Exécute une requête SELECT avec paramètres nommés.

    Args:
        sql: Requête SQL avec placeholders %(name)s
        params: Dictionnaire de paramètres (ex: {"customer_id": "uuid"})

    Returns:
        Liste de dictionnaires, un par ligne (clés = noms des colonnes)

    Raises:
        RuntimeError: Si DATABASE_URL n'est pas configuré
    """
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL non configuré. Définir DATABASE_URL dans .env pour accéder à la base."
        )

    params = params or {}

    try:
        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                return [dict(row) for row in rows]
    except psycopg.Error as e:
        logger.exception("Erreur SQL: %s", e)
        raise
