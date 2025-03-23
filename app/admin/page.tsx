"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import NavbarAdmin from "@/components/admin/navbar-admin";
import Link from "next/link";

export default function AdminPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState("10");
  const [loading, setLoading] = useState({
    welcome: false,
    expiring: false
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Verificar se o usuário é administrador
    const checkAdmin = async () => {
      try {
        const response = await axios.get("/api/admin/check");
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error("Erro ao verificar permissões de administrador:", error);
        router.push("/");
      }
    };

    checkAdmin();
  }, [router]);

  const handleWelcomeNotification = async () => {
    if (!userId.trim()) {
      toast.error("Por favor, insira um ID de usuário válido");
      return;
    }

    try {
      setLoading(prev => ({ ...prev, welcome: true }));
      const response = await axios.post("/api/admin/register-welcome-notification", { userId });
      toast.success(response.data.message || "Notificação de boas-vindas registrada com sucesso");
    } catch (error: any) {
      console.error("Erro ao registrar notificação de boas-vindas:", error);
      toast.error(error.response?.data || "Erro ao registrar notificação de boas-vindas");
    } finally {
      setLoading(prev => ({ ...prev, welcome: false }));
    }
  };

  const handleCheckExpiringTokens = async () => {
    try {
      setLoading(prev => ({ ...prev, expiring: true }));
      const daysNum = parseInt(days);
      if (isNaN(daysNum) || daysNum <= 0) {
        toast.error("Por favor, insira um número válido de dias");
        return;
      }

      const response = await axios.post(`/api/admin/check-expiring-tokens?days=${daysNum}`);
      toast.success(response.data.message || "Verificação de tokens iniciada com sucesso");
    } catch (error: any) {
      console.error("Erro ao verificar tokens expirando:", error);
      toast.error(error.response?.data || "Erro ao verificar tokens expirando");
    } finally {
      setLoading(prev => ({ ...prev, expiring: false }));
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <NavbarAdmin />
        <div className="container mx-auto py-10">
          <h1 className="text-2xl font-bold mb-4">Verificando permissões...</h1>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavbarAdmin />
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Painel de Administração</h1>
        <p className="text-muted-foreground mb-8">
          Use este painel para testar funcionalidades administrativas do sistema.
        </p>

        <div className="flex flex-wrap gap-4 mb-8">
          <Button asChild variant="outline">
            <Link href="/admin/users">Gerenciar Usuários</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/notifications">Gerenciar Notificações</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/leads-chatwit">Gerenciar Leads Chatwit</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Notificação de Boas-vindas</CardTitle>
              <CardDescription>
                Envie manualmente uma notificação de boas-vindas para um usuário específico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="userId" className="text-sm font-medium">
                    ID do Usuário
                  </label>
                  <Input
                    id="userId"
                    placeholder="Digite o ID do usuário"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleWelcomeNotification}
                  disabled={loading.welcome}
                  className="w-full"
                >
                  {loading.welcome ? "Enviando..." : "Enviar Notificação"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verificar Tokens Expirando</CardTitle>
              <CardDescription>
                Inicie manualmente a verificação de tokens que estão prestes a expirar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="days" className="text-sm font-medium">
                    Dias para Expiração
                  </label>
                  <Input
                    id="days"
                    type="number"
                    placeholder="Número de dias"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    min="1"
                  />
                </div>
                <Button
                  onClick={handleCheckExpiringTokens}
                  disabled={loading.expiring}
                  className="w-full"
                >
                  {loading.expiring ? "Verificando..." : "Verificar Tokens"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}