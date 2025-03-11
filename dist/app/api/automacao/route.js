"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
// app/api/automacao/route.ts
const server_1 = require("next/server");
const prisma_1 = require("../../../lib/prisma");
const auth_1 = require("../../../auth");
const crypto_1 = __importDefault(require("crypto"));
async function GET() {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }
        const automacoes = await prisma_1.prisma.automacao.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
        });
        return server_1.NextResponse.json(automacoes, { status: 200 });
    }
    catch (error) {
        console.error("[GET /api/automacao] Erro:", error);
        return server_1.NextResponse.json({ error: "Erro ao buscar automações." }, { status: 500 });
    }
}
async function POST(request) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }
        const body = await request.json();
        const { selectedMediaId, anyMediaSelected, selectedOptionPalavra, palavrasChave, fraseBoasVindas, quickReplyTexto, mensagemEtapa3, linkEtapa3, legendaBotaoEtapa3, responderPublico, pedirEmailPro, pedirParaSeguirPro, contatoSemClique, publicReply, folderId, // Caso queira criar diretamente em uma pasta
        live = true, } = body;
        // Gera um payload único
        function generateButtonPayload() {
            const randomSuffix = crypto_1.default.randomBytes(12).toString("hex");
            return "WIT-EQ:" + randomSuffix;
        }
        const buttonPayload = generateButtonPayload();
        const automacao = await prisma_1.prisma.automacao.create({
            data: {
                userId: session.user.id,
                selectedMediaId: selectedMediaId || null,
                anyMediaSelected: !!anyMediaSelected,
                selectedOptionPalavra: selectedOptionPalavra || "qualquer",
                palavrasChave: palavrasChave || null,
                fraseBoasVindas: fraseBoasVindas || null,
                quickReplyTexto: quickReplyTexto || null,
                mensagemEtapa3: mensagemEtapa3 || null,
                linkEtapa3: linkEtapa3 || null,
                legendaBotaoEtapa3: legendaBotaoEtapa3 || null,
                responderPublico: !!responderPublico,
                pedirEmailPro: !!pedirEmailPro,
                pedirParaSeguirPro: !!pedirParaSeguirPro,
                contatoSemClique: !!contatoSemClique,
                publicReply: publicReply || null,
                buttonPayload,
                folderId: folderId || null,
                live: live,
            },
        });
        return server_1.NextResponse.json(automacao, { status: 201 });
    }
    catch (error) {
        console.error("[POST /api/automacao] Erro:", error);
        return server_1.NextResponse.json({ error: error.message || "Erro ao salvar automação." }, { status: 500 });
    }
}
