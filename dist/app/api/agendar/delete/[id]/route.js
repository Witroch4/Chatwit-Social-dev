"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
//app\api\agendar\delete\[id]\route.ts
const server_1 = require("next/server");
const axios_1 = __importDefault(require("axios"));
const scheduler_bullmq_1 = require("@/lib/scheduler-bullmq");
async function DELETE(request, context) {
    try {
        // Aguarda a resolução dos parâmetros assíncronos
        const { id: rowId } = await context.params;
        const userID = request.headers.get('user-id');
        if (!userID) {
            return server_1.NextResponse.json({ error: 'userID é obrigatório nos headers.' }, { status: 400 });
        }
        const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
        const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
        if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
            return server_1.NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
        }
        console.log(`[DELETE] Deletando agendamento com ID: ${rowId} para o usuário: ${userID}`);
        // 1) Verifica se o agendamento realmente pertence ao userID informado
        const getAgendamentoResponse = await axios_1.default.get(`https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`, {
            headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        });
        const agendamento = getAgendamentoResponse.data;
        if (agendamento.userID !== userID) {
            return server_1.NextResponse.json({ error: 'Não autorizado a deletar este agendamento.' }, { status: 403 });
        }
        // 2) Cancela o job na fila do BullMQ
        await (0, scheduler_bullmq_1.cancelAgendamentoBullMQ)(rowId);
        // 3) Remove o registro do Baserow
        await axios_1.default.delete(`https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`, {
            headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        });
        return server_1.NextResponse.json({ message: 'Agendamento deletado com sucesso.' }, { status: 200 });
    }
    catch (error) {
        console.error('[DELETE] Erro ao deletar agendamento:', error.message);
        return server_1.NextResponse.json({ error: 'Erro ao deletar agendamento.' }, { status: 500 });
    }
}
