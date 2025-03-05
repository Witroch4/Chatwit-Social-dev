import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import ConditionalSidebar from "@/components/conditional-sidebar";
import { AppHeader } from "@/components/app-header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Gerencie suas contas e automações",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="h-full">
        <div className="h-[80px] md:pl-56 fixed inset-y-0 w-full z-50">
          <AppHeader />
        </div>
        <div className="hidden md:flex h-full w-56 flex-col fixed inset-y-0 z-50">
          <ConditionalSidebar />
        </div>
        <main className="md:pl-56 pt-[80px] h-full">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}