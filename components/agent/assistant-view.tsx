"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { AssistantChat } from "@/components/agent/assistant-chat";
import {
  ConversationSidebar,
  type ConversationListItem,
} from "@/components/agent/conversation-sidebar";
import { StickyHeader } from "@/components/agent/sticky-header";

function AssistantViewSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:block w-[min(100%,18rem)] border-r p-3">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-14 w-full mb-2" />
          <Skeleton className="h-14 w-full mb-2" />
        </aside>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-10 w-[72%] self-end ml-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

function AssistantViewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cParam = searchParams.get("c");

  const messagesScrollRef = React.useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = React.useState<
    ConversationListItem[]
  >([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [bootstrapping, setBootstrapping] = React.useState(!cParam);

  const refreshList = React.useCallback(async () => {
    const res = await fetch("/api/conversations", { credentials: "include" });
    if (!res.ok) {
      toast.error("Impossible de charger les conversations.");
      return;
    }
    const data = (await res.json()) as {
      conversations?: ConversationListItem[];
    };
    setConversations(data.conversations ?? []);
  }, []);

  React.useEffect(() => {
    void (async () => {
      setListLoading(true);
      await refreshList();
      setListLoading(false);
    })();
  }, [refreshList]);

  React.useEffect(() => {
    if (cParam) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/conversations", {
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as {
          conversations?: ConversationListItem[];
        };
        const list = data.conversations ?? [];
        if (cancelled) return;
        if (list.length > 0) {
          router.replace(`/agent?c=${list[0].id}`);
        } else {
          const post = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: "{}",
          });
          if (!post.ok) throw new Error(await post.text());
          const created = (await post.json()) as { id: string };
          router.replace(`/agent?c=${created.id}`);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error("Impossible d’ouvrir l’assistant.");
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cParam, router]);

  const activeId = cParam ?? "";

  const handleNew = React.useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as { id: string };
      await refreshList();
      router.push(`/agent?c=${created.id}`);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de créer une conversation.");
    }
  }, [router, refreshList]);

  const handleSelect = React.useCallback(
    (id: string) => {
      router.push(`/agent?c=${id}`);
    },
    [router],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());

        const listRes = await fetch("/api/conversations", {
          credentials: "include",
        });
        const data = (await listRes.json()) as {
          conversations?: ConversationListItem[];
        };
        const next = data.conversations ?? [];
        setConversations(next);

        if (id !== activeId) return;

        if (next.length > 0) {
          router.replace(`/agent?c=${next[0].id}`);
          return;
        }
        const post = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: "{}",
        });
        if (!post.ok) throw new Error(await post.text());
        const created = (await post.json()) as { id: string };
        router.replace(`/agent?c=${created.id}`);
      } catch (e) {
        console.error(e);
        toast.error("Suppression impossible.");
      }
    },
    [activeId, router],
  );

  if (bootstrapping || !cParam) {
    return <AssistantViewSkeleton />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        loading={listLoading}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <StickyHeader scrollContainerRef={messagesScrollRef}>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href="/portal">Portail</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Assistant IA CSRD/RSE</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </StickyHeader>

        <AssistantChat
          key={activeId}
          conversationId={activeId}
          messagesScrollRef={messagesScrollRef}
          onConversationSynced={refreshList}
          onInvalidConversation={() => {
            router.replace("/agent");
          }}
        />
      </div>
    </div>
  );
}

export function AssistantView() {
  return (
    <React.Suspense fallback={<AssistantViewSkeleton />}>
      <AssistantViewInner />
    </React.Suspense>
  );
}
