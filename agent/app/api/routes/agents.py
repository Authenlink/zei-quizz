"""Routes pour les agents IA."""

import json
from datetime import date

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from langchain_core.messages import AIMessage, HumanMessage

from app.api.middleware.rate_limiter import check_rate_limit
from app.agents.business.prompt import InvestorAgentContext
from app.agents.config import AgentNames
from app.agents.factory import AgentFactory
from app.api.dependencies import get_agent_factory
from app.core.context import current_customer_id
from app.core.memory.history import get_thread_id
from app.core.monitoring import monitored_ainvoke
from app.models.base import ChatInput

router = APIRouter()


@router.post("/assistant")
async def chat_with_agent(
    input: ChatInput,
    request: Request,
    factory: AgentFactory = Depends(get_agent_factory),
):
    """Répond à l'utilisateur via l'agent et retourne un message texte."""
    await check_rate_limit(customer_id=input.customer_id, request=request)
    current_customer_id.set(input.customer_id)

    agent_name = (
        AgentNames.PROJECT_ASSISTANT
        if input.customer_id
        else AgentNames.PROJECT_ASSISTANT_PUBLIC
    )
    agent = factory.get_agent(agent_name)

    context = InvestorAgentContext(
        customer_id=input.customer_id,
        current_date=date.today().isoformat(),
        mode="standard" if input.customer_id else "public",
    )

    # Avec checkpointer : on envoie uniquement le message courant.
    # Le checkpointer reconstruit l'historique depuis PostgreSQL via thread_id.
    # Sans checkpointer (public) : on injecte l'historique client comme avant.
    if input.customer_id:
        messages = [HumanMessage(content=input.customer_message)]
        invoke_config = {"configurable": {"thread_id": get_thread_id(input.customer_id)}}
    else:
        history = [
            HumanMessage(content=m.content) if m.role == "human"
            else AIMessage(content=m.content)
            for m in input.conversation_history
        ]
        messages = history + [HumanMessage(content=input.customer_message)]
        invoke_config = {}

    trace_session_id = (
        f"assistant-{get_thread_id(input.customer_id)}"
        if input.customer_id
        else "assistant-public"
    )  # public = pas de thread_id, une session par type
    project_id = input.customer_id or "anonymous"

    result = await monitored_ainvoke(
        agent=agent,
        input={"messages": messages},
        project_id=project_id,
        session_id=trace_session_id,
        trace_name="Project Assistant",
        tags=["assistant", context.mode],
        metadata={"mode": context.mode, "current_date": context.current_date},
        config=invoke_config,
        context=context,
    )

    last_message = result["messages"][-1]
    raw_content = last_message.content if hasattr(last_message, "content") else ""

    # Strip markdown code fences si présents (``` ... ```)
    clean = raw_content.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[-1]
        if clean.endswith("```"):
            clean = clean[: clean.rfind("```")]
        clean = clean.strip()

    def json_response(data: dict, status_code: int = 200) -> Response:
        return Response(
            content=json.dumps(data, ensure_ascii=False),
            status_code=status_code,
            media_type="application/json",
        )

    return json_response({"message": clean or ""})
