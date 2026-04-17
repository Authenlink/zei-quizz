"use client"

import { InternalSidebar } from "@/components/shell/internal-sidebar"
import { DashboardScrollArea } from "@/components/dashboard-scroll-area"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function InternalGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <InternalSidebar />
      <SidebarInset className="flex h-dvh flex-col overflow-hidden">
        <DashboardScrollArea>{children}</DashboardScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
