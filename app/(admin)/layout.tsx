"use client"

import * as React from "react"
import { InternalSidebar } from "@/components/shell/internal-sidebar"
import { TocProvider } from "@/lib/toc-context"
import { DashboardScrollArea } from "@/components/dashboard-scroll-area"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function InternalGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TocProvider>
      <SidebarProvider>
        <InternalSidebar />
        <SidebarInset className="flex h-dvh flex-col overflow-hidden">
          <DashboardScrollArea>{children}</DashboardScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </TocProvider>
  )
}
