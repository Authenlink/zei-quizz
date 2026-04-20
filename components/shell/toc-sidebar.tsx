"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useToc } from "@/lib/toc-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function TocSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { items, activeId } = useToc();

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="hidden lg:flex border-l"
      {...props}
    >
      <SidebarContent>
        {items.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Sur cette page</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeId === item.id}
                      className={cn(
                        "transition-colors",
                        item.level === 2 && "pl-4 text-sm",
                        item.level === 3 && "pl-6 text-xs",
                        activeId === item.id
                          ? "text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document
                            .getElementById(item.id)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        {item.title}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Aucune section sur cette page.
            </p>
          </div>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
