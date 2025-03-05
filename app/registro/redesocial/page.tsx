"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook, MessageSquare, Send, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";

interface InstagramAccount {
  id: string;
  igUsername: string;
  isMain: boolean;
}

export default function RedeSocialPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>("instagram");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<InstagramAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // URL de autorização do Instagram
  const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
    process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || `${window.location.origin}/registro/redesocial/callback`
  )}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish`;

  // Carregar contas conectadas
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!session?.user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch('/api/auth/instagram/accounts');

        if (response.ok) {
          const data = await response.json();
          if (data.accounts && Array.isArray(data.accounts)) {
            setConnectedAccounts(data.accounts);
          }
        } else {
          console.error("Erro ao buscar contas conectadas");
          toast({
            variant: "destructive",
            title: "Erro ao carregar contas",
            description: "Não foi possível carregar suas contas conectadas. Tente novamente mais tarde.",
          });
        }
      } catch (error) {
        console.error("Erro ao buscar contas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [session, toast]);

  // Função para conectar ao Instagram
  const handleInstagramConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      // Redirecionar para a URL de autenticação do Instagram
      window.location.href = instagramAuthUrl;
    } catch (error) {
      console.error("Erro ao conectar com Instagram:", error);
      setConnectionError("Ocorreu um erro ao tentar conectar com o Instagram. Tente novamente mais tarde.");
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Não foi possível conectar ao Instagram. Tente novamente mais tarde.",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Função para desconectar uma conta do Instagram
  const handleDisconnectAccount = async (accountId: string) => {
    try {
      const response = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        // Remover a conta da lista local
        setConnectedAccounts(prevAccounts =>
          prevAccounts.filter(account => account.id !== accountId)
        );

        toast({
          title: "Conta desconectada",
          description: "A conta do Instagram foi desconectada com sucesso.",
        });
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Erro ao desconectar",
          description: data.error || "Não foi possível desconectar a conta. Tente novamente.",
        });
      }
    } catch (error) {
      console.error("Erro ao desconectar conta:", error);
      toast({
        variant: "destructive",
        title: "Erro ao desconectar",
        description: "Ocorreu um erro ao tentar desconectar a conta. Tente novamente.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Conecte suas redes sociais</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Conecte suas contas de redes sociais para automatizar interações, responder mensagens e gerenciar seu conteúdo de forma eficiente.
        </p>
      </div>

      {/* Contas conectadas */}
      {connectedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contas conectadas</CardTitle>
            <CardDescription>
              Gerencie suas contas do Instagram conectadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <Instagram className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">@{account.igUsername}</p>
                        {account.isMain && (
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            Principal
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {account.isMain
                          ? "Conta principal usada para autenticação"
                          : "Conta secundária conectada"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                    onClick={() => handleDisconnectAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-primary/10">
        <CardHeader>
          <CardTitle>Adicionar nova conta</CardTitle>
          <CardDescription>
            Escolha a rede social que deseja conectar à sua conta Chatwit-Social
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Instagram - Disponível */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedPlatform === "instagram"
                  ? "border-pink-500 bg-pink-50 dark:bg-pink-950/20"
                  : "border-border hover:border-pink-300"
              }`}
              onClick={() => setSelectedPlatform("instagram")}
            >
              <div className="flex flex-col items-center text-center">
                <Instagram className="h-10 w-10 text-pink-500 mb-2" />
                <h3 className="font-medium">Instagram</h3>
                <p className="text-xs text-muted-foreground mt-1">Disponível</p>
              </div>
            </div>

            {/* Facebook - Em breve */}
            <div className="p-4 rounded-lg border-2 border-border opacity-70 cursor-not-allowed">
              <div className="flex flex-col items-center text-center">
                <Facebook className="h-10 w-10 text-blue-500 mb-2" />
                <h3 className="font-medium">Facebook</h3>
                <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full mt-1">Em breve</span>
              </div>
            </div>

            {/* WhatsApp - Em breve */}
            <div className="p-4 rounded-lg border-2 border-border opacity-70 cursor-not-allowed">
              <div className="flex flex-col items-center text-center">
                <MessageSquare className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="font-medium">WhatsApp</h3>
                <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full mt-1">Em breve</span>
              </div>
            </div>

            {/* TikTok - Em breve */}
            <div className="p-4 rounded-lg border-2 border-border opacity-70 cursor-not-allowed">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 flex items-center justify-center mb-2">
                  <Image src="/tiktok-icon.svg" alt="TikTok" width={32} height={32} />
                </div>
                <h3 className="font-medium">TikTok</h3>
                <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full mt-1">Em breve</span>
              </div>
            </div>

            {/* Telegram - Em breve */}
            <div className="p-4 rounded-lg border-2 border-border opacity-70 cursor-not-allowed">
              <div className="flex flex-col items-center text-center">
                <Send className="h-10 w-10 text-blue-400 mb-2" />
                <h3 className="font-medium">Telegram</h3>
                <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full mt-1">Em breve</span>
              </div>
            </div>

            {/* Messenger - Em breve */}
            <div className="p-4 rounded-lg border-2 border-border opacity-70 cursor-not-allowed">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 flex items-center justify-center mb-2">
                  <Image src="/messenger-icon.svg" alt="Messenger" width={32} height={32} />
                </div>
                <h3 className="font-medium">Messenger</h3>
                <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full mt-1">Em breve</span>
              </div>
            </div>
          </div>

          {connectionError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{connectionError}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-4">
          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={handleInstagramConnect}
            disabled={selectedPlatform !== "instagram" || isConnecting}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isConnecting ? "Conectando..." : connectedAccounts.length > 0
              ? "Adicionar nova conta do Instagram"
              : "Conectar ao Instagram"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Ao conectar sua conta, você concorda com nossos{" "}
            <Link href="/termos" className="text-primary hover:underline">
              Termos de Serviço
            </Link>{" "}
            e{" "}
            <Link href="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </CardFooter>
      </Card>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Por que conectar suas redes sociais?</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3 mt-0.5">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Automatize respostas</p>
                <p className="text-sm text-muted-foreground">Responda automaticamente a mensagens e comentários com chatbots inteligentes.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3 mt-0.5">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Crie fluxos de conversação</p>
                <p className="text-sm text-muted-foreground">Desenvolva fluxos personalizados para guiar seus seguidores em conversas automatizadas.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3 mt-0.5">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Agende postagens</p>
                <p className="text-sm text-muted-foreground">Programe suas publicações para serem postadas automaticamente nos melhores horários.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3 mt-0.5">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Analise métricas de engajamento</p>
                <p className="text-sm text-muted-foreground">Acompanhe o desempenho das suas interações e otimize sua estratégia.</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <Image
            src="/social-connection.svg"
            alt="Conecte suas redes sociais"
            width={350}
            height={350}
            className="max-w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}