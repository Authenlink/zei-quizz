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

interface SubthemeWithModules {
  id: number;
  slug: string;
  title: string;
  description: string;
  order: number;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  modules: ModuleCardData[];
}

interface ThemeDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface ThemePageData {
  theme: ThemeDetail;
  subthemes: SubthemeWithModules[];
}

export default function ThemePage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const themeSlug = params.themeSlug as string;
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [data, setData] = useState<ThemePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ToC: one entry per subtheme
  useSetToc(
    data?.subthemes.map((s) => ({
      id: `subtheme-${s.slug}`,
      title: s.title,
      level: 1 as const,
    })) ?? []
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !themeSlug) return;
    fetch(`/api/quiz/themes/${themeSlug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Thème introuvable");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, themeSlug]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <Skeleton className="h-6 w-6" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Skeleton className="h-4 w-56" />
          </div>
        </header>
        <div className="w-full px-6 sm:px-8 py-8 flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 pt-6">
        <p className="text-sm text-destructive">{error ?? "Thème introuvable."}</p>
        <Link href="/learn/formations" className="text-sm text-primary underline">
          ← Retour au catalogue
        </Link>
      </div>
    );
  }

  const { theme, subthemes } = data;

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
                <BreadcrumbPage>{theme.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full px-6 sm:px-8 py-8 flex flex-col gap-10">
        {/* Theme header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{theme.title}</h1>
          <p className="text-base text-muted-foreground">
            {theme.description}
          </p>
        </div>

        {/* Subthemes */}
        {subthemes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/40 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun sous-thème disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {subthemes.map((subtheme) => (
              <section key={subtheme.id} id={`subtheme-${subtheme.slug}`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/learn/${theme.slug}/${subtheme.slug}`}
                      className="group inline-flex items-center gap-1"
                    >
                      <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                        {subtheme.title}
                      </h2>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                    {subtheme.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {subtheme.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {subtheme.completedModules}/{subtheme.totalModules} modules
                    </p>
                    <Progress
                      value={subtheme.progressPercent}
                      className="mt-1 h-1.5 w-24"
                    />
                  </div>
                </div>

                {subtheme.modules.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {subtheme.modules.map((mod) => (
                      <ModuleCard
                        key={mod.id}
                        module={mod}
                        href={`/learn/${theme.slug}/${subtheme.slug}/${mod.slug}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Modules à venir.
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
