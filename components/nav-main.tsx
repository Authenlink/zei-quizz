"use client";

import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type NavMainItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: { title: string; url: string }[];
};

function pathMatches(pathname: string, url: string) {
  const path = pathname.split("?")[0] ?? pathname;
  if (url === "/") return path === "/";
  return path === url || path.startsWith(`${url}/`);
}

function branchActive(pathname: string, item: NavMainItem) {
  if (pathMatches(pathname, item.url)) return true;
  return item.items?.some((sub) => pathMatches(pathname, sub.url)) ?? false;
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const pathname = usePathname() ?? "";
  const { isMobile, setOpenMobile, setOpen, state } = useSidebar();

  const handleNavClick = React.useCallback(() => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  }, [isMobile, setOpenMobile, setOpen]);

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const item of items) {
        if (item.items?.length) init[item.title] = branchActive(pathname, item);
      }
      return init;
    }
  );

  React.useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (item.items?.length && branchActive(pathname, item)) {
          next[item.title] = true;
        }
      }
      return next;
    });
  }, [pathname, items]);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          if (!item.items || item.items.length === 0) {
            const active = pathMatches(pathname, item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={active}
                >
                  <Link href={item.url} onClick={handleNavClick}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          const isOpen = openSections[item.title] ?? false;

          return (
            <Collapsible
              key={item.title}
              open={isOpen}
              onOpenChange={(open) => {
                if (open && state === "collapsed") setOpen(true);
                setOpenSections((s) => ({ ...s, [item.title]: open }));
              }}
              asChild
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={branchActive(pathname, item)}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathMatches(pathname, subItem.url)}
                        >
                          <Link
                            href={subItem.url}
                            onClick={handleNavClick}
                          >
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
