"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useScroll } from "@/hooks/use-scroll";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasScrolled = useScroll();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Skeleton pendant le chargement de la session
  if (status === "loading") {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Header skeleton */}
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

          {/* Contenu skeleton */}
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
            {/* Titre */}
            <div className="mb-2">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Cards skeleton (grille de 3) */}
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="aspect-video rounded-xl" />
            </div>

            {/* Contenu principal skeleton */}
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header sticky avec trigger sidebar + breadcrumbs */}
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

        {/* Contenu de la page */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold">
              Bienvenue, {session.user.name} !
            </h1>
            <p className="text-muted-foreground">
              Voici votre tableau de bord.
            </p>
          </div>

          {/* Exemples de toasts - à retirer en production */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
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
      </SidebarInset>
    </SidebarProvider>
  );
}
