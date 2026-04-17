"""
Test du format de réponse de l'API agent.

Usage :
    # Démarrer le serveur d'abord :
    #   uvicorn app.main:app --reload
    #
    # Puis lancer ce script :
    #   python scripts/test_api_output.py
    #
    # Options :
    #   python scripts/test_api_output.py --url http://localhost:8000 --customer-id <uuid>
"""

import argparse
import json
import sys

import requests


def run_test(base_url: str, customer_id: str | None, message: str) -> None:
    url = f"{base_url}/api/v1/agent/assistant"
    payload: dict = {"customer_message": message}
    if customer_id:
        payload["customer_id"] = customer_id

    print(f"\n{'='*60}")
    print(f"POST {url}")
    print(f"Payload : {json.dumps(payload, ensure_ascii=False)}")
    print("=" * 60)

    try:
        response = requests.post(url, json=payload, timeout=120)
    except requests.exceptions.ConnectionError:
        print(
            f"\n[ERREUR] Impossible de se connecter à {base_url}. "
            "Assurez-vous que le serveur est démarré."
        )
        sys.exit(1)

    print(f"\nStatut HTTP : {response.status_code}")

    try:
        data = response.json()
    except ValueError:
        print(f"\n[ERREUR] La réponse n'est pas du JSON valide :\n{response.text}")
        sys.exit(1)

    # --- Vérification du format message ---
    if "message" not in data:
        print(f"\n[ECHEC] La clé 'message' est absente. Clés présentes : {list(data.keys())}")
        sys.exit(1)

    print("\n--- Réponse ---")
    print(data["message"])
    print("\n--- Réponse complète (JSON) ---")
    print(json.dumps(data, ensure_ascii=False, indent=2))

    if response.status_code == 200:
        print("\n[SUCCES] Le format de réponse est conforme (message présent).")
    else:
        print("\n[ECHEC] Le serveur a retourné une erreur.")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Teste le format de réponse de l'API agent.")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="URL de base du serveur (défaut: http://localhost:8000)",
    )
    parser.add_argument(
        "--customer-id",
        default=None,
        help="UUID du customer à utiliser (optionnel — utilise le mode public si absent)",
    )
    parser.add_argument(
        "--message",
        default="Quelle heure est-il ?",
        help="Message envoyé à l'agent",
    )
    args = parser.parse_args()

    run_test(
        base_url=args.url,
        customer_id=args.customer_id,
        message=args.message,
    )
