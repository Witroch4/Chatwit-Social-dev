"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleAgendamentoBullMQ = scheduleAgendamentoBullMQ;
exports.cancelAgendamentoBullMQ = cancelAgendamentoBullMQ;
exports.processarAgendamentosPendentes = processarAgendamentosPendentes;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const agendamento_queue_1 = require("../lib/queue/agendamento.queue");
dotenv_1.default.config();
const BASEROW_TOKEN = process.env.BASEROW_TOKEN || '';
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || '';
/**
 * Agenda (ou re-agenda) um job no BullMQ, calculando o delay com base em "Data".
 * Garante que `jobId` seja no formato "ag-job-<id>".
 */
async function scheduleAgendamentoBullMQ(agendamento) {
    // 1) Calcula o delay
    const now = Date.now();
    const targetTime = new Date(agendamento.Data).getTime();
    // Verificar se a data é válida
    if (isNaN(targetTime)) {
        console.error(`[BullMQ] Data inválida: ${agendamento.Data}`);
        throw new Error(`Data inválida para agendamento: ${agendamento.Data}`);
    }
    let delay = targetTime - now;
    if (delay < 0) {
        // Se a data já passou, processa imediatamente
        delay = 0;
    }
    // Garantir que o ID seja uma string válida
    const agendamentoId = String(agendamento.id || '').trim();
    if (!agendamentoId) {
        console.error(`[BullMQ] ID inválido: ${agendamento.id}`);
        throw new Error(`ID inválido para agendamento: ${agendamento.id}`);
    }
    // 2) Monta o jobId: "ag-job-<rowId>"
    const jobIdString = `ag-job-${BASEROW_TABLE_ID}-${agendamentoId}`;
    console.log(`[scheduleAgendamentoBullMQ] jobIdString=${jobIdString}`);
    // 3) Remove job anterior, se existir
    const oldJob = await agendamento_queue_1.agendamentoQueue.getJob(jobIdString);
    if (oldJob) {
        await oldJob.remove();
        console.log(`[BullMQ] Job antigo removido: jobId=${oldJob.id}`);
    }
    // 4) Cria o novo job
    try {
        // Garantir que todos os dados são válidos e serializáveis
        const jobData = {
            baserowId: jobIdString,
            Data: agendamento.Data,
            userID: agendamento.userID || '',
        };
        // Verificar se há valores NaN ou Infinity nos dados
        for (const [key, value] of Object.entries(jobData)) {
            if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                console.error(`[BullMQ] Valor inválido para ${key}: ${value}`);
                throw new Error(`Valor inválido para ${key}: ${value}`);
            }
        }
        const newJob = await agendamento_queue_1.agendamentoQueue.add('agendamento', jobData, {
            jobId: jobIdString,
            delay,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false,
        });
        console.log(`[BullMQ] (schedule) Job agendado com sucesso: jobId=${jobIdString}, delay=${delay}ms`);
        return newJob;
    }
    catch (error) {
        console.error(`[BullMQ] Erro ao adicionar job: ${error.message}`);
        throw error;
    }
}
// lib/scheduler-bullmq.ts
/**
 * Cancela um job específico (pelo ID do Baserow).
 * Formata o ID no padrão "ag-job-<BASEROW_TABLE_ID>-<rowId>" para buscar no Redis.
 */
async function cancelAgendamentoBullMQ(rowId) {
    const jobIdString = `ag-job-${BASEROW_TABLE_ID}-${String(rowId)}`;
    console.log(`[cancelAgendamentoBullMQ] jobIdString=${jobIdString}`);
    const oldJob = await agendamento_queue_1.agendamentoQueue.getJob(jobIdString);
    if (oldJob) {
        await oldJob.remove();
        console.log(`[BullMQ] Job removido com sucesso. ID=${jobIdString}`);
    }
    else {
        console.warn(`[BullMQ] Nenhum job encontrado com ID=${jobIdString}`);
    }
}
/// lib/scheduler-bullmq.ts
/**
 * Processa agendamentos pendentes do Baserow (1x/dia), criando jobs no BullMQ.
 */
async function processarAgendamentosPendentes() {
    var _a;
    try {
        console.log('[BullMQ] Iniciando processamento de agendamentos pendentes...');
        // Exemplo: pega agendamentos entre agora e +24 dias
        const now = new Date();
        const maxDelayDate = new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000);
        const filter = JSON.stringify({
            userID: { _neq: null },
            Data: {
                _gte: now.toISOString(),
                _lte: maxDelayDate.toISOString(),
            },
        });
        const response = await axios_1.default.get(`https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&filter=${encodeURIComponent(filter)}`, {
            headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        });
        const agendamentos = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.results) || [];
        console.log(`[BullMQ] Encontrados ${agendamentos.length} agendamento(s) pendente(s).`);
        // Agenda cada item
        for (const agendamento of agendamentos) {
            try {
                // Garantir que os dados necessários estão presentes e válidos
                const agendamentoData = {
                    id: agendamento.id,
                    Data: agendamento.Data,
                    userID: agendamento.userID || ''
                };
                // Verificar se os dados são válidos
                if (!agendamentoData.id || !agendamentoData.Data) {
                    console.error(`[BullMQ] Dados inválidos para agendamento: ${JSON.stringify(agendamentoData)}`);
                    continue; // Pula este agendamento e continua com o próximo
                }
                await scheduleAgendamentoBullMQ(agendamentoData);
            }
            catch (error) {
                console.error(`[BullMQ] Erro ao agendar item ${agendamento.id}:`, error.message || error);
                // Continua com o próximo agendamento
            }
        }
        console.log('[BullMQ] Processamento de agendamentos pendentes concluído.');
    }
    catch (error) {
        console.error('[BullMQ] Erro ao processar agendamentos pendentes:', error.message || error);
    }
}
