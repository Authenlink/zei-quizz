from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class AgentConfig(BaseModel):
    """Configuration déclarative d'un agent LangGraph."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str
    tools_getter: Any  # Callable[[], list[StructuredTool]]
    prompt_middleware: Optional[Any] = None  # à brancher en étape 9
    context_schema: Optional[Any] = None    # à brancher en étape 9
    use_memory: bool = False                # à activer en étape 11

    @field_validator("tools_getter")
    @classmethod
    def validate_tools_getter(cls, v):
        if not callable(v):
            raise ValueError("tools_getter doit être un callable")
        return v


class AgentNames:
    """Constantes pour les noms d'agents (évite les magic strings)."""

    PROJECT_ASSISTANT = "project_assistant"
    PROJECT_ASSISTANT_PUBLIC = "project_assistant_public"
