// app/dashboard/layout.tsx
"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import ConditionalSidebar from "@/components/conditional-sidebar";
import Navbar from "@/components/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-full min-h-screen">
        <ConditionalSidebar />
        <Navbar />
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
