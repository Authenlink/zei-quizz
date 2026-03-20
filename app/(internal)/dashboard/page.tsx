"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListFilter, ArrowUpDown } from "lucide-react";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { FilterInput } from "@/components/ui/filter-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Separator } from "@/components/ui/separator";
import { SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useScrollContainer } from "@/hooks/use-scroll";
import { getAccountContextLabel } from "@/lib/account-context";

const demoComboboxOptions: ComboboxOption[] = [
  { value: "a", label: "Option Alpha" },
  { value: "b", label: "Option Bêta" },
  { value: "c", label: "Option Gamma" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [combo, setCombo] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
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

        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="aspect-video rounded-xl" />
          </div>

          <Skeleton className="h-96 rounded-xl" />
        </div>
      </>
    );
  }

  if (!session) {
    return null;
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
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold">
            Bienvenue, {session.user.name} !
          </h1>
          <p className="text-muted-foreground">
            <span className="text-foreground/80">
              {getAccountContextLabel(session.user)}
            </span>
            {" — "}
            Voici votre tableau de bord.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Barre d&apos;outils (exemple)
          </h3>
          <p className="text-muted-foreground mb-4 text-xs">
            <code className="text-foreground">FilterInput</code> +{" "}
            <code className="text-foreground">FilterSelect</code> +{" "}
            <code className="text-foreground">Combobox</code> — pattern décrit dans
            UPDATE.md.
            {debouncedSearch ? (
              <span className="mt-2 block text-foreground">
                Recherche (debouncée) : « {debouncedSearch} »
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FilterInput
              value={search}
              onValueChange={setSearch}
              onDebouncedChange={setDebouncedSearch}
              placeholder="Rechercher…"
              aria-label="Recherche"
            />
            <FilterSelect
              value={sort}
              onValueChange={setSort}
              icon={ArrowUpDown}
              aria-label="Tri"
              placeholder="Trier par"
            >
              <SelectItem value="recent">Plus récent</SelectItem>
              <SelectItem value="oldest">Plus ancien</SelectItem>
            </FilterSelect>
            <FilterSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              icon={ListFilter}
              aria-label="Filtre démo"
              placeholder="Statut"
            >
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
            </FilterSelect>
          </div>
          <div className="mt-4 max-w-sm">
            <p className="text-muted-foreground mb-2 text-xs">Combobox</p>
            <Combobox
              options={demoComboboxOptions}
              value={combo}
              onValueChange={setCombo}
              aria-label="Exemple combobox"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Exemples de toasts
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                toast.success("Opération réussie !", {
                  description: "Vos modifications ont été enregistrées.",
                });
              }}
              variant="default"
            >
              Toast succès
            </Button>
            <Button
              onClick={() => {
                toast.error("Une erreur s'est produite", {
                  description: "Veuillez réessayer plus tard.",
                });
              }}
              variant="destructive"
            >
              Toast erreur
            </Button>
            <Button
              onClick={() => {
                toast.info("Information", {
                  description: "Voici une information importante.",
                });
              }}
              variant="outline"
            >
              Toast info
            </Button>
            <Button
              onClick={() => {
                toast.warning("Attention", {
                  description: "Cette action est irréversible.",
                });
              }}
              variant="outline"
            >
              Toast warning
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
