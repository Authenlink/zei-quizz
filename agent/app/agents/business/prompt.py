"""Prompt spécialisé et contexte runtime pour l'agent assistant."""

from typing import Optional

from langchain.agents.middleware import ModelRequest, dynamic_prompt
from pydantic import BaseModel

from app.agents.main_prompt import main_prompt


# ---------------------------------------------------------------------------
# Couche 3 — Template de contexte runtime
# ---------------------------------------------------------------------------

_context_block = """
<context>
Date courante : {current_date}
Customer ID   : {customer_id}
Mode          : {mode}
</context>
"""


# ---------------------------------------------------------------------------
# Couche 2 — Prompt spécialisé assistant (avec customer_id)
# ---------------------------------------------------------------------------

_project_prompt = """
<role>
Tu es un assistant conversationnel. Tu aides les utilisateurs à obtenir des informations
en appelant les outils appropriés.
</role>

<tools_selection>
Analyse la question et appelle les outils correspondants.

HEURE / DATE — demande d'heure ou de date courante
  → get_current_time

Si la question ne couvre aucun outil disponible, réponds poliment.
</tools_selection>

<parameter_rules>
- Le customer_id est disponible dans le contexte si l'utilisateur est authentifié.
- Ne modifie jamais le customer_id — utilise exactement la valeur du contexte.
</parameter_rules>

<output_reminder>
Réponds à l'utilisateur par un message texte clair et utile. Pas de JSON.
Présente les informations de façon lisible. Si un outil a échoué, explique-le simplement.
</output_reminder>
"""


# ---------------------------------------------------------------------------
# Couche 2 — Prompt spécialisé assistant public (sans customer_id)
# ---------------------------------------------------------------------------

_project_public_prompt = """
<role>
Tu es un assistant conversationnel en mode public. Tu aides les utilisateurs non authentifiés
avec les outils disponibles.
</role>

<tools_selection>
- Aucun customer_id n'est disponible (utilisateur non authentifié).

HEURE / DATE — demande d'heure ou de date courante
  → get_current_time

Tu ne peux pas accéder aux données personnelles. Pour cela, l'utilisateur doit s'authentifier.
</tools_selection>

<output_reminder>
Réponds à l'utilisateur par un message texte clair et utile. Pas de JSON.
</output_reminder>
"""


# ---------------------------------------------------------------------------
# Schéma de contexte runtime (context_schema)
# ---------------------------------------------------------------------------

class AgentContext(BaseModel):
    """Contexte runtime injecté à chaque invocation de l'agent assistant."""

    customer_id: Optional[str] = None
    current_date: Optional[str] = None
    mode: str = "standard"  # "standard" | "public"


# Alias pour compatibilité avec le registry
InvestorAgentContext = AgentContext


# ---------------------------------------------------------------------------
# Middleware @dynamic_prompt — assistant (avec customer_id)
# ---------------------------------------------------------------------------

@dynamic_prompt
def get_dynamic_investor_prompt(request: ModelRequest) -> str:
    """
    Assemble le prompt final pour l'agent assistant.
    Compose : Couche 1 (identité globale) + Couche 2 (rôle) + Couche 3 (contexte runtime).
    """
    ctx: AgentContext = request.runtime.context

    formatted_context = _context_block.format(
        current_date=ctx.current_date or "non renseignée",
        customer_id=ctx.customer_id or "non renseigné",
        mode=ctx.mode,
    )

    return f"{main_prompt}\n{_project_prompt}\n{formatted_context}"


# ---------------------------------------------------------------------------
# Middleware @dynamic_prompt — assistant public (sans customer_id)
# ---------------------------------------------------------------------------

@dynamic_prompt
def get_dynamic_investor_public_prompt(request: ModelRequest) -> str:
    """
    Assemble le prompt final pour l'agent assistant_public.
    Compose : Couche 1 (identité globale) + Couche 2 (rôle public) + Couche 3 (contexte runtime).
    """
    ctx: AgentContext = request.runtime.context

    formatted_context = _context_block.format(
        current_date=ctx.current_date or "non renseignée",
        customer_id="non authentifié",
        mode=ctx.mode,
    )

    return f"{main_prompt}\n{_project_public_prompt}\n{formatted_context}"
