from fastapi import Request

from app.agents.factory import AgentFactory


def get_agent_factory(request: Request) -> AgentFactory:
    """Dépendance FastAPI : récupère la factory depuis app.state."""
    return request.app.state.agent_factory
