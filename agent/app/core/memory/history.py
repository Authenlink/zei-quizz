"""
Génération déterministe du thread_id à partir du customer_id.

UUID5 garantit : même customer_id → même thread_id, sur chaque serveur,
sans coordination ni stockage supplémentaire.

Références : docs/05_memoire_persistance.md — Chapitre 18.5
"""

import uuid

_NAMESPACE = uuid.NAMESPACE_X500


def get_thread_id(customer_id: str) -> str:
    """
    Génère un thread_id déterministe à partir du customer_id.
    Le préfixe `investor_` évite les collisions si d'autres entités
    (projets, sessions) utilisent le même namespace UUID5.
    """
    return str(uuid.uuid5(_NAMESPACE, f"investor_{customer_id}"))
