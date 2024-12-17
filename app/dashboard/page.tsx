"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DashboardHome() {
  const { data: session } = useSession();

  // Obter primeiro nome do usuário (caso exista nome completo)
  const userName = session?.user?.name?.split(" ")[0] ?? "Usuário";

  return (
    <div className="space-y-8">
      {/* Seção Inicial */}
      <section className="pt-6">
        <h1 className="text-3xl font-bold mb-2">Olá, {userName}</h1>
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100 px-2 py-0.5 rounded-md text-sm font-semibold">
            [IA]
          </span>
          <p className="text-lg">
            Deixe a IA cuidar da agitação do feriado. A IA trabalha, você comemora!
          </p>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Desconto de <strong>20% no valor</strong>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">
          A IA ideal para otimizar e minimizar tarefas repetitivas
        </h2>
        {/* Cards (3 lado a lado) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Use IA para automatizar interações"
            description="Reduza tarefas manuais repetitivas e aumente a produtividade."
          />
          <Card
            title="Converter interações em leads quentes com IA"
            description="Identifique rapidamente oportunidades de negócio."
          />
          <Card
            title="Converter interações em leads quentes com IA"
            description="Segmentação inteligente e automática para potenciais clientes."
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Comece aqui</h2>
        {/* Próxima linha de cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Enviar links automaticamente por DM a partir dos comentários"
            description="Envie um link sempre que alguém comentar em uma publicação ou reel."
            tag="Quick Automation"
            popular
          />
          <Card
            title="Conheça nossos modelos"
            description="Templates prontos para interações de DM automáticas."
            tag="Quick Automation"
          />
          <Card
            title="Gere leads dos stories"
            description="Use ofertas por tempo limitado nos Stories para converter leads."
            tag="Flow Builder"
          />
        </div>
      </section>

      {/* Seção final de exemplos */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Use IA para automatizar interações"
            description="Colete informações dos seus seguidores ou defina respostas automáticas."
            tag="Flow Builder"
            ia
          />
        </div>
      </section>
    </div>
  );
}

// Componente Card simples (exemplo)
type CardProps = {
  title: string;
  description: string;
  tag?: string;      // Ex.: 'Quick Automation', 'Flow Builder'
  popular?: boolean; // Se for 'POPULAR'
  ia?: boolean;      // Se tiver tag [IA]
};

function Card({ title, description, tag, popular, ia }: CardProps) {
  return (
    <Link href="#" /* TODO: Ajustar link real no futuro */>
      <div
        className={`
          border border-transparent p-4 rounded-lg shadow-sm
          bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-100
          transition-colors duration-300
          hover:border-blue-500
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {ia && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-100 py-0.5 px-2 rounded-md">
              [IA]
            </span>
          )}
        </div>

        <p className="text-sm mb-3">{description}</p>

        <div className="flex items-center gap-2">
          {tag && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-100 py-0.5 px-2 rounded-md">
              {tag}
            </span>
          )}
          {popular && (
            <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-100 py-0.5 px-2 rounded-md">
              POPULAR
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
