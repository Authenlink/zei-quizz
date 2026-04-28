"""
Recherche hybride (dense 3072 + BM25 sparse) et pipeline d'ingestion Qdrant.

Deux collections gérées par ce module :

  knowledge_docs — base documentaire générale
                   Recherche : search_docs(query, category)
                   Retourne  : string formatée pour injection dans le prompt LLM

  helpdesk       — articles du centre d'aide
                   Recherche : search_helpdesk(query)
                   Retourne  : liste de dicts {title, url, score, ...}

Stratégie de recherche : hybride 2 phases (guide ch. 16)
  Phase 1 — filtrage par catégorie (précision)
  Phase 2 — broad semantic, toute la collection (recall)
  Fusion RRF + scoring combiné (70% pertinence + 30% priorité éditoriale)
"""

import logging
import uuid
from uuid import uuid4

from qdrant_client import models

from app.core.llm import get_embeddings
from app.core.rag.qdrant_client import get_qdrant_client, get_sparse_model

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

COLLECTION_KNOWLEDGE = "knowledge_docs"
COLLECTION_HELPDESK = "helpdesk"

COLLECTION_NAME = COLLECTION_KNOWLEDGE  # Alias par défaut pour search_docs()

DENSE_SIZE = 3072       # text-embedding-3-large
MIN_SCORE = 0.30        # Seuil minimum de pertinence (ajuster si trop de faux positifs)
_PRIORITY_WEIGHT = {"High": 3, "Medium": 2, "Low": 1}


def payload_document_url(payload: dict) -> str:
    """URL publique du chunk : source_url (guides ZEI) puis url (legacy)."""
    return (payload.get("source_url") or payload.get("url") or "").strip()


# ---------------------------------------------------------------------------
# Recherche — bricks_docs (documentation générale)
# ---------------------------------------------------------------------------

