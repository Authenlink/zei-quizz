"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, MessageSquare, User } from "lucide-react";
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
// ITEMS DE NAVIGATION — shell interne (équipe / back-office)
// À personnaliser selon ton projet
// ============================================================
const internalNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Assistant IA",
    url: "/agent",
    icon: MessageSquare,
  },
  {
    title: "Mon compte",
    url: "/profile",
    icon: User,
  },
];

export function InternalSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const [backgroundGradient, setBackgroundGradient] = useState<{
    color1: string;
    color2: string;
    css: string;
  } | null>(null);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  const accountContext = session?.user
    ? getAccountContextLabel(session.user)
    : "";

  useEffect(() => {
    const loadUserGradient = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.backgroundType === "gradient" && data.backgroundGradient) {
            setBackgroundGradient(data.backgroundGradient);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du gradient:", error);
      }
    };

    if (session?.user) {
      loadUserGradient();
    }
  }, [session]);

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
            {[...Array(5)].map((_, i) => (
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Mon App"
                    width={36}
                    height={36}
                    className="rounded-md"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Mon Application</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {accountContext || "Dashboard"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={internalNavItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={user}
          contextSubtitle={accountContext || undefined}
          backgroundGradient={backgroundGradient}
          hideEmail
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
