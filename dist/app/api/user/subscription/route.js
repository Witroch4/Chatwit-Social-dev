"use strict";
// app/api/user/subscription/route.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const auth_1 = require("@/auth"); // Certifique-se de que esse arquivo exporta { auth, handlers, ... } conforme a nova configuração do NextAuth v5
const prisma_1 = require("@/lib/prisma");
async function GET(request) {
    var _a;
    // Obtenha a sessão usando o novo método auth()
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.email)) {
        return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Localize o usuário no banco de dados a partir do email presente na sessão
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: session.user.email },
    });
    if (!user) {
        return server_1.NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Busca o registro de assinatura mais recente do usuário.
    // Caso o usuário possua múltiplos registros, este exemplo retorna o mais recente.
    const subscription = await prisma_1.prisma.subscription.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
    });
    // Retorne o objeto da assinatura (ou null, caso não exista nenhum registro)
    return server_1.NextResponse.json({ subscription });
}
