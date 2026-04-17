"""
Client Qdrant singleton et modèle d'embeddings sparse BM25.

Le client partage une seule connexion HTTP dans tout le processus.
Le modèle BM25 (~30 Mo) est téléchargé au premier appel via FastEmbed
et mis en cache dans ~/.cache/fastembed/.
Les embeddings denses sont fournis par get_embeddings() dans app/core/llm.py.
"""

import logging
from functools import lru_cache

from fastembed import SparseTextEmbedding
from qdrant_client import QdrantClient

from app.core.config import QDRANT_API_KEY, QDRANT_URL

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    """Retourne un client Qdrant singleton (lazy init, thread-safe)."""
    logger.info(f"Connexion Qdrant : {QDRANT_URL}")
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


@lru_cache(maxsize=1)
def get_sparse_model() -> SparseTextEmbedding:
    """
    Modèle BM25 sparse (FastEmbed, local, ~30 Mo).
    Premier appel = téléchargement automatique dans ~/.cache/fastembed/.
    Appels suivants = instantané (modèle en mémoire via lru_cache).
    """
    return SparseTextEmbedding(model_name="Qdrant/bm25")
