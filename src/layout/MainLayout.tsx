// src/layout/DashboardLayout.tsx
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function MainLayout() {
  return (
    <div className="[--header-height:calc(var(--spacing)*14)] flex h-screen flex-col overflow-hidden bg-background">
      <SidebarProvider className="flex h-full flex-col overflow-hidden">
        <SiteHeader/>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex-1 min-h-0 overflow-hidden">
            <Outlet /> 
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}