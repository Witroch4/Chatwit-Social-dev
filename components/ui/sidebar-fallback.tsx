'use client';

import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Home, Settings, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SidebarFallback() {
  const { open } = useSidebar();
  const router = useRouter();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push('/')}>
              <Home size={20} />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push('/user/settings')}>
              <Settings size={20} />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleRefresh}>
              <RefreshCcw size={20} />
              <span>Recarregar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="text-xs text-muted-foreground p-2">
          {open ? 'Modo de recuperação' : ''}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}