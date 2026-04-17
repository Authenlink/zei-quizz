"""Routes de base pour le chat."""

from fastapi import APIRouter
from langchain_core.messages import HumanMessage

from app.core.llm import get_llm
from app.models.base import ChatInput

router = APIRouter()


@router.post("/chat")
async def chat(input: ChatInput):
    """
    Endpoint de chat simple.
    Reçoit une question, retourne la réponse du LLM.
    """
    llm = get_llm(streaming=False)

    messages = [HumanMessage(content=input.customer_message)]

    response = await llm.ainvoke(messages)

    return {
        "answer": response.content,
        "model": llm.model_name if hasattr(llm, "model_name") else "unknown",
    }
