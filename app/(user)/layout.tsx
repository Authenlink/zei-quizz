"use client"

import * as React from "react"
import { PortalSidebar } from "@/components/shell/portal-sidebar"
import { TocProvider } from "@/lib/toc-context"
import { DashboardScrollArea } from "@/components/dashboard-scroll-area"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function PortalGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TocProvider>
      <SidebarProvider>
        <PortalSidebar />
        <SidebarInset className="flex h-dvh flex-col overflow-hidden">
          <DashboardScrollArea>{children}</DashboardScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </TocProvider>
  )
}
