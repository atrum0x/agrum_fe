import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { LanguageMenuItems } from "@/components/language-switcher"
import { useAuth } from "@/context/AuthContext";
import { ChevronsUpDownIcon, LogOutIcon, SunIcon, MoonIcon, LaptopIcon } from "lucide-react"
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function NavUser({
  user
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {

  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  const { logout } = useAuth();
  const initials = user.name.slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    try {
      logout(); // 👈 3. Call it! It handles cache clearing and navigation automatically
    } catch (err) {
      console.error("Logout failed", err);
    }
  }

  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("theme") as "light" | "dark" | "system") || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");

    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (theme === "light") {
      localStorage.setItem("theme", "light");
    } else {
      // System mode: check OS preference
      localStorage.setItem("theme", "system");
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        root.classList.add("dark");
      }
    }
  }, [theme]);


  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-muted aria-expanded:text-foreground"
              />
            }
          >
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-sm">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-sm">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-sm text-muted-foreground px-2 py-1">{t("profile.appearance")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme("light")} className={`cursor-pointer ${theme === "light" ? "font-bold bg-muted" : ""}`}>
                <SunIcon />
                {t("profile.light")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className={`cursor-pointer ${theme === "dark" ? "font-bold bg-muted" : ""}`}>
                <MoonIcon />
                {t("profile.dark")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className={`cursor-pointer ${theme === "system" ? "font-bold bg-muted" : ""}`}>
                <LaptopIcon />
                {t("profile.system")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <LanguageMenuItems />
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
              onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive">
                <LogOutIcon
                />
                {t("profile.logOut")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
