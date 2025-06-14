'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, Bell, Users, LayoutDashboard, ShieldAlert, MessageSquare, Headphones, HelpCircle, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import LoginBadge from '@/components/auth/login-badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (status === 'loading') return;

      if (!session?.user) {
        toast.error("Acesso negado", {
          description: "Você precisa estar logado para acessar esta página",
        });
        router.push('/auth/login');
        return;
      }

              try {
          toast("Verificando permissões", { description: "Verificando permissões de administrador...",
           });

          const response = await fetch('/api/admin/notifications');

          if (response.status === 403) {
            toast.error("Acesso negado", {
              description: "Você não tem permissão para acessar esta área.",
            });
            router.push('/');
            return;
          }

          if (response.ok) {
            setIsAdmin(true);
            toast.success("Acesso permitido", {
              description: "Acesso de administrador verificado",
            });
          }
        } catch (error) {
          console.error('Erro ao verificar acesso de administrador:', error);
          toast.error("Erro", {
            description: "Erro ao verificar permissões. Tente novamente mais tarde.",
          });
          router.push('/');
        } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [session, status, router, toast]);

  // Exibir toast ao navegar entre páginas
  useEffect(() => {
    if (pathname && isAdmin) {
      let pageTitle = "Painel de Administração";
      let icon = <LayoutDashboard className="h-5 w-5" />;

      if (pathname.includes('/admin/users')) {
        pageTitle = "Gerenciamento de Usuários";
        icon = <Users className="h-5 w-5" />;
      } else if (pathname.includes('/admin/notifications')) {
        pageTitle = "Sistema de Notificações";
        icon = <Bell className="h-5 w-5" />;
      } else if (pathname.includes('/admin/leads-chatwit')) {
        pageTitle = "Gerenciamento de Leads Chatwit";
        icon = <MessageSquare className="h-5 w-5" />;
      } else if (pathname.includes('/admin/atendimento')) {
        pageTitle = "Sistema de Atendimento WhatsApp";
        icon = <Headphones className="h-5 w-5" />;
      }

      // Não exibir toast na primeira carga da página principal
      if (!(pathname === '/admin' && loading)) {
        toast("Área administrativa", {
          description: `Área de ${pageTitle}`,
        });
      }
    }
  }, [pathname, isAdmin, loading, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <nav className="mt-6">
          <AdminNavLink href="/admin" icon={<LayoutDashboard className="h-5 w-5 mr-3" />} exact>
            Dashboard
          </AdminNavLink>
          <AdminNavLink href="/" icon={<LayoutDashboard className="h-5 w-5 mr-3" />} exact>
            Home
          </AdminNavLink>
          <AdminNavLink href="/admin/notifications" icon={<Bell className="h-5 w-5 mr-3" />}>
            Notificações
          </AdminNavLink>
          <AdminNavLink href="/admin/users" icon={<Users className="h-5 w-5 mr-3" />}>
            Usuários
          </AdminNavLink>
          <AdminNavLink href="/admin/leads-chatwit" icon={<MessageSquare className="h-5 w-5 mr-3" />}>
            Leads Chatwit
          </AdminNavLink>
          <AdminNavLink href="/admin/atendimento" icon={<Headphones className="h-5 w-5 mr-3" />}>
            Atendimento WhatsApp
          </AdminNavLink>
          <AdminNavLink href="/admin/disparo-oab" icon={<Users className="h-5 w-5 mr-3" />}>
            Disparo OAB
          </AdminNavLink>
          <AdminNavLink href="/chatwitia" icon={<Users className="h-5 w-5 mr-3" />}>
            ChatwitIA
          </AdminNavLink>
          <AdminNavLink href="/admin/templates" icon={<HelpCircle className="h-5 w-5 mr-3" />}>
            Templates WhatsApp
          </AdminNavLink>
          
          {/* Botão Minha Conta */}
          <div className="px-6 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors cursor-pointer w-full",
                    "text-muted-foreground hover:text-foreground hover:bg-accent px-0 py-0 rounded"
                  )}
                >
                  <User className="h-5 w-5 mr-3" />
                  Minha Conta
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" className="w-64">
                <LoginBadge user={session?.user} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

interface AdminNavLinkProps {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  exact?: boolean;
}

const AdminNavLink = ({ href, children, icon, exact }: AdminNavLinkProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname ? pathname.startsWith(href) : false;

  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center px-6 py-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary border-r-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        {icon}
        {children}
      </div>
    </Link>
  );
};

export default AdminLayout;