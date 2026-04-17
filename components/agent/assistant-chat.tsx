"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import {
  Bot,
  Sparkles,
  MessageCircle,
  Send,
  BookOpen,
  AlertCircle,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { DefaultChatTransport, type SourceUrlUIPart, type UIMessage } from "ai";

import type { RagSourceItem } from "@/types/agent";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "C'est quoi un Demander Stockly et quel problème ça règle pour mon e-commerce ?",
  "Comment Stockly comble les ruptures de stock sans changer l'expérience d'achat client ?",
  "Quelle différence entre rejoindre le réseau en tant que Demander ou en tant que Supplier ?",
  "Quelle est la vision de Stockly sur le partage d'inventaire entre retailers officiels ?",
  "En quoi l'intégration avec Stockly reste-t-elle simple pour mon site et mes process ?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function textFromParts(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function sourcesFromParts(message: UIMessage): RagSourceItem[] {
  return message.parts
    .filter((p): p is SourceUrlUIPart => p.type === "source-url")
    .map((p) => ({
      title: p.title ?? "",
      url: p.url,
      category: "",
      source: "",
    }));
}

/** Dernier message assistant en cours de génération (y compris phase `submitted`). */
function isAssistantLoading(
  message: UIMessage,
  status: string,
  allMessages: UIMessage[],
): boolean {
  if (message.role !== "assistant") return false;
  const last = allMessages[allMessages.length - 1];
  if (!last || last.id !== message.id) return false;
  if (status === "submitted") return true;
  if (status !== "streaming") return false;
  const text = textFromParts(message);
  if (text.length === 0) return true;
  return message.parts.some(
    (p) => p.type === "text" && p.state === "streaming",
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourcesPanel({ sources }: { sources: RagSourceItem[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground font-medium">Sources</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => {
          let label = s.title;
          if (!label) {
            try {
              label = new URL(s.url).hostname;
            } catch {
              label = s.url;
            }
          }
          return (
            <a
              key={`${s.url}-${i}`}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted/50 transition-colors group"
            >
              <BookOpen className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="max-w-[180px] truncate">{label}</span>
              {s.category && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1 py-0 h-4"
                >
                  {s.category}
                </Badge>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function AssistantBubble({
  content,
  sources,
  incomplete,
  isLoading,
}: {
  content: string;
  sources: RagSourceItem[];
  incomplete?: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 mt-1">
        <Bot className="h-4 w-4 text-primary" />
        <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
          <Sparkles className="h-2 w-2 text-primary-foreground" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3">
          {content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {content}
              {isLoading && <StreamingDots />}
            </p>
          ) : isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-[85%]" />
              <Skeleton className="h-3 w-[70%]" />
              <Skeleton className="h-3 w-[55%]" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Réponse vide (vérifiez l’onglet Réseau : flux assistant).
            </p>
          )}
        </div>
        {incomplete && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span>Réponse incomplète (connexion interrompue)</span>
          </div>
        )}
        {!isLoading && <SourcesPanel sources={sources} />}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3">
        <p className="text-sm text-primary-foreground leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
        </div>
        <h2 className="text-xl font-bold">Assistant IA Stockly</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
          Posez des questions sur le modèle Stockly, le réseau Demander et
          Supplier, et la mise en place — les réponses s'appuient sur la base
          documentaire branchée à votre agent.
        </p>
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Questions suggérées</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onSuggest(q)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              {q}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export type AssistantChatProps = {
  /** Identifiant du fil (aligné sur `useChat` et sur la ligne `assistant_conversations`). */
  conversationId: string;
  /** Conteneur scrollable des messages (partagé avec StickyHeader pour la bordure au scroll). */
  messagesScrollRef?: React.RefObject<HTMLDivElement | null>;
  /** Après sauvegarde des messages en base (fin de tour assistant). */
  onConversationSynced?: () => void;
  /** Conversation ou URL invalide : ex. retour au choix par défaut. */
  onInvalidConversation?: () => void;
};

export function AssistantChat({
  conversationId,
  messagesScrollRef,
  onConversationSynced,
  onInvalidConversation,
}: AssistantChatProps) {
  const [input, setInput] = React.useState("");
  const [streamDisconnected, setStreamDisconnected] = React.useState(false);
  const [historyReady, setHistoryReady] = React.useState(false);
  const fallbackScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = messagesScrollRef ?? fallbackScrollRef;
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        credentials: "include",
        prepareSendMessagesRequest: (opts) => ({
          body: {
            ...(opts.body && typeof opts.body === "object" ? opts.body : {}),
            messages: opts.messages,
            conversationId,
          },
        }),
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: conversationId,
    transport,
    onError: (err) => {
      toast.error("Erreur", { description: err.message });
    },
    onFinish: async ({ messages: nextMessages, isDisconnect }) => {
      if (isDisconnect) setStreamDisconnected(true);
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ messages: nextMessages }),
          },
        );
        if (!res.ok) {
          throw new Error(await res.text());
        }
        onConversationSynced?.();
      } catch (e) {
        console.error("[assistant] Sauvegarde messages:", e);
        toast.error("Impossible d’enregistrer la conversation.");
      }
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    setHistoryReady(false);
    setStreamDisconnected(false);

    void (async () => {
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages`,
          { credentials: "include" },
        );
        if (res.status === 404) {
          if (!cancelled) {
            toast.error("Conversation introuvable");
            onInvalidConversation?.();
          }
          return;
        }
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = (await res.json()) as { messages?: UIMessage[] };
        if (!cancelled) {
          setMessages(data.messages ?? []);
          setHistoryReady(true);
        }
      } catch (e) {
        console.error("[assistant] Chargement historique:", e);
        if (!cancelled) {
          toast.error("Impossible de charger l’historique.");
          setHistoryReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, setMessages, onInvalidConversation]);

  const isBusy = status === "submitted" || status === "streaming";
  const canInteract = historyReady && !isBusy;

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: isBusy ? "auto" : "smooth",
    });
  }, [messages, isBusy, status]);

  function handleSuggest(q: string) {
    setInput(q);
    textareaRef.current?.focus();
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isBusy || !historyReady) return;
    setInput("");
    setStreamDisconnected(false);
    void sendMessage({ text: trimmed });
  }

  function handleStop() {
    stop();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
      >
        {!historyReady ? (
          <div className="mx-auto max-w-2xl flex flex-col gap-4 pb-6 pt-4">
            <Skeleton className="h-10 w-[72%] self-end rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-16 w-[90%] rounded-2xl" />
          </div>
        ) : isEmpty ? (
          <EmptyState onSuggest={handleSuggest} />
        ) : (
          <div className="mx-auto max-w-2xl flex flex-col gap-4 pb-6">
            {messages.map((msg, i) => {
              if (msg.role === "user") {
                return <UserBubble key={msg.id} content={textFromParts(msg)} />;
              }
              const content = textFromParts(msg);
              const sources = sourcesFromParts(msg);
              const isLast = i === messages.length - 1;
              const loading = isAssistantLoading(msg, status, messages);
              const incomplete =
                isLast && streamDisconnected && msg.role === "assistant";

              return (
                <AssistantBubble
                  key={msg.id}
                  content={content}
                  sources={sources}
                  incomplete={incomplete}
                  isLoading={loading}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
        <div className="mx-auto max-w-2xl">
          {!isEmpty && (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggest(q)}
                  disabled={!canInteract}
                  className="shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question sur Stockly, le réseau ou l'intégration…"
              disabled={!canInteract}
              rows={1}
              className="min-h-[44px] max-h-36 resize-none flex-1 py-2.5"
            />

            {isBusy && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-11 w-11"
                onClick={handleStop}
                aria-label="Arrêter la génération"
              >
                <Square className="h-4 w-4" />
              </Button>
            )}

            <Button
              onClick={handleSend}
              disabled={!input.trim() || !canInteract}
              size="icon"
              className="shrink-0 h-11 w-11"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Entrée pour envoyer · Maj+Entrée pour un saut de ligne · flux
            assistant via AI SDK
          </p>
        </div>
      </div>
    </div>
  );
}
