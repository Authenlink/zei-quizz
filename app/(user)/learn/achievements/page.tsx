"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useScrollContainer } from "@/hooks/use-scroll";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { useSetToc } from "@/hooks/use-toc";
import {
  BadgeGallery,
  type BadgeGallerySections,
  type EarnedBadge,
  type LockedBadge,
} from "@/components/learn/BadgeGallery";
import { ACHIEVEMENT_CATALOG_KEYS } from "@/lib/achievements";

type Filter = "all" | "earned" | "locked";

export default function AchievementsPage() {
  useSetToc([]);

  const { status } = useSession();
  const router = useRouter();
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [locked, setLocked] = useState<LockedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const totalCatalog = ACHIEVEMENT_CATALOG_KEYS.length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/achievements");
      const data = (await r.json()) as {
        error?: string;
        achievements?: EarnedBadge[];
        locked?: LockedBadge[];
      };
      if (!r.ok || data.error) {
        setError(typeof data.error === "string" ? data.error : "Chargement impossible.");
        setEarned([]);
        setLocked([]);
        return;
      }
      setEarned(data.achievements ?? []);
      setLocked(data.locked ?? []);
    } catch {
      setError("Erreur réseau.");
      setEarned([]);
      setLocked([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void load();
  }, [status, load]);

  const gallerySections: BadgeGallerySections =
    filter === "earned" ? "earned" : filter === "locked" ? "locked" : "both";

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <Skeleton className="h-6 w-6" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Skeleton className="h-4 w-48" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:px-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 w-full max-w-3xl rounded-xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <header
        className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
          hasScrolled ? "border-b" : ""
        }`}
      >
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/learn/formations">Formation</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Mes badges</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mes badges</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-xl">
                Objectifs du parcours ZEI Quizz : complétez les thèmes, enchaînez les modules et visez le
                badge plateforme complète.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Progression</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {earned.length} / {totalCatalog}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Badges du catalogue débloqués
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Obtenus</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{earned.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Dont experts thème et badges spéciaux
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>À débloquer</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{locked.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Restants dans le catalogue
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!error && (
          <Card className="max-w-4xl">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Galerie</CardTitle>
                <CardDescription className="mt-1">
                  Même catalogue que sur le portail ; filtres pour se concentrer sur une catégorie.
                </CardDescription>
              </div>
              <ToggleGroup
                type="single"
                variant="outline"
                value={filter}
                onValueChange={(v) => {
                  if (v === "all" || v === "earned" || v === "locked") setFilter(v);
                }}
                className="flex-wrap justify-start"
              >
                <ToggleGroupItem value="all" aria-label="Tous les badges">
                  Tous
                </ToggleGroupItem>
                <ToggleGroupItem value="earned" aria-label="Badges obtenus">
                  Obtenus
                </ToggleGroupItem>
                <ToggleGroupItem value="locked" aria-label="Badges à débloquer">
                  À débloquer
                </ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent>
              <BadgeGallery
                earned={earned}
                locked={locked}
                layout="detailed"
                showOuterCard={false}
                sections={gallerySections}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
