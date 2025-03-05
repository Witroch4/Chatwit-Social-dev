import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  // Se o usuário não estiver autenticado, redirecionar para login
  if (!session || !session.user) {
    redirect("/auth/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Bem-vindo ao Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Esta é a página principal do dashboard. Selecione uma conta do Instagram para gerenciar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Contas do Instagram</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie suas contas do Instagram conectadas.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Estatísticas</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Visualize estatísticas das suas contas.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Configurações</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Configure suas preferências e opções.
          </p>
        </div>
      </div>
    </div>
  );
}