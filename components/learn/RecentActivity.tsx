"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentQuizAttempt } from "@/lib/types/progress-dashboard";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function RecentActivity({ attempts }: { attempts: RecentQuizAttempt[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun quiz pour l’instant. Lancez un module depuis les formations.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {attempts.map((a) => (
              <li key={a.id}>
                {a.href ? (
                  <Link
                    href={a.href}
                    className="flex items-center justify-between gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.moduleTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.completedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 tabular-nums">
                      <span className="font-semibold">{a.score}%</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.moduleTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.completedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{a.score}%</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
