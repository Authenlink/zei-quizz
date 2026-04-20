import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import type { UIMessage } from "ai";

import { mapUIMessagesToChatPayload } from "@/lib/agent/map-ui-messages-to-payload";
import { auth } from "@/lib/auth";

/**
 * Extrait les liens markdown [titre](url) du bloc "Sources" en fin de réponse
 * et retourne le texte nettoyé + la liste des sources.
 * Le bloc Sources est retiré du texte pour éviter d'afficher le markdown brut
 * (la UI affiche déjà les sources via SourcesPanel).
 */
function extractSources(raw: string): {
  text: string;
  sources: Array<{ title: string; url: string }>;
} {
  const sources: Array<{ title: string; url: string }> = [];

  // Capture le bloc Sources quelle que soit la variante de formatage du LLM
  const sectionRe =
    /\n+\*{0,2}Sources\s*[:：]\*{0,2}\s*\n([\s\S]+?)$/i;
  const sectionMatch = raw.match(sectionRe);

  if (sectionMatch) {
    const section = sectionMatch[1];
    const linkRe = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(section)) !== null) {
      const title = m[1].trim();
      const url = m[2].trim();
      if (url) sources.push({ title: title || url, url });
    }
    const text = raw.slice(0, raw.length - sectionMatch[0].length).trim();
    return { text, sources };
  }

  return { text: raw.trim(), sources };
}

/** Base URL du serveur FastAPI (sans slash final). `AGENT_API_URL` est un alias de `AGENT_API_BASE_URL`. */
function agentBaseUrl(): string {
  const raw =
    process.env.AGENT_API_BASE_URL?.trim() ||
    process.env.AGENT_API_URL?.trim() ||
    "http://127.0.0.1:8000";
  return raw.replace(/\/$/, "");
}

function agentAssistantUrl(): string {
  return `${agentBaseUrl()}/api/v1/agent/assistant`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { messages?: UIMessage[] };
  try {
    body = (await req.json()) as { messages?: UIMessage[] };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages requis", { status: 400 });
  }

  const mapped = mapUIMessagesToChatPayload(messages);
  if (!mapped.ok) {
    return new Response(mapped.error, { status: 400 });
  }

  /**
   * `customer_id: null` + historique complet : une conversation UI = un fil isolé côté Next,
   * sans mélanger les threads LangGraph (voir `agent/app/api/routes/agents.py`).
   */
  const payload = {
    customer_message: mapped.payload.customer_message,
    conversation_history: mapped.payload.conversation_history,
    customer_id: null as string | null,
  };

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      let res: Response;
      try {
        res = await fetch(agentAssistantUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: req.signal,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur réseau";
        writer.write({
          type: "error",
          errorText: msg,
        });
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        writer.write({
          type: "error",
          errorText: errText.slice(0, 500) || `HTTP ${res.status}`,
        });
        return;
      }

      let data: { message?: string };
      try {
        data = (await res.json()) as { message?: string };
      } catch {
        writer.write({
          type: "error",
          errorText: "Réponse agent invalide (JSON attendu).",
        });
        return;
      }

      const raw = typeof data.message === "string" ? data.message : "";
      const { text, sources } = extractSources(raw);
      const textId = generateId();

      // Émettre les sources avant le texte pour que SourcesPanel s'affiche dès la fin du stream
      for (const src of sources) {
        writer.write({
          type: "source-url",
          sourceId: generateId(),
          url: src.url,
          title: src.title,
        });
      }

      writer.write({ type: "text-start", id: textId });

      if (text.length === 0) {
        writer.write({ type: "text-end", id: textId });
        return;
      }

      /**
       * L’agent FastAPI renvoie déjà le texte complet en JSON ; on découpe en deltas
       * pour l’UI. Sans pause async entre les écritures, tout part souvent dans un
       * seul chunk réseau → pas d’effet « streaming » côté navigateur.
       */
      const chunkDelayMs = Math.max(
        0,
        Number.parseInt(process.env.AGENT_CHAT_STREAM_CHUNK_DELAY_MS ?? "12", 10) || 0,
      );
      const step = Math.min(24, Math.max(1, Math.ceil(text.length / 40)));
      for (let i = 0; i < text.length; i += step) {
        writer.write({
          type: "text-delta",
          id: textId,
          delta: text.slice(i, i + step),
        });
        if (chunkDelayMs > 0 && i + step < text.length) {
          await new Promise((r) => setTimeout(r, chunkDelayMs));
        }
      }
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export const maxDuration = 120;
