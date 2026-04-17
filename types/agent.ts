/**
 * Types alignés sur le contrat OpenAPI de l'agent FastAPI (INTEGRATION_AGENT_IA.md).
 * Source de vérité : app/models/base.py + app/models/schemas/agent_output.py
 */

// ─── Requête ──────────────────────────────────────────────────────────────────

export type MessageHistory = {
  role: "human" | "assistant";
  content: string;
};

export type ChatInput = {
  customer_message: string;
  /** Requis en mode anonyme (pas de customer_id). Ignoré si customer_id est fourni. */
  conversation_history?: MessageHistory[];
  /**
   * Identifiant utilisateur côté agent : **chaîne d’entiers** présente dans la table
   * `users` de la base Postgres de l’agent (voir `AGENT_UPSTREAM_USER_ID` côté Next.js).
   */
  customer_id?: string | null;
  /** Fils de conversation multi-chat (id côté app / Drizzle). */
  conversation_id?: string | null;
};

// ─── Réponse synchrone ────────────────────────────────────────────────────────

export type RagSourceItem = {
  title: string;
  url: string;
  category: string;
  source: string;
};

export type AgentAssistantResponse = {
  message: string;
  sources: RagSourceItem[];
};

// ─── Événements SSE (streaming) ───────────────────────────────────────────────

export type SseTokenData = {
  delta: string;
};

export type SseSourcesData = {
  items: RagSourceItem[];
};

export type SseDoneData = {
  message: string;
};

export type SseEvent =
  | { event: "token"; data: SseTokenData }
  | { event: "sources"; data: SseSourcesData }
  | { event: "done"; data: SseDoneData };
