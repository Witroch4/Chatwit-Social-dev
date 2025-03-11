"use strict";
// components/auth/login-badge.tsx
"use client";
// components/auth/login-badge.tsx
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const button_1 = require("../../components/ui/button");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const icons_1 = require("../icons");
const avatar_1 = require("../ui/avatar");
const dynamic_1 = __importDefault(require("next/dynamic")); // Importação dinâmica
const coins_light_json_1 = __importDefault(require("../../public/animations/coins-light.json"));
const coins_dark_json_1 = __importDefault(require("../../public/animations/coins-dark.json"));
const login_button_1 = __importDefault(require("./login-button"));
const logout_button_1 = __importDefault(require("./logout-button"));
const next_themes_1 = require("next-themes");
// Importa o Lottie dinamicamente com SSR desativado
const Lottie = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require("lottie-react"))), { ssr: false });
const LoginBadge = ({ user }) => {
    var _a;
    const { theme } = (0, next_themes_1.useTheme)();
    const coinsAnimation = theme === "dark" ? coins_dark_json_1.default : coins_light_json_1.default;
    if (!user) {
        return (<div className="flex flex-col gap-2 p-2">
        <login_button_1.default>
          <button_1.Button variant="default">Entrar</button_1.Button>
        </login_button_1.default>
      </div>);
    }
    return (<div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        <avatar_1.Avatar>
          <avatar_1.AvatarImage src={user.image || ""}/>
          <avatar_1.AvatarFallback className="bg-green-500">
            <lucide_react_1.CircleUser className="h-5 w-5"/>
          </avatar_1.AvatarFallback>
        </avatar_1.Avatar>
        <span className="font-medium text-foreground">{(_a = user.name) !== null && _a !== void 0 ? _a : "Minha Conta"}</span>
      </div>
      <hr className="w-full border-muted-foreground/20"/>
      <div className="flex flex-col gap-1 w-full text-sm">
        <link_1.default href="/auth/settings" className="hover:underline flex items-center gap-2">
          <icons_1.LineMdCogLoop className="mr-2"/>
          Perfil
        </link_1.default>
        <link_1.default href="/cobranca" className="hover:underline flex items-center gap-2">
          <div className="w-6 h-6">
            {/* O Lottie já é importado dinamicamente, não precisa mais verificar isClient */}
            <Lottie animationData={coinsAnimation} loop={true}/>
          </div>
          Cobrança
        </link_1.default>
        <logout_button_1.default>
          <button_1.Button variant="ghost" className="flex items-center gap-2 justify-start text-sm">
            <lucide_react_1.LogOut /> Sair
          </button_1.Button>
        </logout_button_1.default>
      </div>
    </div>);
};
exports.default = LoginBadge;
