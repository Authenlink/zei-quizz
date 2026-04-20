"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
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
import { useScrollContainer } from "@/hooks/use-scroll";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { useSetToc } from "@/hooks/use-toc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeCard, type ThemeCardData } from "@/components/learn/ThemeCard";

function LearnCatalogSkeleton() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-6 w-6" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Skeleton className="h-4 w-40" />
        </div>
      </header>
      <div className="w-full min-w-0 max-w-none px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 flex flex-col items-start gap-8 text-left">
        <div className="flex w-full items-start gap-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-9 w-64 max-w-full" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-full overflow-hidden">
              <CardHeader className="pb-3 text-left">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-full max-w-[220px]" />
                    <Skeleton className="h-3 w-full max-w-[260px]" />
                    <Skeleton className="h-3 w-full max-w-[200px]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-left">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

export type LearnCatalogViewProps = {
  /** Dernière entrée du fil d’Ariane (page courante) */
  breadcrumbCurrent: string;
  /** Si défini, affiche un lien « Formation » avant la page courante */
  breadcrumbParent?: { label: string; href: string };
  title: string;
  subtitle: string;
};

export function LearnCatalogView({
  breadcrumbCurrent,
  breadcrumbParent,
  title,
  subtitle,
}: LearnCatalogViewProps) {
  const { status } = useSession();
  const router = useRouter();
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [themes, setThemes] = useState<ThemeCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSetToc([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/quiz/themes")
      .then((r) => r.json())
      .then((data) => {
        if (data.themes) setThemes(data.themes);
        else setError("Impossible de charger les thèmes.");
      })
      .catch(() => setError("Erreur réseau."))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return <LearnCatalogSkeleton />;
  }

  return (
    <>
      <header
        className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
          hasScrolled ? "border-b" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbParent ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={breadcrumbParent.href}>{breadcrumbParent.label}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : null}
              <BreadcrumbItem>
                <BreadcrumbPage>{breadcrumbCurrent}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full min-w-0 max-w-none px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 flex flex-col items-start gap-8 text-left">
        <div className="flex w-full items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-base text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {error ? (
          <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-left text-sm text-destructive">
            {error}
          </div>
        ) : themes.length === 0 ? (
          <div className="w-full rounded-xl border border-dashed bg-muted/40 p-8 sm:p-12 text-left">
            <p className="text-sm text-muted-foreground">Aucun thème disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6">
            {themes.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
