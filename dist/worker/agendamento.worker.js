"use strict";
// worker/agendamento.worker.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_cron_1 = __importDefault(require("node-cron"));
const redis_1 = require("../lib/redis");
const scheduler_bullmq_1 = require("../lib/scheduler-bullmq");
dotenv_1.default.config();
// Corrigir a URL do webhook (garantir que o protocolo esteja correto)
let webhookUrl = process.env.WEBHOOK_URL || 'https://autofluxofilaapi.witdev.com.br/webhook/5f439037-6e1a-4d53-80ae-1cc0c4633c51';
// Garantir que a URL começa com 'https://' (corrigir 'https://')
if (webhookUrl.startsWith('https://')) {
    webhookUrl = 'https://' + webhookUrl.substring(8);
    console.log('[BullMQ] URL do webhook corrigida:', webhookUrl);
}
const WEBHOOK_URL = webhookUrl;
const AGENDAMENTO_QUEUE_NAME = 'agendamento';
/**
 * Inicializa o JobScheduler (usado para jobs atrasados, re-tentativas, etc.)
 */
const jobScheduler = new bullmq_1.JobScheduler(AGENDAMENTO_QUEUE_NAME, {
    connection: redis_1.connection,
});
/**
 * Cria o Worker que processa a fila 'agendamento'
 */
const worker = new bullmq_1.Worker(AGENDAMENTO_QUEUE_NAME, async (job) => {
    try {
        const { baserowId, Data, userID } = job.data;
        console.log(`[BullMQ] Processando job baserowId=${baserowId} às ${new Date().toISOString()}`);
        // Exemplo de envio de webhook
        await axios_1.default.post(WEBHOOK_URL, {
            baserowId,
            dataAgendada: Data,
            userID,
        });
        console.log(`[BullMQ] Webhook disparado com sucesso para baserowId=${baserowId}.`);
    }
    catch (error) {
        console.error(`[BullMQ] Erro ao processar job baserowId=${job.data.baserowId}: ${error.message}`);
        throw error; // Lança o erro para o BullMQ marcar o job como "failed"
    }
}, { connection: redis_1.connection });
// Eventos de debug do Worker
worker.on('active', (job) => {
    console.log(`[BullMQ Worker] Job ativo: baserowId=${job.data.baserowId}`);
});
worker.on('completed', (job) => {
    console.log(`[BullMQ Worker] Job concluído: baserowId=${job.data.baserowId}`);
});
worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job falhou: baserowId=${job === null || job === void 0 ? void 0 : job.data.baserowId}, Erro: ${err.message}`);
});
worker.on('error', (err) => {
    console.error('[BullMQ Worker] Erro no worker:', err);
});
console.log('[BullMQ Worker] Iniciado e aguardando jobs na fila "agendamento"...');
// Cron para processar agendamentos pendentes 1 vez por dia (ex.: meia-noite)
node_cron_1.default.schedule('0 0 * * *', async () => {
    console.log('[BullMQ Worker] Executando tarefa diária de processamento de agendamentos pendentes...');
    await (0, scheduler_bullmq_1.processarAgendamentosPendentes)();
});
