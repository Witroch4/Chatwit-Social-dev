"use strict";
// components/auth/update-session.tsx
"use client";
// components/auth/update-session.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UpdateSession;
const react_1 = require("react");
const react_2 = require("next-auth/react");
function UpdateSession() {
    const { update } = (0, react_2.useSession)();
    (0, react_1.useEffect)(() => {
        // Função para forçar a atualização da sessão
        update();
    }, [update]);
    return null;
}
