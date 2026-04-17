"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { PlusCircle, ClipboardList, ArrowRight } from "lucide-react";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { Button } from "@/components/ui/button";
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
import { getAccountContextLabel } from "@/lib/account-context";

export default function PortalHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

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
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  if (!session) return null;

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
              <BreadcrumbItem>
                <BreadcrumbPage>Accueil</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold">
            Bienvenue, {session.user.name} !
          </h1>
          <p className="text-muted-foreground">
            <span className="text-foreground/80">
              {getAccountContextLabel(session.user)}
            </span>
            {" — "}
            Voici votre espace partenaire.
          </p>
        </div>

        {/* Raccourcis rapides */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <PlusCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Soumettre un lead</h3>
                <p className="text-sm text-muted-foreground">
                  Partagez une nouvelle opportunité
                </p>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href="/portal/leads/new">
                Nouveau lead
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Mes soumissions</h3>
                <p className="text-sm text-muted-foreground">
                  Suivez vos leads en cours
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/leads">
                Voir mes leads
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Zone de stats à venir */}
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Les statistiques de vos performances apparaîtront ici.
          </p>
        </div>
      </div>
    </>
  );
}
