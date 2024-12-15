"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import LoginBadge from "@/components/auth/login-badge";
import { ChevronDown, CircleUser, User2, Instagram, Users, Zap, Calendar, MessageCircle, HelpCircle } from "lucide-react";
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

export function AppSidebar() {
  const { data: session } = useSession();
  const { state } = useSidebar(); // Certifique-se de usar o hook useSidebar aqui

  const [instagramConnected, setInstagramConnected] = useState(false);

  useEffect(() => {
    // Chama a rota para verificar status do Instagram
    fetch('/api/instagram/status')
      .then(res => res.json())
      .then(data => {
        setInstagramConnected(data.connected);
      })
      .catch(() => setInstagramConnected(false));
  }, []);

// URL de autorização com enable_fb_login=0 e force_authentication=1
const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI)}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish`;


  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarContent>
        {/* Grupo: Social Login */}
        <Collapsible defaultOpen={false} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger className="flex items-center gap-2">
              Social Login
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <div className="p-4">
                  <a className="text-l font-bold mb-2">
                    Para continuar, faça login com sua rede social e autorize o acesso.
                  </a>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <a href={instagramAuthUrl} className="flex items-center gap-2">
                          <Instagram className={`mr-2 ${instagramConnected ? "text-pink-500" : "text-current"}`} />
                          <span>Login com Instagram</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Contatos */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/contatos">
                    <Users className="mr-2" />
                    <span>Contatos</span>
                  </a>
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
                  <a href="/agendamento">
                    <Zap className="mr-2" />
                    <span>Agendamento de Postagens</span>
                  </a>
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
                  <a href="/calendario">
                    <Calendar className="mr-2" />
                    <span>Calendário</span>
                  </a>
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
                  <a href="/automacao">
                    <Zap className="mr-2" />
                    <span>Automação</span>
                  </a>
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
                  <a href="/user">
                    <MessageCircle className="mr-2" />
                    <span>Chat ao Vivos</span>
                  </a>
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
                  <a href="/docs">
                    <HelpCircle className="mr-2" />
                    <span>Ajuda (Docs)</span>
                  </a>
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
                  session?.user && state === "collapsed" ? "justify-center" : ""
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
                {state !== "collapsed" && (
                  <span className="ml-2">{session?.user?.name ?? "Minha Conta"}</span>
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
