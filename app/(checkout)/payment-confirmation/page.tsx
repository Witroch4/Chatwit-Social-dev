// app/(checkout)/payment-confirmation/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PaymentConfirmationPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = searchParams.get("session_id");

    if (sessionId) {
      console.log("Buscando sessão com session_id:", sessionId);
      fetch(`/api/checkout-sessions?session_id=${sessionId}`, {
        method: "GET",
      })
        .then(async (res) => {
          // Tenta ler o corpo da resposta como texto
          const text = await res.text();
          // Log para debug
          console.log("Resposta bruta da API:", text);
          // Se houver texto, tenta converter para JSON; caso contrário, retorna um objeto vazio
          return text ? JSON.parse(text) : {};
        })
        .then((data) => {
          console.log("Dados recebidos da API:", data);
          setStatus(data.status);
          setCustomerEmail(data.customer_email);
        })
        .catch((err) => {
          console.error("Erro ao buscar dados da sessão:", err);
        });
    }
  }, []);

  // Se o status for "open", redireciona para o Dashboard
  useEffect(() => {
    if (status === "open") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "complete") {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Assinatura Confirmada!</h1>
        <p>
          Obrigado por se juntar à comunidade ChatWit, que mais cresce no Brasil.
        </p>
        <p>
          Um email de confirmação foi enviado para{" "}
          <span className="font-medium">{customerEmail}</span>.
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Ir para o Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p>Carregando...</p>
    </div>
  );
}
