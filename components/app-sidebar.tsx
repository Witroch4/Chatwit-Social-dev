"use client";

import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import LoginBadge from "@/components/auth/login-badge";
import {
  ChevronDown,
  CircleUser,
  User2,
  Instagram,
  Users,
  Zap,
  Calendar,
  MessageCircle,
  HelpCircle,
  Atom,
  Plus,
  Check,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface InstagramAccount {
  id: string;
  provider: string;
  name: string;
  providerAccountId: string;
  connected: boolean;
  isMain?: boolean;
}

export function AppSidebar() {
  const { data: session, status } = useSession();
  const { state } = useSidebar(); // Hook para saber se a sidebar está "collapsed" ou "open"
  const { toggleSidebar } = useSidebar();
  const [connectedAccounts, setConnectedAccounts] = useState<InstagramAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isLoading = status === "loading";

  // URL de autorização com enable_fb_login=0 e force_authentication=1
  const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
    process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!
  )}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish`;

  const isInstagramConnected = !!session?.user?.instagramAccessToken;
  const { theme } = useTheme();
  const instagramAnimationSrc =
    theme === "dark"
      ? "/animations/logodarckInstagram.lottie"
      : "/animations/logolightInstagram.lottie";

  // Efeito para detectar a conta ativa com base na URL
  useEffect(() => {
    if (pathname) {
      const match = pathname.match(/\/([^\/]+)\/dashboard/);
      if (match && match[1]) {
        // Agora estamos armazenando o providerAccountId como activeAccountId
        setActiveAccountId(match[1]);
      } else {
        setActiveAccountId(null);
      }
    }
  }, [pathname]);

  // Efeito para carregar contas conectadas
  useEffect(() => {
    if (session?.user?.id) {
      // Buscar todas as contas conectadas
      const fetchAccounts = async () => {
        try {
          const response = await fetch('/api/auth/instagram/accounts');

          if (response.ok) {
            const data = await response.json();
            if (data.accounts && Array.isArray(data.accounts)) {
              setConnectedAccounts(data.accounts.map((account: any) => ({
                id: account.id,
                provider: "instagram",
                name: account.igUsername || "Instagram",
                providerAccountId: account.providerAccountId,
                connected: true,
                isMain: account.isMain
              })));
            }
          } else {
            console.error("Erro ao buscar contas conectadas");
            // Se houver erro, mas tiver uma conta na sessão, mostrar pelo menos essa
            if (session?.user?.instagramAccessToken && session?.user?.providerAccountId) {
              setConnectedAccounts([
                {
                  id: session.user.providerAccountId,
                  provider: "instagram",
                  name: "Instagram Principal",
                  providerAccountId: session.user.providerAccountId,
                  connected: true,
                  isMain: true
                }
              ]);
            } else {
              // Não há contas conectadas
              setConnectedAccounts([]);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar contas do Instagram:", error);
          // Fallback para a conta na sessão
          if (session?.user?.instagramAccessToken && session?.user?.providerAccountId) {
            setConnectedAccounts([
              {
                id: session.user.providerAccountId,
                provider: "instagram",
                name: "Instagram Principal",
                providerAccountId: session.user.providerAccountId,
                connected: true,
                isMain: true
              }
            ]);
          } else {
            setConnectedAccounts([]);
          }
        }
      };

      fetchAccounts();
    }
  }, [session]);

  // Função para navegar para o dashboard de uma conta específica
  function navigateToAccount(accountId: string, providerAccountId: string) {
    router.push(`/${providerAccountId}/dashboard`);
  }

  // Função para desconectar uma conta específica do Instagram
  async function handleDisconnectAccount(accountId: string, providerAccountId: string) {
    try {
      const res = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: providerAccountId }),
      });

      if (res.ok) {
        // Atualizar a lista de contas conectadas
        setConnectedAccounts(prevAccounts =>
          prevAccounts.filter(account => account.providerAccountId !== providerAccountId)
        );

        // Se a conta desconectada for a ativa, redirecionar para o dashboard principal
        if (activeAccountId === providerAccountId) {
          router.push('/dashboard');
        }
      } else {
        const errorData = await res.json();
        console.error("Falha ao desconectar conta:", errorData);
        alert("Falha ao desconectar conta. Tente novamente mais tarde.");
      }
    } catch (error) {
      console.error("Erro ao desconectar conta:", error);
      alert("Ocorreu um erro ao tentar desconectar a conta.");
    }
  }

  // Função para desconectar o Instagram (mantida para compatibilidade)
  async function handleInstagramLogout() {
    try {
      const res = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Sem especificar accountId, a API desconectará a conta principal
      });

      if (res.ok) {
        // Recarrega a página para atualizar o estado da sessão
        window.location.reload();
      } else {
        const errorData = await res.json();
        console.error("Falha ao desconectar do Instagram:", errorData);
        alert("Falha ao desconectar do Instagram.");
      }
    } catch (error) {
      console.error("Erro ao desconectar do Instagram:", error);
      alert("Ocorreu um erro ao tentar desconectar do Instagram.");
    }
  }

  // Carregamento Inicial
  if (isLoading) {
    return (
      <Sidebar collapsible="icon" side="left" variant="sidebar">
        <SidebarContent>
          {/* Placeholder de carregamento */}
          <div className="p-4 space-y-6">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="p-4">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  // Encontrar a conta ativa
  const activeAccount = connectedAccounts.find(account => account.id === activeAccountId);

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarContent>
        {/* Seletor de Contas */}
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center justify-between p-2 bg-accent/50 rounded-md hover:bg-accent transition-colors">
                <div className="flex items-center gap-2">
                  {activeAccount ? (
                    <>
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {activeAccount.name && activeAccount.name.startsWith('@')
                          ? activeAccount.name.substring(1, 2).toUpperCase()
                          : 'I'}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium truncate max-w-[150px]">
                          {activeAccount.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {activeAccount.isMain ? 'Conta Principal' : 'Conta Conectada'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        <User2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">Dashboard Principal</span>
                        <span className="text-xs text-muted-foreground">
                          {connectedAccounts.length} conta(s) conectada(s)
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[250px]">
              {/* Link para o dashboard principal */}
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => router.push('/dashboard')}
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  <User2 className="h-3 w-3" />
                </div>
                <span>Dashboard Principal</span>
                {!activeAccountId && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>

              {connectedAccounts.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    Contas Conectadas
                  </div>

                  {connectedAccounts.map((account) => (
                    <DropdownMenuItem
                      key={account.id}
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => navigateToAccount(account.id, account.providerAccountId)}
                    >
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {account.name && account.name.startsWith('@')
                          ? account.name.substring(1, 2).toUpperCase()
                          : 'I'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm">{account.name}</span>
                        {account.isMain && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            Principal
                          </Badge>
                        )}
                      </div>
                      {activeAccountId === account.providerAccountId && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-primary"
                onClick={() => router.push('/registro/redesocial')}
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar nova conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Grupo Social Login */}
        <Collapsible defaultOpen={false} className="group/collapsible">
          <SidebarGroup>
            <div
              className={`flex items-center justify-center p-2 relative ${
                state === "collapsed" ? "flex-col space-y-1" : "flex-row"
              }`}
            >
              <CollapsibleTrigger className="flex items-center justify-center cursor-pointer">
                <Image
                  src="/W.svg"
                  alt="Logo Social Login"
                  width={state === "collapsed" ? 30 : 20}
                  height={state === "collapsed" ? 30 : 20}
                  className={`transition-all duration-300 ${
                    state === "collapsed" ? "mx-auto" : "mr-2"
                  }`}
                />
                {/* MOSTRA o texto "Social Login" apenas se a sidebar NÃO estiver colapsada */}
                {state !== "collapsed" && (
                  <span className="ml-2">Social Login</span>
                )}
                {/* MOSTRA a animação do Instagram apenas se conectado e NÃO estiver colapsada */}
                {isInstagramConnected && state !== "collapsed" && (
                  <DotLottieReact
                    src={instagramAnimationSrc}
                    autoplay
                    loop={false}
                    style={{
                      width: "16px",
                      height: "16px",
                      marginLeft: "0.5rem",
                    }}
                    aria-label="Instagram conectado"
                  />
                )}
                {/* Ícone de Chevron para indicar colapso/expansão */}
                <ChevronDown
                  className={`ml-auto transition-transform duration-300 ${
                    state === "collapsed" ? "hidden" : "inline-block"
                  } group-data-[state=open]/collapsible:rotate-180`}
                />
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <SidebarGroupContent>
                <div className="p-4">
                  {/* Lista de contas conectadas */}
                  {connectedAccounts.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Contas conectadas</h3>
                        <Link href="/registro/redesocial" className="text-xs text-primary hover:underline">
                          Gerenciar
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {connectedAccounts.map((account) => (
                          <div
                            key={account.id}
                            className={`flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer ${
                              activeAccountId === account.providerAccountId ? 'bg-accent' : 'bg-accent/50'
                            }`}
                            onClick={() => navigateToAccount(account.id, account.providerAccountId)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                {account.name && account.name.startsWith('@')
                                  ? account.name.substring(1, 2).toUpperCase()
                                  : 'I'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm truncate max-w-[120px]">{account.name}</span>
                                {account.isMain && (
                                  <Badge variant="outline" className="text-[10px] py-0 h-4">
                                    Principal
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDisconnectAccount(account.id, account.providerAccountId);
                              }}
                              className="text-xs text-red-500 hover:text-red-600"
                              aria-label="Desconectar conta"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão para adicionar nova conta */}
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/registro/redesocial"
                          className="flex items-center gap-2 text-primary"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Adicionar nova conta</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>

                  {/* Se não está conectado, mostra botão de login do Instagram */}
                  {!isInstagramConnected && (
                    <>
                      <p className="text-lg font-bold mb-2 mt-4">
                        Para continuar, faça login com sua rede social e
                        autorize o acesso.
                      </p>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <a
                              href={instagramAuthUrl}
                              className="flex items-center gap-2"
                            >
                              <Instagram
                                className={`mr-2 ${
                                  isInstagramConnected
                                    ? "text-pink-500"
                                    : "text-current"
                                }`}
                              />
                              <span>Login com Instagram</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </>
                  )}

                  {/* Se já está conectado ao Instagram, mostra a animação */}
                  {isInstagramConnected && (
                    <div className="mt-4 flex flex-col items-center">
                      <DotLottieReact
                        src={instagramAnimationSrc}
                        autoplay
                        style={{ width: "60px", height: "60px" }}
                      />
                      <p className="text-center mt-2">
                        Instagram conectado e pronto para chamadas API.
                      </p>
                    </div>
                  )}
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Grupo: Admin (visível somente para usuários ADMIN) */}
        {session?.user?.role === "ADMIN" && (
          <Collapsible defaultOpen={false} className="group/collapsible">
            <SidebarGroup>
              <div
                className={`flex items-center justify-center p-2 relative ${
                  state === "collapsed" ? "flex-col space-y-1" : "flex-row"
                }`}
              >
                <CollapsibleTrigger className="flex items-center justify-center cursor-pointer">
                  {/* Ícone para o grupo Admin */}
                  <HelpCircle
                    className={`transition-all duration-300 ${
                      state === "collapsed" ? "mx-auto" : "mr-2"
                    }`}
                  />
                  {/* Texto "Admin" apenas se a sidebar NÃO estiver colapsada */}
                  {state !== "collapsed" && (
                    <span className="ml-2 font-bold">Admin</span>
                  )}
                  {/* Chevron para colapso/expansão */}
                  <ChevronDown
                    className={`ml-auto transition-transform duration-300 ${
                      state === "collapsed" ? "hidden" : "inline-block"
                    } group-data-[state=open]/collapsible:rotate-180`}
                  />
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* /admin/queues */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/admin/queue"
                          className={`flex items-center ${
                            state === "collapsed"
                              ? "justify-start pl-4"
                              : "justify-start pl-2"
                          }`}
                        >
                          <Calendar className="mr-2" />
                          {state !== "collapsed" && <span>Admin Queue</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* /dashboard/calendario */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/dashboard/calendario"
                          className={`flex items-center ${
                            state === "collapsed"
                              ? "justify-start pl-4"
                              : "justify-start pl-2"
                          }`}
                        >
                          <Users className="mr-2" />
                          {state !== "collapsed" && <span>Admin User</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* /api/auth/get-token */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/api/auth/get-token"
                          className={`flex items-center ${
                            state === "collapsed"
                              ? "justify-start pl-4"
                              : "justify-start pl-2"
                          }`}
                        >
                          <MessageCircle className="mr-2" />
                          {state !== "collapsed" && (
                            <span>API Auth Get Token</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* /auth/users */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/auth/users"
                          className={`flex items-center ${
                            state === "collapsed"
                              ? "justify-start pl-4"
                              : "justify-start pl-2"
                          }`}
                        >
                          <User2 className="mr-2" />
                          {state !== "collapsed" && <span>Auth Users</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Contatos */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/contatos"
                    className={`flex items-center ${
                      state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"
                    }`}
                  >
                    <Users className="mr-2" />
                    {state !== "collapsed" && <span>Contatos</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agendamento */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href={activeAccountId ? `/${activeAccountId}/dashboard/agendamento` : "/dashboard/agendamento"}
                    className={`flex items-center ${
                      state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"
                    }`}
                  >
                    <Zap className="mr-2" />
                    {state !== "collapsed" && <span>Agendamento de Postagens</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Calendário */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href={activeAccountId ? `/${activeAccountId}/dashboard/calendario` : "/dashboard/calendario"}
                    className={`flex items-center ${
                      state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"
                    }`}
                  >
                    <Calendar className="mr-2" />
                    {state !== "collapsed" && <span>Calendários</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Automação */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href={activeAccountId ? `/${activeAccountId}/dashboard/automacao` : "/dashboard/automacao"}
                    className={`flex items-center ${
                      state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"
                    }`}
                  >
                    <Atom className="mr-2" />
                    {state !== "collapsed" && <span>Automação</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat ao Vivo */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="chatwit"
                    className={`flex items-center ${
                      state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"
                    }`}
                  >
                    <MessageCircle className="mr-2" />
                    {state !== "collapsed" && <span>Chat ao Vivos</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Ajuda (Docs) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/docs"
                    className={`flex items-center ${
                      state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"
                    }`}
                  >
                    <HelpCircle className="mr-2" />
                    {state !== "collapsed" && <span>Ajuda (Docs)</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center w-full px-2 py-1 hover:bg-accent rounded ${
                  session?.user && state === "collapsed"
                    ? "justify-center"
                    : "justify-start pl-2"
                }`}
              >
                {session?.user?.image ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={session.user.image} />
                    <AvatarFallback>
                      <CircleUser className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <User2 className="h-6 w-6" />
                )}
                {/* Ocultar o nome do usuário se a sidebar estiver colapsada */}
                {state !== "collapsed" && (
                  <span className="ml-2">
                    {session?.user?.name ?? "Minha Conta"}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="w-[--radix-popper-anchor-width]"
            >
              <LoginBadge user={session?.user} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
