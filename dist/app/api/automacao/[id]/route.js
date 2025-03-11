"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
exports.DELETE = DELETE;
// app/api/automacao/[id]/route.ts
const server_1 = require("next/server");
const prisma_1 = require("../../../../lib/prisma");
const auth_1 = require("../../../../auth");
const uuid_1 = require("uuid");
// ======================== GET ========================
async function GET(request, context) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }
        const paramObj = await context.params;
        const automacaoId = paramObj.id;
        const automacao = await prisma_1.prisma.automacao.findUnique({
            where: { id: automacaoId },
        });
        if (!automacao || automacao.userId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Automação não encontrada ou sem permissão." }, { status: 404 });
        }
        return server_1.NextResponse.json(automacao, { status: 200 });
    }
    catch (error) {
        console.error("[GET /api/automacao/[id]] Erro:", error);
        return server_1.NextResponse.json({ error: "Erro ao buscar automação." }, { status: 500 });
    }
}
// ======================== PATCH ========================
async function PATCH(request, context) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }
        const paramObj = await context.params;
        const automacaoId = paramObj.id;
        const body = (await request.json());
        // Carrega automação
        const automacao = await prisma_1.prisma.automacao.findUnique({
            where: { id: automacaoId },
        });
        if (!automacao || automacao.userId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Automação não encontrada ou sem permissão." }, { status: 404 });
        }
        switch (body.action) {
            case "rename": {
                if (!body.newName) {
                    return server_1.NextResponse.json({ error: "Informe newName para renomear." }, { status: 400 });
                }
                const renamed = await prisma_1.prisma.automacao.update({
                    where: { id: automacaoId },
                    data: {
                        fraseBoasVindas: body.newName,
                    },
                });
                return server_1.NextResponse.json(renamed, { status: 200 });
            }
            case "duplicate": {
                const duplicated = await prisma_1.prisma.automacao.create({
                    data: {
                        userId: automacao.userId,
                        folderId: automacao.folderId,
                        selectedMediaId: automacao.selectedMediaId,
                        anyMediaSelected: automacao.anyMediaSelected,
                        selectedOptionPalavra: automacao.selectedOptionPalavra,
                        palavrasChave: automacao.palavrasChave,
                        fraseBoasVindas: (automacao.fraseBoasVindas || "") + " (Cópia)",
                        quickReplyTexto: automacao.quickReplyTexto,
                        mensagemEtapa3: automacao.mensagemEtapa3,
                        linkEtapa3: automacao.linkEtapa3,
                        legendaBotaoEtapa3: automacao.legendaBotaoEtapa3,
                        responderPublico: automacao.responderPublico,
                        pedirEmailPro: automacao.pedirEmailPro,
                        pedirParaSeguirPro: automacao.pedirParaSeguirPro,
                        contatoSemClique: automacao.contatoSemClique,
                        publicReply: automacao.publicReply,
                        live: automacao.live,
                        buttonPayload: `WIT-EQ:${(0, uuid_1.v4)()}`,
                    },
                });
                return server_1.NextResponse.json(duplicated, { status: 201 });
            }
            case "move": {
                if (body.folderId === undefined) { // Alterado para permitir null
                    return server_1.NextResponse.json({ error: "Informe folderId para mover a automação." }, { status: 400 });
                }
                const moved = await prisma_1.prisma.automacao.update({
                    where: { id: automacaoId },
                    data: {
                        folderId: body.folderId, // Pode ser string ou null
                    },
                });
                return server_1.NextResponse.json(moved, { status: 200 });
            }
            case "updateAll": {
                if (!body.data || typeof body.data !== "object") {
                    return server_1.NextResponse.json({ error: "Nenhum campo para atualizar. body.data ausente ou inválido." }, { status: 400 });
                }
                const updatedData = {};
                for (const key of Object.keys(body.data)) {
                    updatedData[key] = body.data[key];
                }
                const updated = await prisma_1.prisma.automacao.update({
                    where: { id: automacaoId },
                    data: updatedData,
                });
                return server_1.NextResponse.json(updated, { status: 200 });
            }
            default:
                return server_1.NextResponse.json({ error: "Ação inválida." }, { status: 400 });
        }
    }
    catch (error) {
        console.error("[PATCH /api/automacao/[id]] Erro:", error);
        return server_1.NextResponse.json({ error: "Erro ao modificar automação." }, { status: 500 });
    }
}
// ======================== DELETE ========================
async function DELETE(request, context) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }
        const paramObj = await context.params;
        const automacaoId = paramObj.id;
        const automacao = await prisma_1.prisma.automacao.findUnique({
            where: { id: automacaoId },
        });
        if (!automacao || automacao.userId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Automação não encontrada ou sem permissão." }, { status: 404 });
        }
        await prisma_1.prisma.automacao.delete({ where: { id: automacaoId } });
        return server_1.NextResponse.json({ success: true }, { status: 200 });
    }
    catch (error) {
        console.error("[DELETE /api/automacao/[id]] Erro:", error);
        return server_1.NextResponse.json({ error: "Erro ao deletar automação." }, { status: 500 });
    }
}
