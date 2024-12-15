"use client";

import { ThemeToggle } from "../theme-toggle";
import { SidebarTrigger } from "../ui/sidebar";
import { useState } from "react";

const Navbar = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true); // Estado para saber se a sidebar está aberta

  return (
    <>
      {/* Botão para abrir/fechar a sidebar */}
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

      {/* Botão para mudar o tema */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
    </>
  );
};

export default Navbar;
