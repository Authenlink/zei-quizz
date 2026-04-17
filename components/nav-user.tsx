"use client";

import { signOut } from "next-auth/react";
import {
  ChevronsUpDown,
  Circle,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser({
  user,
  backgroundGradient,
  contextSubtitle,
  hideEmail = false,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  /** Ligne sous le nom : ex. nom du workspace ou « Compte personnel » */
  contextSubtitle?: string | null;
  backgroundGradient?: {
    color1: string;
    color2: string;
    css: string;
  } | null;
  /** Masquer l’adresse e-mail dans le footer et le menu (nom + sous-titre restent visibles) */
  hideEmail?: boolean;
}) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback
                  className="rounded-lg text-white font-semibold"
                  style={
                    backgroundGradient
                      ? { background: backgroundGradient.css }
                      : undefined
                  }
                >
                  {getInitials(user.name || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name || "User"}
                </span>
                {contextSubtitle ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {contextSubtitle}
                  </span>
                ) : null}
                {!hideEmail ? (
                  <span className="truncate text-xs">{user.email}</span>
                ) : null}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* En-tete avec avatar */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback
                    className="rounded-lg text-white font-semibold"
                    style={
                      backgroundGradient
                        ? { background: backgroundGradient.css }
                        : undefined
                    }
                  >
                    {getInitials(user.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || "User"}
                  </span>
                  {contextSubtitle ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {contextSubtitle}
                    </span>
                  ) : null}
                  {!hideEmail ? (
                    <span className="truncate text-xs">{user.email}</span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Theme switcher */}
            <DropdownMenuGroup>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="white">
                  <Sun className="h-4 w-4 mr-2" />
                  White
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">
                  <Circle className="h-4 w-4 mr-2" />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Liens */}
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => (window.location.href = "/profile")}
              >
                <User />
                Profil
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Deconnexion */}
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
