import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SidebarProvider } from "@/components/ui/sidebar";
import ConditionalSidebar from "@/components/conditional-sidebar";
import { AppHeader } from "@/components/app-header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard da Conta",
  description: "Gerencie sua conta do Instagram",
};

async function validateAccount(userId: string, providerAccountId: string): Promise<boolean> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        providerAccountId,
        userId,
        provider: "instagram",
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        providerAccountId: true,
        access_token: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return !!account;
  } catch (error) {
    console.error("Erro ao validar conta:", error);
    return false;
  }
}

export default async function AccountIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: any; // Usando any para evitar conflito de tipos com Promise
}) {
  // Garante que params seja tratado como Promise
  const actualParams = await Promise.resolve(params);
  const { accountid } = actualParams;

  // Autenticação
  const session = await auth();
  if (!session || !session.user) {
    redirect("/auth/login");
  }

  // Validação da conta
  const isValidAccount = await validateAccount(session.user.id, accountid);
  if (!isValidAccount) {
    redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <div className="h-full">
        <div className="h-[80px] md:pl-56 fixed inset-y-0 w-full z-50">
          <AppHeader />
        </div>
        <div className="hidden md:flex h-full w-56 flex-col fixed inset-y-0 z-50">
          <ConditionalSidebar />
        </div>
        <main className="md:pl-56 pt-[80px] h-full">{children}</main>
      </div>
    </SidebarProvider>
  );
}
