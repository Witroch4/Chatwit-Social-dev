"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
// app/api/pasta/route.ts
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const prisma_1 = require("@/lib/prisma");
async function GET() {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
        }
        const pastas = await prisma_1.prisma.pasta.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "asc" },
        });
        return server_1.NextResponse.json(pastas, { status: 200 });
    }
    catch (error) {
        console.error("[GET /api/pasta] Erro:", error);
        return server_1.NextResponse.json({ error: "Erro ao buscar pastas" }, { status: 500 });
    }
}
async function POST(request) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
        }
        const { name } = await request.json();
        if (!name || !name.trim()) {
            return server_1.NextResponse.json({ error: "Nome da pasta é obrigatório." }, { status: 400 });
        }
        const pasta = await prisma_1.prisma.pasta.create({
            data: {
                name: name.trim(),
                userId: session.user.id,
            },
        });
        return server_1.NextResponse.json(pasta, { status: 201 });
    }
    catch (error) {
        console.error("[POST /api/pasta] Erro:", error);
        return server_1.NextResponse.json({ error: "Erro ao criar pasta" }, { status: 500 });
    }
}
