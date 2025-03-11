"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const prisma_1 = require("../../../../lib/prisma");
const auth_1 = require("../../../../auth"); // <-- IMPORTANTE: trazer a função 'update'
const server_1 = require("next/server");
async function POST() {
    var _a, _b, _c;
    const session = await (0, auth_1.auth)();
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return server_1.NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    // 1. Remove do banco a conta do Instagram
    await prisma_1.prisma.account.deleteMany({
        where: {
            userId: session.user.id,
            provider: "instagram",
        },
    });
    // 2. Força a atualização do token JWT, setando instagramAccessToken e providerAccountId como undefined
    //    Isso fará com que o callback 'jwt' capture esse estado e limpe o token
    await (0, auth_1.update)({
        user: {
            isTwoFactorEnabled: (_c = (_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.isTwoFactorEnabled) !== null && _c !== void 0 ? _c : false,
            instagramAccessToken: undefined,
            providerAccountId: undefined,
        },
    });
    // 3. Retorna sucesso
    return server_1.NextResponse.json({ success: true });
}
