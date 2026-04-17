"""Script interactif : démarre l'API et permet de chatter avec l'agent."""

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import httpx

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent.parent
API_PORT = int(os.getenv("API_PORT", "8000"))
BASE_URL = f"http://127.0.0.1:{API_PORT}"
HEALTH_URL = f"{BASE_URL}/"
AGENT_URL = f"{BASE_URL}/api/v1/agent/assistant"
STARTUP_TIMEOUT = 30  # secondes max pour attendre le démarrage


# ---------------------------------------------------------------------------
# Helpers d'affichage
# ---------------------------------------------------------------------------
def bold(text: str) -> str:
    return f"\033[1m{text}\033[0m"


def green(text: str) -> str:
    return f"\033[32m{text}\033[0m"


def yellow(text: str) -> str:
    return f"\033[33m{text}\033[0m"


def red(text: str) -> str:
    return f"\033[31m{text}\033[0m"


def cyan(text: str) -> str:
    return f"\033[36m{text}\033[0m"


def separator():
    print(cyan("─" * 60))


# ---------------------------------------------------------------------------
# Démarrage du serveur FastAPI
# ---------------------------------------------------------------------------
def start_server() -> subprocess.Popen:
    print(yellow("  Démarrage du serveur FastAPI..."))
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(API_PORT)],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return proc


def wait_for_server(timeout: int = STARTUP_TIMEOUT) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = httpx.get(HEALTH_URL, timeout=2)
            if r.status_code < 500:
                return True
        except httpx.RequestError:
            pass
        time.sleep(1)
        print(".", end="", flush=True)
    print()
    return False


# ---------------------------------------------------------------------------
# Appel à l'agent
# ---------------------------------------------------------------------------
def call_agent(message: str, customer_id: str | None) -> dict:
    payload = {
        "customer_message": message,
        "customer_id": customer_id or None,
        "conversation_history": [],
    }
    response = httpx.post(AGENT_URL, json=payload, timeout=120)
    return response.json()


# ---------------------------------------------------------------------------
# Boucle interactive
# ---------------------------------------------------------------------------
def interactive_loop(customer_id: str | None):
    separator()
    if customer_id:
        print(bold(f"  Mode authentifié  —  customer_id : {customer_id}"))
    else:
        print(bold("  Mode public  —  sans customer_id"))
    print(f"  Tape {bold('exit')} ou {bold('quit')} pour quitter.")
    print(f"  Tape {bold('switch')} pour changer de customer_id.")
    separator()

    while True:
        try:
            message = input(bold("\nMessage > ")).strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not message:
            continue
        if message.lower() in ("exit", "quit"):
            break
        if message.lower() == "switch":
            new_id = input("  Nouveau customer_id (vide = mode public) : ").strip() or None
            customer_id = new_id or None
            separator()
            if customer_id:
                print(bold(f"  Switché vers customer_id : {customer_id}"))
            else:
                print(bold("  Switché vers le mode public."))
            separator()
            continue

        print(yellow("  Appel en cours..."))
        start = time.perf_counter()
        try:
            result = call_agent(message, customer_id)
        except httpx.RequestError as e:
            print(red(f"  Erreur réseau : {e}"))
            continue
        elapsed = time.perf_counter() - start

        separator()
        if "error" in result:
            print(red(f"  Erreur agent : {result.get('detail', result)}"))
            raw = result.get("raw", "")
            if raw:
                print(f"\n  Raw output :\n{raw}")
        else:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        separator()
        print(green(f"  Temps : {elapsed:.2f}s"))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print()
    separator()
    print(bold("  Agent CRI — Session interactive"))
    separator()

    # Demander le customer_id une seule fois au démarrage
    raw = input("  customer_id (Entrée pour mode public) : ").strip()
    customer_id: str | None = raw if raw else None

    # Démarrer le serveur
    server_proc = start_server()

    def shutdown(sig=None, frame=None):
        print(yellow("\n  Arrêt du serveur..."))
        server_proc.terminate()
        server_proc.wait()
        print(green("  Serveur arrêté. À bientôt !"))
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("  En attente du serveur", end="", flush=True)
    ready = wait_for_server()
    if not ready:
        print(red("\n  Le serveur n'a pas démarré dans le temps imparti."))
        server_proc.terminate()
        sys.exit(1)

    print(green("\n  Serveur prêt !"))

    try:
        interactive_loop(customer_id)
    finally:
        shutdown()


if __name__ == "__main__":
    main()
