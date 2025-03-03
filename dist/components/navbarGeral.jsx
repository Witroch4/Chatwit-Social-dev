"use strict";
// components/navbarGeral.tsx
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const image_1 = __importDefault(require("next/image"));
const theme_toggle_1 = require("./theme-toggle");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const NavbarGeral = () => {
    var _a;
    const { data: session } = (0, react_2.useSession)();
    const pathname = (_a = (0, navigation_1.usePathname)()) !== null && _a !== void 0 ? _a : "";
    // Verifica se a rota atual é /dashboard ou começa com /dashboard/
    const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    if (isDashboardRoute) {
        // Não renderiza o NavbarGeral nas rotas /dashboard e subrotas
        return null;
    }
    return (<nav className="navbar bg-background border-b z-10 fixed top-0 left-0 right-0 h-16">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between h-full">
        {/* Link para a página inicial envolvendo a logo */}
        <link_1.default href="/" className="relative h-12 w-36 sm:h-16 sm:w-48 md:h-60 md:w-60 cursor-pointer">
          <image_1.default src="/ChatWit.svg" alt="ChatWit Logo" fill className="object-contain"/>
        </link_1.default>
        <div className="flex items-center space-x-4">
          {!(session === null || session === void 0 ? void 0 : session.user) && pathname !== "/auth/login" && (<button onClick={() => (0, react_2.signIn)()} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-foreground transition-all">
              Inscrever-se
            </button>)}
          <theme_toggle_1.ThemeToggle />
        </div>
      </div>
    </nav>);
};
exports.default = NavbarGeral;
