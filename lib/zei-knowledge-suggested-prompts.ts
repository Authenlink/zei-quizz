/**
 * Suggestions d’ouverture pour l’agent — libellés alignés sur le catalogue
 * `docs/zei-knowledge/INDEX.md` (tableau « Catalogue des documents », Phase 13 V2).
 * Ne pas ajouter de questions sans ancrage dans cet index.
 */

/** INDEX.md — ligne « En Bref 5 — CSRD : ce que vous devez comprendre » */
const Q_CSRD_EN_BREF =
  "Qu’est-ce que je dois comprendre sur la CSRD avant mes concurrents pour rester compétitif (En Bref 5) ?";

/** INDEX.md — ligne « La VSME expliquée — Le nouveau langage commun de la donnée ESG » */
const Q_VSME =
  "En quoi la VSME est-elle le nouveau langage commun de la donnée ESG en Europe ?";

/** INDEX.md — ligne « Guide Zei — Collecte ESG : arrêtez de bricoler, commencez à piloter » */
const Q_GUIDE_COLLECTE =
  "Comment arrêter de bricoler et commencer à piloter ma collecte ESG (guide Zei) ?";

/** INDEX.md — ligne « Checklist — Faites le point sur votre collecte ESG » */
const Q_CHECKLIST =
  "Comment faire le point sur ma collecte ESG avec la checklist Zei ?";

/** INDEX.md — ligne « En 2025, comment passer à une RSE de performance ? » */
const Q_RSE_PERFORMANCE =
  "En 2025, comment passer à une RSE de performance selon le livre blanc Zei ?";

/** INDEX.md — ligne « Plaquette synthétique 2026 » */
const Q_PLAQUETTE_2026 =
  "Que présente la plaquette synthétique Zei 2026 ?";

/**
 * 5 suggestions cliquables pour l’écran vide de l’assistant (ordre éditorial).
 */
export const ZEI_KNOWLEDGE_SUGGESTED_PROMPTS: readonly string[] = [
  Q_CSRD_EN_BREF,
  Q_VSME,
  Q_GUIDE_COLLECTE,
  Q_CHECKLIST,
  Q_RSE_PERFORMANCE,
];

/** Variante supplémentaire (7e doc INDEX) — peut être utilisée pour rotation future */
export const ZEI_KNOWLEDGE_SUGGESTED_PROMPT_PLAQUETTE = Q_PLAQUETTE_2026;
