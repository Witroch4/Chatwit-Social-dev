"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";

export function SidebarSkeleton() {
  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar" className="bg-background z-50 border-r">
      <SidebarContent className="bg-background">
        <div className="p-4 space-y-6">
          {/* Logo ou área de cabeçalho */}
          <Skeleton className="h-[125px] w-full rounded-xl" />

          {/* Área de perfil */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          {/* Itens de menu */}
          <div className="space-y-6">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}