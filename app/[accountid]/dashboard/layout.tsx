// app/dashboard/layout.tsx
"use client";

import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SidebarProvider } from "@/components/ui/sidebar";
import ConditionalSidebar from "@/components/conditional-sidebar";
import { AppHeader } from "@/components/app-header";

// Função para validar a conta do Instagram
async function validateAccount(userId: string, accountId: string) {
  try {
    // Verificar se o ID da conta existe e pertence ao usuário
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: userId,
        provider: "instagram",
      },
    });

    return !!account; // Retorna true se a conta existir e pertencer ao usuário
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
  params: { accountid: string };
}) {
  // Usar auth() diretamente
  const session = await auth();

  // Se o usuário não estiver autenticado, redirecionar para login
  if (!session || !session.user) {
    redirect("/auth/login");
  }

  // Verificar se o accountid é um ID válido de conta do Instagram do usuário
  const accountId = params.accountid;
  const userId = session.user.id;

  // Validar a conta
  const isValidAccount = await validateAccount(userId, accountId);

  // Se a conta não existir ou não pertencer ao usuário, redirecionar para o dashboard
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
        <main className="md:pl-56 pt-[80px] h-full">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
