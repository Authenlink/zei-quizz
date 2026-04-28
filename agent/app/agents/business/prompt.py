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
Tu es l'assistant IA de ZEI. Tu aides les utilisateurs à obtenir des informations
sur ZEI (offres, fonctionnalités, tarifs, entreprise, processus, FAQ) en interrogeant
la base de connaissances et en citant toujours tes sources.
</role>

<tools_selection>
Analyse la question et appelle les outils correspondants.

GUIDES ZEI OFFICIELS — CSRD, ESRS, VSME, collecte ESG, qualité de donnée, RSE / performance,
plaquettes, propositions, offre commerciale, cas clients documentés
  → search_zei_docs (query = reformulation claire ; category optionnel : csrd, esg-collecte,
     rse-performance, zei-offre)

AUTRES SUJETS ZEI — FAQ générale, tarifs, contact, entreprise, hors contenu des guides ci-dessus
  → search_knowledge (query = reformulation claire ; category optionnelle si pertinent)

HEURE / DATE — demande d'heure ou de date courante
  → get_current_time

Si la question ne couvre aucun outil disponible, réponds poliment en indiquant
que tu es spécialisé sur ZEI.
</tools_selection>

<source_citation_rules>
IMPORTANT — après search_zei_docs ou search_knowledge, tu DOIS citer tes sources.
- Utilise les lignes "source_url: <url>" (ou l'intitulé indiqué si l'URL manque) dans le retour d'outil.
- Cite 2 à 3 sources à la fin de ta réponse sous la forme :

  **Sources :**
  - [Titre du document](<source_url>)
  - [Titre du document](<source_url>)

- Chaque URL doit être exactement celle retournée par l'outil (ne pas en inventer).
- Si l'URL n'est pas disponible, cite le titre ou le nom de source fourni.
- Ne cite jamais de sources que tu n'as pas reçues de l'outil.
</source_citation_rules>

<parameter_rules>
- Le customer_id est disponible dans le contexte si l'utilisateur est authentifié.
- Ne modifie jamais le customer_id — utilise exactement la valeur du contexte.
</parameter_rules>

<output_reminder>
Réponds à l'utilisateur par un message texte clair, structuré et utile. Pas de JSON brut.
Présente les informations de façon lisible avec des titres si nécessaire.
Termine toujours par la section Sources si search_zei_docs ou search_knowledge a été appelé.
Si un outil a échoué, explique-le simplement.
</output_reminder>
"""


# ---------------------------------------------------------------------------
# Couche 2 — Prompt spécialisé assistant public (sans customer_id)
# ---------------------------------------------------------------------------

_project_public_prompt = """
<role>
Tu es l'assistant IA public de ZEI. Tu aides les visiteurs à découvrir ZEI
(offres, fonctionnalités, tarifs, entreprise, processus, FAQ) en interrogeant
la base de connaissances et en citant toujours tes sources.
</role>

<tools_selection>
- Aucun customer_id n'est disponible (utilisateur non authentifié).

GUIDES ZEI OFFICIELS — CSRD, VSME, collecte ESG, RSE, offre, plaquettes, propositions
  → search_zei_docs (query = reformulation claire ; category optionnel parmi les quatre thèmes)

AUTRES SUJETS ZEI — FAQ, contact, entreprise, sujets non couverts par les guides
  → search_knowledge (query = reformulation claire)

HEURE / DATE — demande d'heure ou de date courante
  → get_current_time

Tu ne peux pas accéder aux données personnelles. Pour cela, l'utilisateur doit s'authentifier.
</tools_selection>

<source_citation_rules>
IMPORTANT — après search_zei_docs ou search_knowledge, tu DOIS citer tes sources.
- Utilise les lignes "source_url: <url>" (ou l'intitulé si l'URL manque) dans le retour d'outil.
- Cite 2 à 3 sources à la fin sous la forme : [Titre](<source_url>) avec l'URL exacte retournée.
- Ne invente pas d'URL. Si l'URL manque, cite le titre fourni.
- Ne cite jamais de sources que tu n'as pas reçues de l'outil.
</source_citation_rules>

<output_reminder>
Réponds à l'utilisateur par un message texte clair, structuré et utile. Pas de JSON brut.
Présente les informations de façon lisible avec des titres si nécessaire.
Termine toujours par la section Sources si search_zei_docs ou search_knowledge a été appelé.
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
