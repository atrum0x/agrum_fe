import * as React from "react"
import { ChevronRight, File, Folder } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Link, useLocation, useNavigate } from "react-router-dom";

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import logo from "@/assets/logo.png"
import { useAuth } from "@/context/AuthContext";
import { filterNav, navData, type NavItem } from "@/components/nav-data";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();

  // 👇 1. Call useAuth INSIDE the component body (fixes the hook error)
  const { user, can } = useAuth();

  // 👇 2. Map user data inside with fallbacks to satisfy NavUser's required strings
  const sidebarUserData = {
    name: user?.username ?? "",
    email: user?.email ?? "",
    avatar: "/avatars/shadcn.jpg",
  };
  
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader onClick={() => navigate("/landing")}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="#" />}>
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg">
                <img src={logo} alt="Agrum" className="size-full object-contain" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Agrum</span>
                <span className="truncate text-xs">Admin Panel</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {filterNav(navData, can).map((item, index) => (
            <Tree key={index} item={item} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUserData} />
      </SidebarFooter>
    </Sidebar>
  )
}

function Tree({ item }: { item: NavItem }) {
  const location = useLocation();

  if (!item.items?.length) {
    const isActive = location.pathname === item.url;
    
    return (
      <SidebarMenuButton 
          isActive={isActive} 
          className="data-[active=true]:bg-transparent"
          render={<Link to={item.url || "#"} />}
        >
        <File/>{item.title}
      </SidebarMenuButton>
    )
  }
  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={true} // Or logic based on active child route
      >
        <CollapsibleTrigger render={<SidebarMenuButton />}>
          <ChevronRight className="transition-transform" />
          <Folder />
          <span>{item.title}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem, index) => (
              <Tree key={index} item={subItem} /> // Recursion!
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}