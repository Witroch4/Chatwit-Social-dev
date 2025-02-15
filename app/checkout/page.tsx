// app/checkout/page.tsx
"use client";

import React, { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

// Inicializa o Stripe com a chave publicável
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Enquanto o session estiver carregando, mostramos uma mensagem simples
  if (status === "loading") {
    return <p>Carregando...</p>;
  }

  // Se não houver sessão, redireciona ou exibe mensagem
  if (!session) {
    return <p>Você precisa estar autenticado para acessar o checkout.</p>;
  }

  // Usa o user.id se existir, senão utiliza o user.email
  const userId = session.user.id || session.user.email;

  // Função para buscar o clientSecret da Checkout Session via API
  const fetchClientSecret = useCallback(() => {
    return fetch("/api/checkout-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Falha ao obter o clientSecret");
        }
        return res.json();
      })
      .then((data) => data.clientSecret);
  }, [userId]);

  const checkoutOptions = { fetchClientSecret };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center mb-6">
          Checkout - Assinatura Mensal
        </h1>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={checkoutOptions}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
