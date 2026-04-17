"""
Rate limiter simple basé sur un cache en mémoire.

Limite le nombre de requêtes par customer_id ou par IP sur une fenêtre glissante.
Sans auth JWT : utilise customer_id si fourni, sinon IP client.
Pour un déploiement multi-instances, utiliser Redis à la place du dict.
Référence : docs/PLAN_IMPLEMENTATION_DEPLOIEMENT_ETAPE_14.md chapitre 5
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Request

# Configuration (configurable via variables d'environnement)
MAX_REQUESTS_PER_MINUTE = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "20"))
WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
WINDOW_SIZE = timedelta(seconds=WINDOW_SECONDS)

_rate_limit_cache: dict[str, list] = {}


def _get_client_key(customer_id: Optional[str], request: Request) -> str:
    """Identifiant unique pour le rate limit : customer_id ou IP."""
    if customer_id and str(customer_id).strip():
        return f"customer:{customer_id}"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}"


async def check_rate_limit(
    customer_id: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    """
    Vérifie que le client n'a pas dépassé la limite de requêtes.
    Lève HTTPException 429 si la limite est atteinte.
    """
    if request is None:
        return

    key = _get_client_key(customer_id, request)
    now = datetime.now()

    if key in _rate_limit_cache:
        last_reset, count = _rate_limit_cache[key]

        if (now - last_reset) >= WINDOW_SIZE:
            _rate_limit_cache[key] = [now, 1]
            return

        if count >= MAX_REQUESTS_PER_MINUTE:
            retry_after = int((WINDOW_SIZE - (now - last_reset)).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Trop de requêtes. Réessayez dans {retry_after} secondes.",
                headers={"Retry-After": str(max(1, retry_after))},
            )

        _rate_limit_cache[key][1] += 1
    else:
        _rate_limit_cache[key] = [now, 1]
