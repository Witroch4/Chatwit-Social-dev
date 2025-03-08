import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
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
      <div className="flex h-full">
        <ConditionalSidebar />
        <div className="flex-1">

          <SidebarInset className="pt-[80px] p-4">
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}