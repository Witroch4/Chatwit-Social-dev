// app/[accountid]/dashboard/layout.tsx

import React from "react";
import { Metadata } from "next";
import DashboardLayoutClient from "@/components/dashboard-layout-client";

export const metadata: Metadata = {
  title: "Dashboard da Conta",
  description: "Gerencie suas redes sociais",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}