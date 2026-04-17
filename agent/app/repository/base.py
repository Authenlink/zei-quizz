"""Classe de base pour les repositories SQL."""

from typing import Any

from app.repository.database import execute_select


class BaseRepository:
    """
    Repository de base : encapsule execute_select pour les sous-classes.

    Usage :
        class MyRepository(BaseRepository):
            def get_something(self, id: str) -> dict | None:
                rows = self.execute_select("SELECT ...", {"id": id})
                return rows[0] if rows else None
    """

    def execute_select(
        self, sql: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Délègue à app.repository.database.execute_select."""
        return execute_select(sql, params)
