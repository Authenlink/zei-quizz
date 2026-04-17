"""
Middleware de nettoyage des messages excédentaires après chaque appel au modèle.

Stratégie : garde les N premiers + M derniers messages pour maintenir
le contexte de début de conversation tout en limitant la taille de l'état.

Références : docs/05_memoire_persistance.md — Chapitre 20.3
"""

from langchain.agents.middleware.types import AgentMiddleware, AgentState
from langchain_core.messages import RemoveMessage
from langgraph.graph.message import REMOVE_ALL_MESSAGES
from langgraph.runtime import Runtime


class SmartCleanupMiddleware(AgentMiddleware):
    """Garde les N premiers + M derniers messages. Opère en after_model."""

    def __init__(
        self,
        max_messages_before_cleanup: int = 50,
        keep_first_messages: int = 6,
        keep_last_messages: int = 20,
    ):
        super().__init__()
        self.max_messages_before_cleanup = max_messages_before_cleanup
        self.keep_first_messages = keep_first_messages
        self.keep_last_messages = keep_last_messages

    def after_model(self, state: AgentState, runtime: Runtime):
        messages = state["messages"]
        if len(messages) <= self.max_messages_before_cleanup:
            return None
        if self.keep_first_messages + self.keep_last_messages >= len(messages):
            return None
        return {
            "messages": [
                RemoveMessage(id=REMOVE_ALL_MESSAGES),
                *messages[: self.keep_first_messages],
                *messages[-self.keep_last_messages :],
            ]
        }
