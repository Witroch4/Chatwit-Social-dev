// components/navbarGeral.tsx
'use client';

import React from 'react';
import { ThemeToggle } from "./theme-toggle";
import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";

const NavbarGeral = () => {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="navbar bg-background border-b z-10 fixed top-0 left-0 right-0">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Meu Aplicativo</h1>
        <div className="flex items-center space-x-4">
          {!session?.user && pathname !== "/auth/login" && (
            <button
              onClick={() => signIn()}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-foreground transition-all"
            >
              Inscrever-se
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default NavbarGeral;
