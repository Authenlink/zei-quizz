"""
Initialisation des modèles LLM multi-providers.

Fournit une factory unifiée qui supporte :
- OpenAI (GPT-4o, o1, o3)
- Anthropic (Claude Sonnet, Opus)
- Mistral (Large, Small)
- Google (Gemini)
"""

from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mistralai import ChatMistralAI
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.core.config import (
    ANTHROPIC_API_KEY,
    EMBEDDING_MODEL,
    GOOGLE_API_KEY,
    LLM_MODEL,
    LLM_PROVIDER,
    MAIN_MODEL,
    MISTRAL_API_KEY,
    NANO_MODEL,
    OPENAI_API_KEY,
)


def get_llm(
    provider: str = LLM_PROVIDER,
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int | None = None,
    streaming: bool = True,
    **kwargs,
):
    """
    Factory LLM multi-providers.

    Args:
        provider: Provider LLM (openai, anthropic, mistral, google)
        model: Nom du modèle
        temperature: Créativité (0.0 = déterministe, 1.0 = créatif)
        max_tokens: Limite de tokens en sortie
        streaming: Active le streaming token par token
        **kwargs: Paramètres supplémentaires

    Returns:
        Instance du LLM selon le provider
    """
    # Stratégie modèles : MAIN par défaut pour l'agent, NANO pour tâches légères
    effective_model = model or MAIN_MODEL

    if provider == "openai":
        return ChatOpenAI(
            api_key=OPENAI_API_KEY,
            model=effective_model,
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=streaming,
            **kwargs,
        )

    elif provider == "anthropic":
        return ChatAnthropic(
            api_key=ANTHROPIC_API_KEY,
            model=effective_model,
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=streaming,
            **kwargs,
        )

    elif provider == "mistral":
        return ChatMistralAI(
            api_key=MISTRAL_API_KEY,
            model=effective_model,
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=streaming,
            **kwargs,
        )

    elif provider == "google":
        return ChatGoogleGenerativeAI(
            api_key=GOOGLE_API_KEY,
            model=effective_model,
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=streaming,
            **kwargs,
        )

    else:
        raise ValueError(f"Provider inconnu: {provider}")


def get_embeddings() -> OpenAIEmbeddings:
    """Crée et retourne le modèle d'embeddings pour le RAG."""
    return OpenAIEmbeddings(
        openai_api_key=OPENAI_API_KEY,
        model=EMBEDDING_MODEL,
    )
