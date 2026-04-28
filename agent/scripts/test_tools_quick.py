"""
Tests rapides : get_current_time, search_zei_docs (Qdrant), agent avec questions RAG.

Usage :
    PYTHONPATH=. python scripts/test_tools_quick.py
"""

import asyncio
import sys
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from langchain_core.messages import HumanMessage

from app.agents.config import AgentNames
from app.agents.factory import AgentFactory
from app.agents.registry import get_agent_configs
from app.agents.business.prompt import InvestorAgentContext
from app.core.checkpointer_manager import checkpointer_lifespan
from app.core.context import current_customer_id


async def run_test(message: str, customer_id: str | None = None, label: str = ""):
    """Exécute un test avec le message donné."""
    async with checkpointer_lifespan():
        current_customer_id.set(customer_id)
        configs = {c.name: c for c in get_agent_configs()}
        factory = AgentFactory(configs=configs)
        agent_name = AgentNames.PROJECT_ASSISTANT if customer_id else AgentNames.PROJECT_ASSISTANT_PUBLIC
        agent = factory.get_agent(agent_name)
        context = InvestorAgentContext(
            customer_id=customer_id,
            current_date=date.today().isoformat(),
            mode="standard" if customer_id else "public",
        )
        messages = [HumanMessage(content=message)]
        invoke_config = {"configurable": {"thread_id": "test-quick"}}
        result = await agent.ainvoke({"messages": messages}, config=invoke_config, context=context)
        content = result["messages"][-1].content if result["messages"] else ""
        return content


def main():
    from app.tools.rag.search_zei_docs import search_zei_docs_impl

    print("=" * 70)
    print("  search_zei_docs (Qdrant, sans LLM)")
    print("=" * 70)
    for label, q in [
        ("VSME", "C'est quoi la VSME ?"),
        ("Collecte ESG", "Comment ZEI aide à la collecte ESG ?"),
    ]:
        print(f"\n--- {label} ---")
        try:
            out = search_zei_docs_impl(q, None)
            print(out[:1200] + "..." if len(out) > 1200 else out)
        except Exception as e:
            print(f"ERREUR: {e}")

    tests = [
        ("Heure actuelle", "Quelle heure est-il ?", None),
    ]
    print("\n" + "=" * 70)
    print("  Agent — get_current_time")
    print("=" * 70)
    for label, message, customer_id in tests:
        print(f"\n--- {label} ---")
        print(f"Message: {message}")
        try:
            content = asyncio.run(run_test(message, customer_id, label))
            print(f"Réponse: {content[:300]}..." if len(content) > 300 else f"Réponse: {content}")
        except Exception as e:
            print(f"ERREUR: {e}")

    rag_agent_tests = [
        ("Agent VSME", "C'est quoi la VSME ?", None),
        ("Agent collecte ESG", "Comment ZEI aide à la collecte ESG ?", None),
    ]
    print("\n" + "=" * 70)
    print("  Agent — questions RAG (LLM + outils)")
    print("=" * 70)
    for label, message, customer_id in rag_agent_tests:
        print(f"\n--- {label} ---")
        print(f"Message: {message}")
        try:
            content = asyncio.run(run_test(message, customer_id, label))
            print(f"Réponse: {content[:800]}..." if len(content) > 800 else f"Réponse: {content}")
        except Exception as e:
            print(f"ERREUR: {e}")
    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()
