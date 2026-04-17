"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { useScrollContainer } from "@/hooks/use-scroll";

interface StickyHeaderProps {
  children: React.ReactNode;
  right?: React.ReactNode;
  /** Si défini (ex. zone messages du chat), la bordure au scroll suit ce conteneur au lieu du scroll dashboard. */
  scrollContainerRef?: React.RefObject<HTMLElement | null> | null;
}

export function StickyHeader({
  children,
  right,
  scrollContainerRef,
}: StickyHeaderProps) {
  const dashboardScrollRef = useDashboardScrollRef();
  const scrollRef = scrollContainerRef ?? dashboardScrollRef;
  const hasScrolled = useScrollContainer(scrollRef);

  return (
    <header
      className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 pt-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
        hasScrolled ? "border-b" : ""
      }`}
    >
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {children}
      </div>
      {right && <div className="pr-4">{right}</div>}
    </header>
  );
}
