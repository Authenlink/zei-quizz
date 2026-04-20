"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { achievementIconFor } from "@/components/learn/achievement-icons";

export type EarnedBadge = {
  id: number;
  achievementType: string;
  label: string;
  description: string;
  icon: string;
  earnedAt: string;
};

export type LockedBadge = {
  achievementType: string;
  label: string;
  description: string;
  icon: string;
};

export type BadgeGalleryLayout = "compact" | "detailed";

/** En mode `detailed`, contrôle quelles sections afficher (filtre page badges). */
export type BadgeGallerySections = "both" | "earned" | "locked";

export function BadgeGallery({
  earned,
  locked,
  layout = "compact",
  showOuterCard = true,
  earnedTitle = "Obtenus",
  lockedTitle = "À débloquer",
  sections = "both",
}: {
  earned: EarnedBadge[];
  locked: LockedBadge[];
  layout?: BadgeGalleryLayout;
  showOuterCard?: boolean;
  earnedTitle?: string;
  lockedTitle?: string;
  sections?: BadgeGallerySections;
}) {
  const gridClass =
    layout === "detailed"
      ? "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
      : "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6";

  const inner = (
    <>
      {layout === "detailed" ? (
        <div className="space-y-8">
          {(sections === "both" || sections === "earned") && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">{earnedTitle}</h2>
              {earned.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun badge dans cette vue.
                </p>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <ul className={gridClass}>
                    {earned.map((a) => {
                      const Icon = achievementIconFor(a.icon);
                      return (
                        <li key={a.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm",
                                  "ring-1 ring-amber-500/20"
                                )}
                              >
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                  <Icon className="h-7 w-7" />
                                </div>
                                <span className="line-clamp-2 text-xs font-medium leading-tight">
                                  {a.label}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <p className="font-medium">{a.label}</p>
                              <p className="text-muted-foreground text-xs">{a.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ul>
                </TooltipProvider>
              )}
            </section>
          )}
          {(sections === "both" || sections === "locked") && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">{lockedTitle}</h2>
              {locked.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun badge dans cette vue.
                </p>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <ul className={gridClass}>
                    {locked.map((a) => {
                      const Icon = achievementIconFor(a.icon);
                      return (
                        <li key={a.achievementType}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/30 p-4 text-center",
                                  "opacity-60 grayscale"
                                )}
                              >
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                  <Icon className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <span className="line-clamp-2 text-xs font-medium leading-tight text-muted-foreground">
                                  {a.label}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <p className="font-medium">{a.label}</p>
                              <p className="text-muted-foreground text-xs">{a.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ul>
                </TooltipProvider>
              )}
            </section>
          )}
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <ul className={gridClass}>
            {earned.map((a) => {
              const Icon = achievementIconFor(a.icon);
              return (
                <li key={a.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center shadow-sm",
                          "ring-1 ring-amber-500/20"
                        )}
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight">
                          {a.label}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium">{a.label}</p>
                      <p className="text-muted-foreground text-xs">{a.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
            {locked.map((a) => {
              const Icon = achievementIconFor(a.icon);
              return (
                <li key={a.achievementType}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/30 p-3 text-center",
                          "opacity-60 grayscale"
                        )}
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
                          {a.label}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium">{a.label}</p>
                      <p className="text-muted-foreground text-xs">{a.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      )}
    </>
  );

  if (!showOuterCard) {
    return inner;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Badges</CardTitle>
        <p className="text-xs text-muted-foreground">
          {earned.length} obtenu{earned.length !== 1 ? "s" : ""} · {locked.length} à débloquer
        </p>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}
