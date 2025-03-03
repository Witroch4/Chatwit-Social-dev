"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.config = void 0;
const auth_1 = require("@/auth");
const server_1 = require("next/server");
exports.config = {
    runtime: 'nodejs',
};
exports.GET = (0, auth_1.auth)(async (req, ctx = {} // usamos nosso tipo personalizado
) => {
    var _a;
    // Se precisar acessar parâmetros, converte para Promise (mesmo que não existam)
    const params = await Promise.resolve((_a = ctx.params) !== null && _a !== void 0 ? _a : {});
    // Como NextRequest não tem "auth" na tipagem padrão, fazemos uma asserção de tipo
    const reqWithAuth = req;
    if (reqWithAuth.auth) {
        return server_1.NextResponse.json({ message: "Usuário Autenticado" });
    }
    return server_1.NextResponse.json({ message: "Não Autenticado" }, { status: 401 });
});
