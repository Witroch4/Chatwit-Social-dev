// app/[accountid]/dashboard/page.tsx
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Componente auxiliar: Card
type CardProps = {
  title: string;
  description: string;
  tag?: string;
  popular?: boolean;
  ia?: boolean;
};

function Card({ title, description, tag, popular, ia }: CardProps) {
  return (
    <Link href="#">
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

// Configuração do Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const metadata: Metadata = {
  title: "Dashboard da Conta",
  description: "Gerencie sua conta do Instagram",
};

async function getAccountInfo(accountId: string) {
  try {
    const account = await prisma.account.findUnique({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        providerAccountId: true,
        igUsername: true,
        isMain: true,
      },
    });

    return account;
  } catch (error) {
    console.error("Erro ao buscar informações da conta:", error);
    return null;
  }
}

export default async function AccountDashboardPage({
  params,
}: {
  params: { accountid: string };
}) {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const accountId = params.accountid;
  const account = await getAccountInfo(accountId);

  if (!account) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard da Conta</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações da Conta</h2>
        <div className="space-y-2">
          <p><span className="font-medium">Nome de usuário:</span> {account.igUsername || "Instagram"}</p>
          <p><span className="font-medium">ID da conta:</span> {account.id}</p>
          <p><span className="font-medium">Conta principal:</span> {account.isMain ? "Sim" : "Não"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Estatísticas</h3>
          <p className="text-gray-600 dark:text-gray-300">Estatísticas da sua conta do Instagram.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Automações</h3>
          <p className="text-gray-600 dark:text-gray-300">Gerencie suas automações.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Mensagens</h3>
          <p className="text-gray-600 dark:text-gray-300">Gerencie suas mensagens.</p>
        </div>
      </div>
    </div>
  );
}
