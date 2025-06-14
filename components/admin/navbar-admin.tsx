"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings, HelpCircle, Home, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import LoginBadge from "@/components/auth/login-badge";

const NavbarAdmin = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Evitar erro de hidratação
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <header className="sticky top-0 left-0 right-0 h-16 border-b bg-background z-40">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center space-x-2">
          <Link href="/admin" className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 mr-2">
              <Home className="h-5 w-5" />
              <span className="sr-only">Painel Admin</span>
            </Button>
            <h1 className="text-xl font-semibold hidden md:block">
              Painel Administrativo
            </h1>
          </Link>
          
          <Link href="/admin/leads-chatwit">
            <Button variant="ghost" className="hidden md:flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span>Leads Chatwit</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationDropdown />

          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Ajuda</span>
          </Button>

          <ThemeToggle />

          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={session.user.image || ""} alt={session.user.name || "Usuário"} />
                  <AvatarFallback>
                    {session.user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <LoginBadge user={session.user} />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavbarAdmin;