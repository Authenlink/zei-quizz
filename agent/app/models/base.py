"""Modèles de base pour l'API."""

from typing import Literal

from pydantic import BaseModel, ConfigDict


class MessageHistory(BaseModel):
    """Un message dans l'historique de conversation."""

    role: Literal["human", "assistant"]
    content: str


class ChatInput(BaseModel):
    """Schéma d'entrée pour les endpoints de chat."""

    model_config = ConfigDict(populate_by_name=True)

    customer_message: str
    conversation_history: list[MessageHistory] = []
    customer_id: str | None = None
