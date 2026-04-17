"use client";

import * as React from "react";
import { Menu, MessageSquarePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ConversationListItem = {
  id: string;
  title: string | null;
  updatedAt: string;
};

type ConversationSidebarProps = {
  conversations: ConversationListItem[];
  activeId: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l’instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Évite les écarts d’hydratation : pas de Date.now / locale côté SSR. */
function RelativeUpdatedAt({ iso }: { iso: string }) {
  const [label, setLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    setLabel(formatRelative(iso));
  }, [iso]);
  return (
    <span className="text-[11px] text-muted-foreground">{label ?? "—"}</span>
  );
}

function SidebarList({
  conversations,
  activeId,
  loading,
  onSelect,
  onDelete,
}: Omit<ConversationSidebarProps, "onNew">) {
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-3 py-4">
        Aucune conversation. Créez-en une pour commencer.
      </p>
    );
  }

  return (
    <>
      <ScrollArea className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
        <div className="flex flex-col gap-0.5 p-2">
          {conversations.map((c) => {
            const label = c.title?.trim() || "Nouvelle conversation";
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={cn(
                  "group flex items-stretch gap-0 rounded-lg border border-transparent",
                  active && "border-border bg-muted/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    "hover:bg-muted/80",
                    active && "hover:bg-muted/60",
                  )}
                >
                  <span className="line-clamp-2 font-medium leading-snug">
                    {label}
                  </span>
                  <RelativeUpdatedAt iso={c.updatedAt} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(c.id);
                  }}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Supprimer la conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Supprimer cette conversation ?</DialogTitle>
            <DialogDescription>
              Les messages seront définitivement effacés. Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: ConversationSidebarProps) {
  /** Radix Sheet génère des ids instables en SSR → on ne monte le Sheet qu’après hydratation. */
  const [sheetMounted, setSheetMounted] = React.useState(false);
  React.useEffect(() => {
    setSheetMounted(true);
  }, []);

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </span>
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-8 gap-1"
          onClick={onNew}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Nouvelle
        </Button>
      </div>
      <Separator className="mb-2" />
      <SidebarList
        conversations={conversations}
        activeId={activeId}
        loading={loading}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </div>
  );

  return (
    <>
      {/* Mobile : Sheet uniquement après hydratation (ids Radix stables). */}
      <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
        {sheetMounted ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Liste des conversations"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[min(100%,20rem)] p-0 flex flex-col"
            >
              <SheetHeader className="p-4 pb-0 text-left">
                <SheetTitle>Historique</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col p-4 pt-2">
                {list}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Liste des conversations"
            disabled
            className="pointer-events-none opacity-70"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <span className="text-sm font-medium truncate">Assistant IA</span>
      </div>

      {/* Desktop */}
      <aside className="hidden md:flex w-[min(100%,18rem)] shrink-0 flex-col border-r bg-muted/20">
        <div className="p-3 pt-4">{list}</div>
      </aside>
    </>
  );
}
