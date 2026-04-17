from typing import Optional

from langchain.agents import create_agent
from langchain_core.runnables import Runnable

from app.agents.config import AgentConfig
from app.core.checkpointer_manager import get_checkpointer
from app.core.config import NANO_MODEL
from app.core.llm import get_llm
from app.middleware.custom_summarization import (
    FACTUAL_SUMMARY_PROMPT,
    CustomSummarizationMiddleware,
)
from app.middleware.smart_cleanup import SmartCleanupMiddleware


class AgentFactory:
    """Factory centralisée pour tous les agents du système."""

    def __init__(self, configs: dict[str, AgentConfig]):
        self._configs = configs
        self._agents: dict[str, Runnable] = {}

    def _build(self, config: AgentConfig) -> Runnable:
        """Construit un agent LangGraph à partir de sa configuration."""
        llm = get_llm(streaming=False, request_timeout=300.0)
        kwargs = dict(model=llm, tools=config.tools_getter(), name=config.name)

        middleware = []
        if config.prompt_middleware:
            middleware.append(config.prompt_middleware)

        if config.use_memory:
            middleware.append(
                CustomSummarizationMiddleware(
                    model=get_llm(model=NANO_MODEL, streaming=False, temperature=0.0),
                    max_tokens_before_summary=6000,
                    messages_to_keep=6,
                    summary_prompt=FACTUAL_SUMMARY_PROMPT,
                )
            )
            middleware.append(
                SmartCleanupMiddleware(
                    max_messages_before_cleanup=50,
                    keep_first_messages=6,
                    keep_last_messages=20,
                )
            )
            kwargs["checkpointer"] = get_checkpointer()

        if middleware:
            kwargs["middleware"] = middleware
        if config.context_schema:
            kwargs["context_schema"] = config.context_schema

        agent = create_agent(**kwargs)
        self._agents[config.name] = agent
        return agent

    def get_agent(self, name: str) -> Optional[Runnable]:
        """Récupère un agent depuis le cache, ou le crée si nécessaire."""
        if name in self._agents:
            return self._agents[name]
        config = self._configs.get(name)
        if not config:
            return None
        return self._build(config)
