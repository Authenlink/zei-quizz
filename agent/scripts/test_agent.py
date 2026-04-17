"""Script CLI pour tester l'agent directement depuis le terminal."""

import argparse
import asyncio
import sys
import time
from datetime import date
from pathlib import Path

# --- Charger .env AVANT tout import app.* ---
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from langchain_core.messages import HumanMessage

from app.agents.config import AgentNames
from app.agents.factory import AgentFactory
from app.agents.registry import get_agent_configs
from app.agents.business.prompt import InvestorAgentContext
from app.core.checkpointer_manager import checkpointer_lifespan
from app.core.context import current_customer_id
from app.core.memory.history import get_thread_id
from app.core.monitoring import monitored_ainvoke


def parse_args():
    parser = argparse.ArgumentParser(
        description="Tester l'agent depuis le terminal"
    )
    parser.add_argument("-m", "--message", required=True, help="Message du user")
    parser.add_argument("-c", "--customer-id", default=None, help="Customer ID (optionnel)")
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Force un nouveau thread (ignore l'historique checkpointer)",
    )
    return parser.parse_args()


def build_factory() -> AgentFactory:
    configs = get_agent_configs()
    configs_dict = {cfg.name: cfg for cfg in configs}
    return AgentFactory(configs=configs_dict)


def strip_markdown_fences(content: str) -> str:
    clean = content.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[-1]
        if clean.endswith("```"):
            clean = clean[: clean.rfind("```")]
    return clean.strip()


async def run(message: str, customer_id: str | None, fresh: bool = False):
    async with checkpointer_lifespan():
        current_customer_id.set(customer_id)

        factory = build_factory()

        agent_name = (
            AgentNames.PROJECT_ASSISTANT
            if customer_id
            else AgentNames.PROJECT_ASSISTANT_PUBLIC
        )
        agent = factory.get_agent(agent_name)

        context = InvestorAgentContext(
            customer_id=customer_id,
            current_date=date.today().isoformat(),
            mode="standard" if customer_id else "public",
        )

        if customer_id:
            messages = [HumanMessage(content=message)]
            thread_id = str(__import__("uuid").uuid4()) if fresh else get_thread_id(customer_id)
            invoke_config = {"configurable": {"thread_id": thread_id}}
        else:
            messages = [HumanMessage(content=message)]
            invoke_config = {}

        trace_session_id = (
            f"assistant-{thread_id}" if customer_id else "assistant-public"
        )
        project_id = customer_id or "anonymous"

        start = time.perf_counter()
        result = await monitored_ainvoke(
            agent=agent,
            input={"messages": messages},
            project_id=project_id,
            session_id=trace_session_id,
            trace_name="Project Assistant (CLI)",
            tags=["assistant", context.mode],
            metadata={"mode": context.mode, "current_date": context.current_date},
            config=invoke_config,
            context=context,
        )
        elapsed = time.perf_counter() - start

        last_message = result["messages"][-1]
        raw_content = last_message.content if hasattr(last_message, "content") else ""
        clean = strip_markdown_fences(raw_content)

        print("\n" + "=" * 60)
        print(clean)
        print("=" * 60)
        print(f"Temps d'exécution : {elapsed:.2f}s")


def main():
    args = parse_args()
    asyncio.run(run(message=args.message, customer_id=args.customer_id, fresh=args.fresh))


if __name__ == "__main__":
    main()
