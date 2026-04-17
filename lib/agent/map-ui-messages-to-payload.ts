import type { UIMessage } from "ai";
import type { ChatInput, MessageHistory } from "@/types/agent";

function textFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export type MapMessagesResult =
  | { ok: true; payload: Pick<ChatInput, "customer_message" | "conversation_history"> }
  | { ok: false; error: string };

/**
 * Derives FastAPI chat payload from UI messages: last user turn → customer_message,
 * prior user/assistant turns → conversation_history.
 */
export function mapUIMessagesToChatPayload(messages: UIMessage[]): MapMessagesResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages requis." };
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return { ok: false, error: "Le dernier message doit être un message utilisateur." };
  }

  const customer_message = textFromUIMessage(last).trim();
  if (!customer_message) {
    return { ok: false, error: "Le message utilisateur est vide." };
  }

  const conversation_history: MessageHistory[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i];
    const content = textFromUIMessage(m).trim();
    if (!content) continue;
    if (m.role === "user") {
      conversation_history.push({ role: "human", content });
    } else if (m.role === "assistant") {
      conversation_history.push({ role: "assistant", content });
    }
  }

  return {
    ok: true,
    payload: { customer_message, conversation_history },
  };
}
