"""
Middleware de compression de l'historique de conversation.

Points spécifiques à ce projet :
- Les AIMessage contenant du JSON pur ne sont PAS résumés (structure préservée).
- Les ToolMessage (résultats d'outils — JSON brut) sont filtrés avant résumé.
- Protection obligatoire contre les cycles outil (tool_calls en cours).

Références : docs/05_memoire_persistance.md — Chapitre 19.4
"""

from langchain.agents.middleware.summarization import (
    SummarizationMiddleware as BaseSummarizationMiddleware,
    _DEFAULT_FALLBACK_MESSAGE_COUNT,
)
from langchain.agents.middleware.types import AgentState
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, ToolMessage
from langchain_core.messages.utils import trim_messages
from langgraph.runtime import Runtime

FACTUAL_SUMMARY_PROMPT = """
You are a context compression system for a conversational agent.

Rules:
- Preserve ALL factual information (numbers, dates, decisions, names).
- Preserve user preferences, constraints, and explicit refusals.
- Do NOT add assumptions or interpretations.
- Do NOT use narrative style - use concise bullet points.
- Mark uncertain information explicitly as [UNCERTAIN].

Conversation history to compress:
{messages}

Return ONLY the compressed factual context as bullet points.
""".strip()

_CUSTOM_TRIM_TOKEN_LIMIT = 6000


class CustomSummarizationMiddleware(BaseSummarizationMiddleware):
    """Summarization avec filtrage des messages techniques et protection des cycles outil."""

    def before_model(self, state: AgentState, runtime: Runtime):
        messages = state["messages"]
        # Ne pas résumer si un cycle outil est en cours
        if messages and isinstance(messages[-1], AIMessage) and messages[-1].tool_calls:
            return None
        return super().before_model(state, runtime)

    def _filter_messages_for_summary(self, messages: list[AnyMessage]) -> list[AnyMessage]:
        # Filtre ToolMessage (JSON brut) et AIMessage avec tool_calls (décisions d'outil)
        return [
            msg for msg in messages
            if not isinstance(msg, ToolMessage)
            and not (isinstance(msg, AIMessage) and msg.tool_calls)
        ]

    def _trim_messages_for_summary(self, messages: list[AnyMessage]) -> list[AnyMessage]:
        try:
            return trim_messages(
                messages,
                max_tokens=_CUSTOM_TRIM_TOKEN_LIMIT,
                token_counter=self.token_counter,
                start_on="human",
                strategy="last",
                allow_partial=True,
                include_system=True,
            )
        except Exception:
            return messages[-_DEFAULT_FALLBACK_MESSAGE_COUNT:]
