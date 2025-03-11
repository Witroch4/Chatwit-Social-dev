"use strict";
// components/conditional-sidebar.tsx
'use client'; // Marca o componente como cliente
// components/conditional-sidebar.tsx
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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_2 = require("next-auth/react");
const app_sidebar_1 = require("../components/app-sidebar");
const ConditionalSidebar = () => {
    const { data: session, status } = (0, react_2.useSession)();
    const [isMounted, setIsMounted] = (0, react_1.useState)(false);
    // Garante que o componente está montado no cliente
    (0, react_1.useEffect)(() => {
        setIsMounted(true);
    }, []);
    // Renderiza a Sidebar apenas se o usuário estiver autenticado e o componente estiver montado
    if (!isMounted || status !== 'authenticated') {
        return null;
    }
    return <app_sidebar_1.AppSidebar />;
};
exports.default = ConditionalSidebar;
