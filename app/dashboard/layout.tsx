// app/dashboard/layout.tsx

"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import ConditionalSidebar from "@/components/conditional-sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import Navbar from "@/components/navbar";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>
        <div className="flex h-full min-h-screen">
        <ConditionalSidebar /> {/* Sidebar condicional */}
        <Navbar />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  </SessionProvider>
  );
}
