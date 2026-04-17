"""
Intégration Langfuse pour l'observabilité des agents LLM.

Fournit des utilitaires pour instrumenter les appels aux agents avec Langfuse :
- get_langfuse_handler() : crée un CallbackHandler Langfuse avec session, tags, metadata
- get_monitored_config() : enrichit une config LangChain avec le handler Langfuse
- trace_context() / async_trace_context() : context managers pour propager les attributs
- monitored_invoke() / monitored_ainvoke() / monitored_astream() : invocation avec tracing
"""

import os
from contextlib import asynccontextmanager, contextmanager
from typing import Any, AsyncIterator, Dict, List, Optional, Union

from langchain_core.runnables import Runnable

from app.core.config import APP_ENV, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY

# Activation conditionnelle : dégradation silencieuse si clés absentes
_LANGFUSE_ENABLED = bool(LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY)


def get_langfuse_handler(
    session_id: Optional[str] = None,
    project_id: Optional[Union[str, int]] = None,
    tags: Optional[List[str]] = None,
    trace_name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
):
    """
    Crée un handler Langfuse configuré pour une invocation d'agent.

    Si Langfuse n'est pas configuré (clés absentes), retourne None.
    """
    if not _LANGFUSE_ENABLED:
        return None

    try:
        from langfuse.langchain import CallbackHandler
    except ImportError:
        return None

    # Propagation de l'environnement à Langfuse
    os.environ["LANGFUSE_TRACING_ENVIRONMENT"] = str(APP_ENV)

    # L'environnement est toujours inclus dans les tags pour filtrage
    final_tags = [str(APP_ENV)]
    if tags:
        final_tags.extend(tags)

    # Création du handler (lit LANGFUSE_* depuis les variables d'environnement)
    handler = CallbackHandler()

    # Configuration post-init (pattern Langfuse 3.x)
    if session_id:
        handler.session_id = session_id
    if trace_name:
        handler.trace_name = trace_name
    if final_tags:
        handler.tags = final_tags
    if metadata:
        handler.metadata = metadata
    if project_id is not None:
        handler.user_id = str(project_id)

    return handler


def get_monitored_config(
    session_id: Optional[str] = None,
    project_id: Optional[Union[str, int]] = None,
    tags: Optional[List[str]] = None,
    trace_name: Optional[str] = None,
    base_config: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Enrichit une config LangChain avec le handler Langfuse.
    Fusion non destructive avec la config existante.
    """
    config = base_config.copy() if base_config else {}

    if not _LANGFUSE_ENABLED:
        return config

    handler = get_langfuse_handler(
        session_id=session_id,
        project_id=project_id,
        tags=tags,
        trace_name=trace_name,
        metadata=metadata,
    )
    if handler is None:
        return config

    if "callbacks" not in config:
        config["callbacks"] = []
    config["callbacks"].append(handler)

    if project_id and "metadata" not in config:
        config["metadata"] = {}
    if project_id:
        config.setdefault("metadata", {})["user_id"] = str(project_id)

    return config


@contextmanager
def trace_context(
    project_id: Optional[Union[str, int]] = None,
    session_id: Optional[str] = None,
    **attributes: Any,
):
    """Context manager synchrone pour propager les attributs de trace Langfuse."""
    if not _LANGFUSE_ENABLED:
        yield
        return

    try:
        from langfuse import propagate_attributes
    except ImportError:
        yield
        return

    attrs = dict(attributes)
    if project_id:
        attrs["user_id"] = str(project_id)
    if session_id:
        attrs["session_id"] = session_id

    if attrs:
        with propagate_attributes(**attrs):
            yield
    else:
        yield


@asynccontextmanager
async def async_trace_context(
    project_id: Optional[Union[str, int]] = None,
    session_id: Optional[str] = None,
    **attributes: Any,
):
    """Context manager asynchrone pour propager les attributs de trace Langfuse."""
    if not _LANGFUSE_ENABLED:
        yield
        return

    try:
        from langfuse import propagate_attributes
    except ImportError:
        yield
        return

    attrs = dict(attributes)
    if project_id:
        attrs["user_id"] = str(project_id)
    if session_id:
        attrs["session_id"] = session_id

    if attrs:
        with propagate_attributes(**attrs):
            yield
    else:
        yield


def monitored_invoke(
    agent: Runnable,
    input: Any,
    project_id: Optional[Union[str, int]] = None,
    session_id: Optional[str] = None,
    trace_name: Optional[str] = None,
    tags: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Any:
    """Invocation synchrone d'un agent avec tracing Langfuse complet."""
    final_config = get_monitored_config(
        session_id=session_id,
        project_id=project_id,
        tags=tags,
        trace_name=trace_name,
        base_config=config,
        metadata=metadata,
    )
    with trace_context(project_id=project_id, session_id=session_id):
        return agent.invoke(input, config=final_config, **kwargs)


async def monitored_ainvoke(
    agent: Runnable,
    input: Any,
    project_id: Optional[Union[str, int]] = None,
    session_id: Optional[str] = None,
    trace_name: Optional[str] = None,
    tags: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Any:
    """Invocation asynchrone d'un agent avec tracing Langfuse complet."""
    final_config = get_monitored_config(
        session_id=session_id,
        project_id=project_id,
        tags=tags,
        trace_name=trace_name,
        base_config=config,
        metadata=metadata,
    )
    async with async_trace_context(project_id=project_id, session_id=session_id):
        return await agent.ainvoke(input, config=final_config, **kwargs)


async def monitored_astream(
    agent: Runnable,
    input: Any,
    project_id: Optional[Union[str, int]] = None,
    session_id: Optional[str] = None,
    trace_name: Optional[str] = None,
    tags: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> AsyncIterator[Any]:
    """
    Streaming asynchrone avec tracing Langfuse.

    Le propagate_attributes englobe toute la boucle async for pour que
    les attributs de trace soient correctement propagés pendant tout le stream.
    """
    final_config = get_monitored_config(
        session_id=session_id,
        project_id=project_id,
        tags=tags,
        trace_name=trace_name,
        base_config=config,
        metadata=metadata,
    )

    propagate_attrs: Dict[str, Any] = {}
    if project_id:
        propagate_attrs["user_id"] = str(project_id)
    if session_id:
        propagate_attrs["session_id"] = session_id
    if tags:
        propagate_attrs["tags"] = tags
    if metadata:
        propagate_attrs["metadata"] = metadata

    if propagate_attrs and _LANGFUSE_ENABLED:
        try:
            from langfuse import propagate_attributes
        except ImportError:
            pass
        else:
            with propagate_attributes(**propagate_attrs):
                async for chunk in agent.astream(input, config=final_config, **kwargs):
                    yield chunk
            return

    async for chunk in agent.astream(input, config=final_config, **kwargs):
        yield chunk
