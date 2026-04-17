/**
 * `customer_id` envoyé à l’agent FastAPI doit correspondre à `public.users.id` (entier en string).
 *
 * Avec la même Postgres Stockly + schéma `agent` et FK `agent.conversations.user_id → public.users`,
 * la valeur par défaut est `session.user.id` (sans override).
 *
 * `AGENT_UPSTREAM_USER_ID` (entier) : option de secours uniquement (tests, ancien déploiement avec
 * base agent séparée). À laisser **vide** en prod si l’agent partage la base Stockly.
 */
export function resolveAgentCustomerId(sessionUserId: string): string {
  const raw = process.env.AGENT_UPSTREAM_USER_ID?.trim();
  if (!raw) return sessionUserId;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.warn(
      "[agent] AGENT_UPSTREAM_USER_ID ignoré (valeur invalide), utilisation de session.user.id",
    );
    return sessionUserId;
  }
  return String(n);
}
