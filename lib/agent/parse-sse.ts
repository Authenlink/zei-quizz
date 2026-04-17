import type { RagSourceItem, SseEvent } from "@/types/agent";

/**
 * Normalise un bloc SSE vers token | sources | done.
 *
 * Beaucoup de serveurs (Starlette, etc.) n’envoient pas `event:` : le nom d’événement
 * par défaut côté navigateur est alors `message`, ce qui faisait ignorer tous les blocs
 * si on ne filtrait que `event: token|sources|done`.
 *
 * On déduit aussi le type à partir de la forme du JSON (`delta`, `items`, `message`, `content`).
 */
function normalizeSseBlock(eventName: string, parsed: unknown): SseEvent | null {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const o = parsed as Record<string, unknown>;

  const explicit =
    eventName === "token" || eventName === "sources" || eventName === "done"
      ? eventName
      : null;

  let kind: "token" | "sources" | "done" | null = explicit;

  if (!kind) {
    if (Array.isArray(o.items)) kind = "sources";
    else if (typeof o.delta === "string") kind = "token";
    else if (typeof o.message === "string") kind = "done";
    else if (typeof o.content === "string") kind = "token";
  }

  if (kind === "token") {
    const delta =
      typeof o.delta === "string"
        ? o.delta
        : typeof o.content === "string"
          ? o.content
          : "";
    if (delta.length === 0) return null;
    return { event: "token", data: { delta } };
  }

  if (kind === "sources") {
    const raw = o.items;
    const items: RagSourceItem[] = Array.isArray(raw)
      ? (raw as RagSourceItem[]).filter(
          (it): it is RagSourceItem =>
            !!it &&
            typeof it === "object" &&
            typeof (it as RagSourceItem).url === "string"
        )
      : [];
    return { event: "sources", data: { items } };
  }

  if (kind === "done") {
    const message =
      typeof o.message === "string"
        ? o.message
        : typeof o.content === "string"
          ? o.content
          : "";
    return { event: "done", data: { message } };
  }

  return null;
}

/**
 * Parses a Server-Sent Events stream from a ReadableStream<Uint8Array>.
 *
 * Yields typed SseEvent objects as they arrive. Tolerates partial chunks
 * (buffers across reads) and skips blocks with malformed JSON silently.
 *
 * Usage (client or Route Handler):
 *   for await (const ev of parseSseStream(response.body!)) {
 *     if (ev.event === "token") append(ev.data.delta);
 *     if (ev.event === "sources") setSources(ev.data.items);
 *     if (ev.event === "done") finalize(ev.data.message);
 *   }
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Blocs SSE séparés par une ligne vide ; gérer LF et CRLF (souvent côté Python / proxies).
      const blocks = buffer.split(/\r?\n\r?\n/);
      // Keep the last (possibly incomplete) block in the buffer.
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        const lines = block.split(/\r?\n/);
        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (dataLines.length === 0) continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(dataLines.join("\n"));
        } catch {
          continue;
        }

        const normalized = normalizeSseBlock(eventName, parsed);
        if (normalized) {
          yield normalized;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
