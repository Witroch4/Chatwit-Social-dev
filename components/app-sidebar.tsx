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
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTheme } from "next-themes";
import Image from "next/image";

export function AppSidebar() {
  const { data: session, status } = useSession();
  const { state } = useSidebar(); // Hook para saber se a sidebar está "collapsed" ou "open"
  const { toggleSidebar } = useSidebar();

  const isLoading = status === "loading";

  // URL de autorização com enable_fb_login=0 e force_authentication=1
  const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!
  )}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish`;

  const isInstagramConnected = !!session?.user?.instagramAccessToken;
  const { theme } = useTheme();
  const instagramAnimationSrc =
    theme === "dark"
      ? "/animations/logodarckInstagram.lottie"
      : "/animations/logolightInstagram.lottie";

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

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarContent>
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
                  {/* Se não está conectado, mostra botão de login do Instagram */}
                  {!isInstagramConnected && (
                    <>
                      <p className="text-lg font-bold mb-2">
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

                    {/* /admin/user */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link
                          href="/admin/user"
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
                    href="/dashboard/agendamento"
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
                    href="/admin/queue"
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
                    href="/dashboard/automacao"
                    className={`flex items-center ${
                      state === "collapsed" ? "justify-start pl-4" : "justify-start pl-2"
                    }`}
                  >
                    <Zap className="mr-2" />
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
