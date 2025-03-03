"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstagramUserToken = getInstagramUserToken;
// lib/instagram-auth.ts
const prisma_1 = require("@/lib/prisma");
/**
 * Retorna o access_token da conta do Instagram
 * com base no igUserId (ex.: "17841468190323715").
 */
async function getInstagramUserToken(igUserId) {
    var _a;
    // Buscamos a account com provider="instagram" e igUserId=...
    // (ou se preferir, provider="instagram-business", fica a seu critério).
    const account = await prisma_1.prisma.account.findFirst({
        where: {
            provider: "instagram",
            igUserId: igUserId,
        },
    });
    return (_a = account === null || account === void 0 ? void 0 : account.access_token) !== null && _a !== void 0 ? _a : null;
}
