"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
// components/navbar.tsx
const theme_toggle_1 = require("./theme-toggle");
const sidebar_1 = require("./ui/sidebar");
const react_1 = require("react");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation"); // Importa o hook para verificar a rota
const Navbar = () => {
    const [isSidebarOpen, setSidebarOpen] = (0, react_1.useState)(true);
    const { data: session } = (0, react_2.useSession)(); // Hook para verificar a sessão do usuário
    const pathname = (0, navigation_1.usePathname)(); // Obtém a rota atual
    return (<>
      {/* Botão para abrir/fechar a sidebar - só aparece se o usuário estiver logado */}
      {(session === null || session === void 0 ? void 0 : session.user) && (<div className={`fixed top-4 ${isSidebarOpen ? "left-[calc(16rem+10px)]" : "left-[4.5rem]"} z-50 transition-all duration-300`}>
          <sidebar_1.SidebarTrigger className="flex" onClick={() => setSidebarOpen((prev) => !prev)}/>
        </div>)}
    <div className="fixed top-4 right-4 z-50 flex items-center space-x-4">
    <theme_toggle_1.ThemeToggle />


      </div>
    </>);
};
exports.default = Navbar;
