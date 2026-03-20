"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlusCircle, ClipboardList, ListFilter } from "lucide-react";
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
import { FilterInput } from "@/components/ui/filter-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScrollContainer } from "@/hooks/use-scroll";

// ============================================================
// TYPES — à déplacer dans features/leads/types.ts quand le
// domaine métier est réel
// ============================================================
type LeadStatus = "pending" | "in_review" | "accepted" | "rejected";

interface Lead {
  id: string;
  company: string;
  contact: string;
  status: LeadStatus;
  submittedAt: string;
}

const statusConfig: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending:   { label: "En attente",    variant: "secondary" },
  in_review: { label: "En cours",      variant: "default" },
  accepted:  { label: "Accepté",       variant: "default" },
  rejected:  { label: "Refusé",        variant: "destructive" },
};

// Données fictives — remplacer par un fetch réel
const MOCK_LEADS: Lead[] = [
  { id: "1", company: "Acme Corp",     contact: "Jean Dupont",   status: "pending",   submittedAt: "2026-03-18" },
  { id: "2", company: "Beta Solutions",contact: "Marie Martin",  status: "in_review", submittedAt: "2026-03-15" },
  { id: "3", company: "Gamma Tech",    contact: "Pierre Leroy",  status: "accepted",  submittedAt: "2026-03-10" },
];

export default function PortalLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Skeleton className="h-4 w-48" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Skeleton className="h-8 w-48" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </>
    );
  }

  if (!session) return null;

  const filteredLeads = MOCK_LEADS.filter((lead) => {
    const matchSearch =
      !debouncedSearch ||
      lead.company.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      lead.contact.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
                <BreadcrumbLink asChild>
                  <Link href="/portal">Accueil</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Mes leads</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        {/* Titre + CTA */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Mes leads</h1>
            <p className="text-muted-foreground">
              Suivez l&apos;avancement de vos soumissions.
            </p>
          </div>
          <Button asChild>
            <Link href="/portal/leads/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau lead
            </Link>
          </Button>
        </div>

        {/* Barre d'outils */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterInput
            value={search}
            onValueChange={setSearch}
            onDebouncedChange={setDebouncedSearch}
            placeholder="Rechercher une entreprise…"
            aria-label="Recherche"
          />
          <FilterSelect
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v)}
            icon={ListFilter}
            aria-label="Filtre statut"
            placeholder="Statut"
          >
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_review">En cours</SelectItem>
            <SelectItem value="accepted">Accepté</SelectItem>
            <SelectItem value="rejected">Refusé</SelectItem>
          </FilterSelect>
        </div>

        {/* Tableau */}
        {filteredLeads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aucun lead trouvé.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/leads/new">Soumettre un premier lead</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Soumis le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/portal/leads/${lead.id}`}
                        className="hover:underline"
                      >
                        {lead.company}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.contact}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[lead.status].variant}>
                        {statusConfig[lead.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {new Date(lead.submittedAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