def search_docs(query: str, category: str = "", limit: int = 5) -> str:
    """
    Recherche hybride 2 phases dans bricks_docs.

    Phase 1 : si category fournie, filtre sur ce champ payload → précision
    Phase 2 : broad semantic sur toute la collection → recall
    Merge RRF + boost priorité. Retourne une string formatée pour injection
    directe dans le prompt du LLM.

    Args:
        query    : Texte de la requête (intention de l'utilisateur)
        category : Nom du dossier source (ex: "general", "faq")
                   Laisser vide pour chercher dans toute la collection.
        limit    : Nombre maximum de chunks retournés
    """
    client = get_qdrant_client()

    if not client.collection_exists(COLLECTION_NAME):
        logger.warning(f"Collection '{COLLECTION_NAME}' introuvable — lancer scripts/ingest_knowledge.py")
        return ""

    try:
        # Contextualiser la query avec la catégorie (guide ch. 16.2)
        contextualized = f"{category}: {query}" if category else query

        # Vecteurs de requête : dense (OpenAI API) + sparse BM25 (local)
        dense_query = get_embeddings().embed_query(contextualized)
        sparse_results = list(get_sparse_model().embed([contextualized]))
        sparse_query = models.SparseVector(
            indices=sparse_results[0].indices.tolist(),
            values=sparse_results[0].values.tolist(),
        )

        # Phase 1 — précision : filtrage par catégorie
        if category:
            cat_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="category",
                        match=models.MatchValue(value=category),
                    )
                ]
            )
            phase1 = client.query_points(
                collection_name=COLLECTION_NAME,
                prefetch=[
                    models.Prefetch(query=dense_query, using="dense", limit=20, filter=cat_filter),
                    models.Prefetch(query=sparse_query, using="bm25", limit=20, filter=cat_filter),
                ],
                query=models.FusionQuery(fusion=models.Fusion.RRF),
                limit=3,
                with_payload=True,
            ).points
        else:
            phase1 = []

        # Phase 2 — recall : toute la collection, sans filtre
        phase2 = client.query_points(
            collection_name=COLLECTION_NAME,
            prefetch=[
                models.Prefetch(query=dense_query, using="dense", limit=20),
                models.Prefetch(query=sparse_query, using="bm25", limit=20),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=3,
            with_payload=True,
        ).points

        merged = _merge_results(phase1, phase2, max_results=limit)
        if not merged:
            return ""

        return _format_results(merged)

    except Exception as e:
        logger.error(f"Erreur search_docs : {e}")
        return ""


# ---------------------------------------------------------------------------
# Recherche — bricks_helpdesk (articles centre d'aide)
# ---------------------------------------------------------------------------

def search_helpdesk(query: str, limit: int = 1) -> list[dict]:
    """
    Recherche hybride dans la collection helpdesk.

    Retourne les dicts bruts avec les métadonnées complètes :
    title, url, keywords, sub_category, score.

    Utilisé exclusivement par le tool suggest_help_article.
    limit=1 par défaut : on ne retourne que l'article le plus pertinent.
    """
    client = get_qdrant_client()

    if not client.collection_exists(COLLECTION_HELPDESK):
        logger.warning(f"Collection '{COLLECTION_HELPDESK}' introuvable — lancer scripts/ingest_helpdesk.py")
        return []

    try:
        dense_query = get_embeddings().embed_query(query)
        sparse_results = list(get_sparse_model().embed([query]))
        sparse_query = models.SparseVector(
            indices=sparse_results[0].indices.tolist(),
            values=sparse_results[0].values.tolist(),
        )

        results = client.query_points(
            collection_name=COLLECTION_HELPDESK,
            prefetch=[
                models.Prefetch(query=dense_query, using="dense", limit=20),
                models.Prefetch(query=sparse_query, using="bm25", limit=20),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=limit,
            with_payload=True,
        ).points

        return [
            {"score": p.score, **p.payload}
            for p in results
            if p.score >= MIN_SCORE
        ]

    except Exception as e:
        logger.error(f"Erreur search_helpdesk : {e}")
        return []


# ---------------------------------------------------------------------------
# Merge, scoring, formatage (interne)
# ---------------------------------------------------------------------------

def _merge_results(phase1: list, phase2: list, max_results: int = 5) -> list:
    """
    Fusionne phase1 (prioritaire) + phase2 (complémentaire).
    Déduplique par ID, filtre par MIN_SCORE.
    Score final = 70% pertinence vectorielle + 30% boost priorité éditoriale.
    """
    seen_ids: set = set()
    merged = []

    for point in phase1:
        if point.id not in seen_ids:
            seen_ids.add(point.id)
            merged.append(point)

    for point in phase2:
        if point.id not in seen_ids:
            seen_ids.add(point.id)
            merged.append(point)

    merged = [p for p in merged if p.score >= MIN_SCORE]

    def sort_key(point):
        weight = _PRIORITY_WEIGHT.get(point.payload.get("priority", "Low"), 1)
        return -((point.score * 0.7) + (weight / 3.0 * 0.3))

    merged.sort(key=sort_key)
    return merged[:max_results]


def _format_results(points: list) -> str:
    """Formate les chunks pour injection dans le prompt du LLM."""
    chunks = []
    for point in points:
        payload = point.payload
        content = payload.get("content", "").strip()
        if len(content) > 1200:
            content = content[:1200] + "..."

        category = payload.get("category", "")
        source = payload.get("source", "")
        url = payload_document_url(payload)

        header = f"[{category}] {source}"
        if url:
            header += f" — {url}"

        chunks.append(f"- {header} :\n  {content}")

    return "\n\n".join(chunks)


# ---------------------------------------------------------------------------
# Pipeline d'ingestion — partagé entre les deux collections
# ---------------------------------------------------------------------------

def _create_collection_base(
    collection_name: str,
    payload_fields: list[str],
    *,
    recreate: bool = True,
) -> None:
    """
    Crée une collection dense 3072 + BM25.

    recreate=True  : supprime l'existant puis recrée.
    recreate=False : si la collection existe, ne rien faire ; sinon la crée.
    """
    client = get_qdrant_client()
    exists = client.collection_exists(collection_name)

    if exists and not recreate:
        logger.info(f"Collection '{collection_name}' déjà présente — aucune réinitialisation.")
        return

    if exists and recreate:
        client.delete_collection(collection_name)
        logger.info(f"Collection '{collection_name}' supprimée (full rebuild)")

    client.create_collection(
        collection_name=collection_name,
        vectors_config={
            "dense": models.VectorParams(
                size=DENSE_SIZE,
                distance=models.Distance.COSINE,
            ),
        },
        sparse_vectors_config={
            "bm25": models.SparseVectorParams(
                modifier=models.Modifier.IDF,
            ),
        },
    )

    for field in payload_fields:
        client.create_payload_index(
            collection_name=collection_name,
            field_name=field,
            field_schema=models.PayloadSchemaType.KEYWORD,
        )

    logger.info(f"Collection '{collection_name}' créée (dense {DENSE_SIZE} + BM25)")


def create_knowledge_collection() -> None:
    """Recrée knowledge_docs from scratch (supprime l'existant)."""
    _create_collection_base(
        COLLECTION_KNOWLEDGE,
        payload_fields=["category", "source", "doc_type", "priority", "keywords"],
        recreate=True,
    )


def ensure_knowledge_collection() -> None:
    """Crée knowledge_docs si elle n'existe pas. Ne supprime jamais une collection existante."""
    _create_collection_base(
        COLLECTION_KNOWLEDGE,
        payload_fields=["category", "source", "doc_type", "priority", "keywords"],
        recreate=False,
    )


def delete_knowledge_points_for_sources(
    category_source_pairs: list[tuple[str, str]],
) -> None:
    """
    Supprime tous les points dont le couple (category, source) est dans la liste.
    Utilisé avant un ré-ingest incrémental pour remplacer les chunks d'un même fichier .md.
    """
    if not category_source_pairs:
        return
    client = get_qdrant_client()
    if not client.collection_exists(COLLECTION_KNOWLEDGE):
        return

    for category, source in category_source_pairs:
        flt = models.Filter(
            must=[
                models.FieldCondition(
                    key="category",
                    match=models.MatchValue(value=category),
                ),
                models.FieldCondition(
                    key="source",
                    match=models.MatchValue(value=source),
                ),
            ]
        )
        client.delete(
            collection_name=COLLECTION_KNOWLEDGE,
            points_selector=models.FilterSelector(filter=flt),
        )
        logger.info(f"  Points supprimés pour [{category}] {source}")


def stable_knowledge_point_id(
    collection_name: str,
    category: str,
    source: str,
    chunk_index: int,
) -> str:
    """ID déterministe pour upserts idempotents (évite les doublons logiques)."""
    key = f"{collection_name}\0{category}\0{source}\0{chunk_index}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, key))


def create_helpdesk_collection() -> None:
    """Recrée helpdesk from scratch."""
    _create_collection_base(
        COLLECTION_HELPDESK,
        payload_fields=["keywords", "sub_category", "title"],
        recreate=True,
    )


def upsert_chunks(
    collection_name: str,
    chunks: list[dict],
    batch_size: int = 32,
    *,
    deterministic_ids: bool = False,
) -> int:
    """
    Génère les embeddings dense (OpenAI API) + BM25 (FastEmbed local) et upsert par batch.

    deterministic_ids=True : ID stable par (category, source, chunk_index) pour fusion sans doublons.

    Format attendu pour chaque chunk :
        {
            "content": "texte indexé",
            "metadata": {
                "category": "referral",   # ou "title" pour helpdesk
                "source": "parrainages",
                "keywords": ["parrainage", "filleul"],
                ...
            }
        }

    Enrichissement BM25 (guide ch. 14.4) :
    Texte BM25 = keywords + title + category + contenu → meilleur recall lexical.
    Embeddings denses = contenu brut uniquement (les préfixes dégraderaient la qualité).
    """
    client = get_qdrant_client()
    embeddings_model = get_embeddings()
    sparse_model = get_sparse_model()
    total = 0

    for start in range(0, len(chunks), batch_size):
        batch = chunks[start : start + batch_size]
        texts = [c["content"] for c in batch]

        bm25_texts = []
        for chunk in batch:
            meta = chunk.get("metadata", {})
            keywords = meta.get("keywords", [])
            category = meta.get("category", "")
            title = meta.get("title", "")
            prefix_parts = keywords + ([title] if title else []) + ([category] if category else [])
            prefix = " ".join(prefix_parts)
            bm25_texts.append(f"{prefix} {chunk['content']}" if prefix else chunk["content"])

        dense_vectors = embeddings_model.embed_documents(texts)
        sparse_embeddings = list(sparse_model.embed(bm25_texts))

        points = []
        for i, chunk in enumerate(batch):
            sparse_emb = sparse_embeddings[i]
            meta = chunk.get("metadata", {})
            if deterministic_ids:
                pid = stable_knowledge_point_id(
                    collection_name,
                    meta.get("category", ""),
                    meta.get("source", ""),
                    int(meta.get("chunk_index", 0)),
                )
            else:
                pid = str(uuid4())
            points.append(
                models.PointStruct(
                    id=pid,
                    vector={
                        "dense": dense_vectors[i],
                        "bm25": models.SparseVector(
                            indices=sparse_emb.indices.tolist(),
                            values=sparse_emb.values.tolist(),
                        ),
                    },
                    payload={
                        "content": chunk["content"],
                        **chunk.get("metadata", {}),
                    },
                )
            )

        client.upsert(collection_name=collection_name, points=points)
        total += len(batch)
        logger.info(f"Upsert : {total}/{len(chunks)} points → {collection_name}")

    return total
