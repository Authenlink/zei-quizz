"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import {
  BadgeGallery,
  type EarnedBadge,
  type LockedBadge,
} from "@/components/learn/BadgeGallery";
import { ProgressRing } from "@/components/learn/ProgressRing";
import { RecentActivity } from "@/components/learn/RecentActivity";
import { RecommendedModuleCard } from "@/components/learn/RecommendedModuleCard";
import { StatsCards } from "@/components/learn/StatsCards";
import { ThemeProgressBar } from "@/components/learn/ThemeProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useScrollContainer } from "@/hooks/use-scroll";
import { useSetToc } from "@/hooks/use-toc";
import type { ProgressDashboardPayload } from "@/lib/types/progress-dashboard";

function PortalSessionSkeleton() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-6 w-6" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Skeleton className="h-4 w-32" />
        </div>
      </header>
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 pt-6 sm:px-6">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 pt-6">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-full max-w-[140px]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function PortalDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 pt-6">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-full max-w-[160px]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        <Card className="flex min-h-[280px] flex-col overflow-hidden lg:col-span-1">
          <CardHeader className="shrink-0 pb-0">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center pb-4 pt-4">
            <Skeleton className="aspect-square h-[200px] max-h-[220px] w-full max-w-[220px] rounded-full" />
          </CardContent>
        </Card>
        <Card className="min-h-[280px] lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="min-w-0 lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-full max-w-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-9 w-full max-w-xs sm:max-w-xs" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[220px]">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-b border-border/60 pb-3 last:border-0">
                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full max-w-[200px]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="min-h-[220px]">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PortalHomePage() {
  useSetToc([]);

  const { data: session, status } = useSession();
  const router = useRouter();
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [progress, setProgress] = useState<ProgressDashboardPayload | null>(
    null,
  );
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [lockedBadges, setLockedBadges] = useState<LockedBadge[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [pr, ac] = await Promise.all([
        fetch("/api/progress"),
        fetch("/api/achievements"),
      ]);
      const pJson = await pr.json();
      const aJson = (await ac.json()) as {
        error?: string;
        achievements?: EarnedBadge[];
        locked?: LockedBadge[];
      };

      if (!pr.ok) {
        setProgress(null);
        const msg =
          typeof (pJson as { error?: string }).error === "string"
            ? (pJson as { error: string }).error
            : "Progression indisponible.";
        setDashboardError(msg);
      } else {
        setProgress(pJson as ProgressDashboardPayload);
      }

      if (ac.ok && !aJson.error && aJson.achievements && aJson.locked) {
        setEarnedBadges(aJson.achievements);
        setLockedBadges(aJson.locked);
      } else {
        setEarnedBadges([]);
        setLockedBadges([]);
      }
    } catch {
      setDashboardError("Erreur réseau.");
      setProgress(null);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadDashboard();
  }, [status, loadDashboard]);

  if (status === "loading") {
    return <PortalSessionSkeleton />;
  }

  if (!session) return null;

  return (
    <>
      <header
        className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
          hasScrolled ? "border-b" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 px-4 sm:px-6">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Accueil</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col gap-8 p-4 pt-6 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">
            Bienvenue, {session.user.name} !
          </h1>
        </div>

        {/* Formation & quiz */}
        <section className="space-y-3" aria-labelledby="portal-learn-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <h2
                id="portal-learn-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Formation & quiz
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/learn/formations">Catalogue</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/learn/achievements">Tous les badges</Link>
              </Button>
            </div>
          </div>

          {dashboardLoading && <PortalDashboardSkeleton />}

          {!dashboardLoading && dashboardError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {dashboardError}
            </div>
          )}

          {!dashboardLoading && progress && (
            <div className="space-y-6">
              <StatsCards
                completedModules={progress.completedModules}
                totalModules={progress.totalModules}
                averageScore={progress.averageScore}
                totalAttempts={progress.totalAttempts}
                zeiEnrichedModulesConsulted={
                  progress.zeiEnrichedModulesConsulted
                }
                themes={progress.themes}
              />

              <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
                <div className="min-h-0 lg:col-span-1">
                  <ProgressRing
                    className="w-full"
                    globalProgressPercent={progress.globalProgressPercent}
                  />
                </div>
                <div className="min-h-0 lg:col-span-2">
                  <ThemeProgressBar
                    className="w-full"
                    themes={progress.themes}
                  />
                </div>
                <div className="min-w-0 lg:col-span-3">
                  <RecommendedModuleCard
                    recommendedModule={progress.recommendedModule}
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <RecentActivity attempts={progress.recentAttempts} />
                <BadgeGallery earned={earnedBadges} locked={lockedBadges} />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
