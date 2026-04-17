"""
Test rapide du tool d'exemple.

Usage :
    PYTHONPATH=. python scripts/test_tools_quick.py

Message de test :
  "Quelle heure est-il ?"  → get_current_time
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
    tests = [
        ("Heure actuelle", "Quelle heure est-il ?", None),
    ]
    print("=" * 70)
    print("  Test rapide du tool d'exemple (get_current_time)")
    print("=" * 70)
    for label, message, customer_id in tests:
        print(f"\n--- {label} ---")
        print(f"Message: {message}")
        try:
            content = asyncio.run(run_test(message, customer_id, label))
            print(f"Réponse: {content[:300]}..." if len(content) > 300 else f"Réponse: {content}")
        except Exception as e:
            print(f"ERREUR: {e}")
    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()
