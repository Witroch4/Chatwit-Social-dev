"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
//app\api\agendar\update\[id]\route.ts
const server_1 = require("next/server");
const axios_1 = __importDefault(require("axios"));
const scheduler_bullmq_1 = require("@/lib/scheduler-bullmq");
/**
 * PATCH em /api/agendar/update/[id]
 * - Atualiza o agendamento no Baserow
 * - Re-agenda no BullMQ (remove job antigo e cria novo)
 */
async function PATCH(request, context) {
    try {
        // Aguarda a resolução dos parâmetros dinâmicos
        const { id: rowId } = await context.params;
        const { Data, Descrição, midia, Instagram, Stories, Reels, PostNormal, Diario, Randomizar, IGtoken, userID, } = await request.json();
        if (!userID) {
            return server_1.NextResponse.json({ error: 'userID é obrigatório.' }, { status: 400 });
        }
        if (!rowId) {
            return server_1.NextResponse.json({ error: 'rowId é obrigatório na URL.' }, { status: 400 });
        }
        const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
        const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
        if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
            return server_1.NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
        }
        // 1) Atualiza no Baserow
        const updatedRow = {
            Data,
            Descrição,
            midia: midia || [],
            Instagram,
            Stories,
            Reels,
            PostNormal,
            Diario,
            Randomizar,
            IGtoken,
            userID,
        };
        console.log('[Update] Payload para Baserow:', updatedRow);
        const response = await axios_1.default.patch(`https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`, updatedRow, {
            headers: {
                Authorization: `Token ${BASEROW_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('[Update] Resposta do Baserow:', response.data);
        // 2) Cancela o job antigo e re-agenda
        await (0, scheduler_bullmq_1.cancelAgendamentoBullMQ)(rowId);
        await (0, scheduler_bullmq_1.scheduleAgendamentoBullMQ)({
            id: response.data.id,
            Data: response.data.Data,
            userID: response.data.userID,
        });
        return server_1.NextResponse.json(response.data, { status: 200 });
    }
    catch (error) {
        console.error('[Update] Erro ao atualizar agendamento:', error.message);
        return server_1.NextResponse.json({ error: 'Erro ao atualizar agendamento.' }, { status: 500 });
    }
}
