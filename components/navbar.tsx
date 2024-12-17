"use client";
// components/navbar.tsx
import { ThemeToggle } from "./theme-toggle";
import { SidebarTrigger } from "./ui/sidebar";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation"; // Importa o hook para verificar a rota

const Navbar = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { data: session } = useSession(); // Hook para verificar a sessão do usuário
  const pathname = usePathname(); // Obtém a rota atual

  return (
    <>
      {/* Botão para abrir/fechar a sidebar - só aparece se o usuário estiver logado */}
      {session?.user && (
        <div
          className={`fixed top-4 ${
            isSidebarOpen ? "left-[calc(16rem+10px)]" : "left-[4.5rem]"
          } z-50 transition-all duration-300`}
        >
          <SidebarTrigger
            className="flex"
            onClick={() => setSidebarOpen((prev) => !prev)}
          />
        </div>
      )}


    </>
  );
};

export default Navbar;
