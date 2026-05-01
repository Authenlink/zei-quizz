"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, LayoutGrid, Library } from "lucide-react";

import { CategoryGlyph } from "@/components/learn/resource-category-icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useScrollContainer } from "@/hooks/use-scroll";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { useSetToc } from "@/hooks/use-toc";
import { cn } from "@/lib/utils";
import {
  RESOURCES,
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_UI,
  type ResourceCategory,
  type ResourceItem,
} from "@/lib/resources";

type Filter = "all" | ResourceCategory;

const toggleOnPrimary =
  "gap-2 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary";

export default function RessourcesPage() {
  const { status } = useSession();
  const router = useRouter();
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const visibleCategories = useMemo(
    () =>
      filter === "all"
        ? RESOURCE_CATEGORIES
        : RESOURCE_CATEGORIES.filter((c) => c.id === filter),
    [filter],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<ResourceCategory, ResourceItem[]>();
    for (const cat of RESOURCE_CATEGORIES) map.set(cat.id, []);
    for (const item of RESOURCES) {
      map.get(item.category)?.push(item);
    }
    return map;
  }, []);

  const tocItems = useMemo(() => {
    const items: { id: string; title: string; level: 1 | 2 | 3 }[] = [];
    for (const cat of visibleCategories) {
      items.push({ id: `cat-${cat.id}`, title: cat.label, level: 1 });
      for (const item of itemsByCategory.get(cat.id) ?? []) {
        items.push({ id: item.id, title: item.title, level: 2 });
      }
    }
    return items;
  }, [visibleCategories, itemsByCategory]);

  useSetToc(tocItems);

  if (status === "loading") {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <Skeleton className="h-6 w-6" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Skeleton className="h-4 w-40" />
        </header>
        <div className="w-full px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6">
          <Skeleton className="h-40 w-full max-w-4xl rounded-2xl" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
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
        <div className="flex min-w-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Ressources</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full min-w-0 max-w-none px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 flex flex-col items-start gap-8 text-left">
        {/* Hero */}
        <div className="w-full rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8">
          <div className="flex w-full items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Library className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Ressources
              </h1>
              <p className="mt-1 text-base text-muted-foreground">
                Le glossaire ZEI : définitions, cadres réglementaires, méthodes
                carbone et présentation des partenaires. Filtrez par catégorie
                pour aller à l&apos;essentiel, ou utilisez le sommaire à droite
                pour naviguer.
              </p>
            </div>
          </div>
        </div>

        {/* Filtre par catégorie */}
        <div className="flex w-full flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Catégories
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            value={filter}
            onValueChange={(v) => {
              if (
                v === "all" ||
                v === "regulatory" ||
                v === "esg" ||
                v === "carbon" ||
                v === "rating" ||
                v === "partner"
              ) {
                setFilter(v);
              }
            }}
            className="flex-wrap justify-start"
          >
            <ToggleGroupItem
              value="all"
              aria-label="Toutes les catégories"
              className={toggleOnPrimary}
            >
              <LayoutGrid className="size-4 shrink-0" aria-hidden />
              Tous
            </ToggleGroupItem>
            {RESOURCE_CATEGORIES.map((cat) => {
              const ui = RESOURCE_CATEGORY_UI[cat.id];
              return (
                <ToggleGroupItem
                  key={cat.id}
                  value={cat.id}
                  aria-label={cat.label}
                  className={toggleOnPrimary}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md",
                      ui.iconSurfaceClass,
                    )}
                  >
                    <CategoryGlyph
                      iconKey={ui.iconKey}
                      className="size-3.5 shrink-0"
                    />
                  </span>
                  {cat.label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>

        {/* Sections par catégorie */}
        <div className="flex w-full flex-col gap-12">
          {visibleCategories.map((cat) => {
            const items = itemsByCategory.get(cat.id) ?? [];
            if (items.length === 0) return null;
            return (
              <section
                key={cat.id}
                id={`cat-${cat.id}`}
                aria-labelledby={`cat-${cat.id}-heading`}
                className="flex w-full flex-col gap-5 scroll-mt-24"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 dark:ring-white/10",
                      RESOURCE_CATEGORY_UI[cat.id].iconSurfaceClass,
                    )}
                  >
                    <CategoryGlyph
                      iconKey={RESOURCE_CATEGORY_UI[cat.id].iconKey}
                      className="size-5"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-3">
                    <h2
                      id={`cat-${cat.id}-heading`}
                      className="text-2xl font-semibold tracking-tight"
                    >
                      {cat.label}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {items.length} fiche{items.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2">
                  {items.map((item) => (
                    <ResourceCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <Separator className="my-2" />

        <p className="w-full text-xs text-muted-foreground">
          Vous souhaitez aller plus loin sur un sujet ?{" "}
          <Link
            href="/learn/formations"
            className="font-medium text-primary hover:underline"
          >
            Suivez une formation
          </Link>{" "}
          ou{" "}
          <Link
            href="/agent"
            className="font-medium text-primary hover:underline"
          >
            posez votre question à l&apos;assistant IA
          </Link>
          .
        </p>
      </div>
    </>
  );
}

function ResourceCard({ item }: { item: ResourceItem }) {
  const ui = RESOURCE_CATEGORY_UI[item.category];

  return (
    <Card
      id={item.id}
      className={cn(
        "flex h-full flex-col scroll-mt-24 border-l-4 shadow-sm transition-shadow hover:shadow-md",
        ui.borderAccentClass,
      )}
      aria-labelledby={`${item.id}-title`}
    >
      <CardHeader className="gap-2">
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              ui.iconSurfaceClass,
            )}
          >
            <CategoryGlyph iconKey={ui.iconKey} className="size-5 shrink-0" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle
                id={`${item.id}-title`}
                className="text-lg font-semibold tracking-tight"
              >
                {item.title}
              </CardTitle>
              {item.isStub && (
                <Badge variant="outline" className="text-[10px]">
                  Bientôt enrichi
                </Badge>
              )}
            </div>
            {item.fullName && (
              <p className="text-xs text-muted-foreground">{item.fullName}</p>
            )}
            <p className="text-sm text-muted-foreground">{item.summary}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        {item.body.length > 0 && (
          <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
            {item.body.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        )}

        {item.keyPoints && item.keyPoints.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              À retenir
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm marker:text-primary/70">
              {item.keyPoints.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {item.links && item.links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {item.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {link.label}
                <ExternalLink className="size-3 shrink-0 opacity-80" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
