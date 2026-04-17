"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  ClipboardList,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { getAccountContextLabel } from "@/lib/account-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// ============================================================
// ITEMS DE NAVIGATION PORTAIL — à personnaliser selon ton projet
// L'espace portail est destiné aux utilisateurs "externes"
// (partenaires, apporteurs d'affaires, etc.)
// ============================================================
const portalNavItems = [
  {
    title: "Accueil",
    url: "/portal",
    icon: LayoutDashboard,
  },
  {
    title: "Assistant IA",
    url: "/agent",
    icon: MessageSquare,
  },
  {
    title: "Soumettre un lead",
    url: "/portal/leads/new",
    icon: PlusCircle,
  },
  {
    title: "Mes soumissions",
    url: "/portal/leads",
    icon: ClipboardList,
  },
  {
    title: "Mon compte",
    url: "/portal/profile",
    icon: User,
  },
  // Ajouter d'autres items ici, exemple :
  // {
  //   title: "Ressources",
  //   url: "/portal/resources",
  //   icon: BookOpen,
  // },
];

export function PortalSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();

  const user = {
    name: session?.user?.name || "Partenaire",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  const accountContext = session?.user
    ? getAccountContextLabel(session.user)
    : "";

  if (status === "loading") {
    return (
      <Sidebar {...props}>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-2 p-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header : Logo + Nom de l'espace partenaire */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/portal">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Espace Partenaire"
                    width={36}
                    height={36}
                    className="rounded-md"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Mon Application</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {accountContext
                      ? `${accountContext} · Partenaire`
                      : "Espace Partenaire"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Contenu : Navigation portail */}
      <SidebarContent>
        <NavMain items={portalNavItems} />
      </SidebarContent>

      {/* Footer : Menu utilisateur */}
      <SidebarFooter>
        <NavUser
          user={user}
          contextSubtitle={accountContext || undefined}
          hideEmail
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
