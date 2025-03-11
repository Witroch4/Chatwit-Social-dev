"use strict";
//app\api\agendar\route.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const axios_1 = __importDefault(require("axios"));
const scheduler_bullmq_1 = require("../../../lib/scheduler-bullmq");
/**
 * Handler para GET em /api/agendar
 * - Lista agendamentos de um determinado userID (passado via query param ou header)
 */
async function GET(request) {
    try {
        const url = new URL(request.url);
        const userID = url.searchParams.get('userID') || request.headers.get('user-id');
        if (!userID) {
            return server_1.NextResponse.json({ error: 'userID é obrigatório.' }, { status: 400 });
        }
        const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
        const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
        if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
            console.error('BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos.');
            return server_1.NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
        }
        // Filtra os agendamentos do usuário no Baserow
        const filter = JSON.stringify({ userID: { _eq: userID } });
        const response = await axios_1.default.get(`https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&filter=${encodeURIComponent(filter)}`, {
            headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        });
        return server_1.NextResponse.json(response.data, { status: 200 });
    }
    catch (error) {
        console.error('Erro ao listar agendamentos:', error.message);
        return server_1.NextResponse.json({ error: 'Erro ao listar agendamentos.' }, { status: 500 });
    }
}
/**
 * Handler para POST em /api/agendar
 * - Cria um novo agendamento no Baserow
 * - Agenda no BullMQ
 */
async function POST(request) {
    var _a;
    try {
        const body = await request.json();
        console.log('[Agendar] Corpo da requisição:', body);
        const { userID, Data, Descrição, midia, Instagram, Stories, Reels, PostNormal, Diario, Randomizar, IGtoken, } = body;
        if (!userID) {
            console.error('userID não fornecido.');
            return server_1.NextResponse.json({ error: 'userID é obrigatório.' }, { status: 400 });
        }
        const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
        const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
        if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
            console.error('BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos.');
            return server_1.NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
        }
        // 1) Cria o registro no Baserow
        const newRow = {
            userID,
            Data,
            Descrição,
            Facebook: false, // Exemplo de campo fixo
            midia: midia || [],
            Instagram,
            Stories,
            Reels,
            PostNormal,
            Diario,
            Randomizar,
            IGtoken,
            status: 'pendente',
        };
        console.log('[Agendar] Payload para Baserow:', newRow);
        const baserowResponse = await axios_1.default.post(`https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`, newRow, {
            headers: {
                Authorization: `Token ${BASEROW_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('[Agendar] Resposta do Baserow:', baserowResponse.data);
        // 2) Agenda com BullMQ
        const { id, Data: dataAgendada, userID: userIdAgend } = baserowResponse.data;
        await (0, scheduler_bullmq_1.scheduleAgendamentoBullMQ)({
            id,
            Data: dataAgendada,
            userID: userIdAgend,
        });
        return server_1.NextResponse.json(baserowResponse.data, { status: 200 });
    }
    catch (error) {
        console.error('[Agendar] Erro ao criar agendamento:', error.message);
        if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
        }
        else {
            console.error('Erro completo:', error);
        }
        return server_1.NextResponse.json({ error: 'Erro ao criar agendamento.' }, { status: 500 });
    }
}
