"use client";

import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function SidebarSkeleton() {
  return (
    <Sidebar className="border-r border-border">
      <SidebarContent className="p-2">
        <div className="p-4">
          <Skeleton className="h-8 w-8 rounded-full mb-4" />
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <SidebarMenu>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="p-4">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}