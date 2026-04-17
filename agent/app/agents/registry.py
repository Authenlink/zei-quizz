from app.agents.business.agent import get_tools
from app.agents.business.prompt import (
    InvestorAgentContext,
    get_dynamic_investor_prompt,
    get_dynamic_investor_public_prompt,
)
from app.agents.config import AgentConfig, AgentNames


def get_agent_configs() -> list[AgentConfig]:
    """Point unique de vérité sur les agents disponibles."""
    return [
        AgentConfig(
            name=AgentNames.PROJECT_ASSISTANT,
            tools_getter=lambda: get_tools(has_customer_id=True),
            prompt_middleware=get_dynamic_investor_prompt,
            context_schema=InvestorAgentContext,
            use_memory=True,
        ),
        AgentConfig(
            name=AgentNames.PROJECT_ASSISTANT_PUBLIC,
            tools_getter=lambda: get_tools(has_customer_id=False),
            prompt_middleware=get_dynamic_investor_public_prompt,
            context_schema=InvestorAgentContext,
            use_memory=False,
        ),
    ]
