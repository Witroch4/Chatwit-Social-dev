"use client";
// components/navbar.tsx
import { ThemeToggle } from "./theme-toggle";
import { SidebarTrigger, useSidebar } from "./ui/sidebar";
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
import { User, LogOut, Settings, HelpCircle, PanelLeft, PanelRightClose } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { NotificationDropdown } from "./notifications/notification-dropdown";

const Navbar = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { toggleSidebar, state } = useSidebar();

  // Evitar erro de hidratação
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  // Extrair o accountId da URL
  const accountId = pathname?.split('/')[1];

  return (
    <header className="sticky top-0 left-0 right-0 h-16 border-b bg-background z-40">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2"
            onClick={toggleSidebar}
          >
            {state === "expanded" ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          <h1 className="text-xl font-semibold hidden md:block">
            Dashboard
          </h1>
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
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {session.user.name && <p className="font-medium">{session.user.name}</p>}
                    {session.user.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
