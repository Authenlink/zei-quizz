"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { useScrollContainer } from "@/hooks/use-scroll";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { useSetToc } from "@/hooks/use-toc";
import { ModuleCard, type ModuleCardData } from "@/components/learn/ModuleCard";
import { DifficultyBadge } from "@/components/learn/DifficultyBadge";

interface SubthemeData {
  id: number;
  slug: string;
  title: string;
  description: string;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  modules: ModuleCardData[];
}

interface ThemeData {
  id: number;
  slug: string;
  title: string;
}

export default function SubthemePage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const themeSlug = params.themeSlug as string;
  const subthemeSlug = params.subthemeSlug as string;
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [subtheme, setSubtheme] = useState<SubthemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ToC: one entry per module
  useSetToc(
    subtheme?.modules.map((m) => ({
      id: `module-${m.slug}`,
      title: m.title,
      level: 1 as const,
    })) ?? []
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !themeSlug || !subthemeSlug) return;
    fetch(`/api/quiz/themes/${themeSlug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Thème introuvable");
        return r.json();
      })
      .then((d: { theme: ThemeData; subthemes: SubthemeData[] }) => {
        setTheme(d.theme);
        const found = d.subthemes.find((s) => s.slug === subthemeSlug);
        if (!found) throw new Error("Sous-thème introuvable");
        setSubtheme(found);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, themeSlug, subthemeSlug]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <Skeleton className="h-6 w-6" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Skeleton className="h-4 w-72" />
          </div>
        </header>
        <div className="w-full px-6 sm:px-8 py-8 flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error || !subtheme || !theme) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <p className="text-sm text-destructive">{error ?? "Sous-thème introuvable."}</p>
        <Link href={`/learn/${themeSlug}`} className="text-sm text-primary underline">
          ← Retour au thème
        </Link>
      </div>
    );
  }

  const difficultyStats = subtheme.modules.reduce(
    (acc, m) => {
      acc[m.difficulty] = (acc[m.difficulty] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

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
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/learn/formations">Formation</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/learn/${theme.slug}`}>{theme.title}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{subtheme.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full px-6 sm:px-8 py-8 flex flex-col gap-8">
        {/* Subtheme header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{subtheme.title}</h1>
            {subtheme.description && (
              <p className="mt-1.5 text-base text-muted-foreground">
                {subtheme.description}
              </p>
            )}
          </div>

          {/* Progress summary */}
          <div className="flex items-center gap-6 rounded-xl border bg-card px-6 py-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Progression</span>
                <span className="font-semibold">
                  {subtheme.completedModules}/{subtheme.totalModules} modules complétés
                </span>
              </div>
              <Progress value={subtheme.progressPercent} className="h-2.5" />
            </div>
            <div className="shrink-0 text-3xl font-bold text-primary tabular-nums">
              {subtheme.progressPercent}%
            </div>
          </div>

          {/* Difficulty distribution */}
          {Object.keys(difficultyStats).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(["debutant", "intermediaire", "avance"] as const).map((d) => {
                const count = difficultyStats[d];
                if (!count) return null;
                return (
                  <div key={d} className="flex items-center gap-1.5">
                    <DifficultyBadge difficulty={d} />
                    <span className="text-xs text-muted-foreground">×{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modules list */}
        <section id={`modules-${subtheme.slug}`}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Modules ({subtheme.modules.length})
          </h2>

          {subtheme.modules.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/40 p-12 text-center">
              <p className="text-sm text-muted-foreground">Modules à venir.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2" id={`module-list-${subtheme.slug}`}>
              {subtheme.modules.map((mod) => (
                <div key={mod.id} id={`module-${mod.slug}`}>
                  <ModuleCard
                    module={mod}
                    href={`/learn/${themeSlug}/${subthemeSlug}/${mod.slug}`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
