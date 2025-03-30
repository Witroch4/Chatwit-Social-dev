"use strict";
// worker/webhook.worker.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoNotificationsWorker = exports.manuscritoWorker = exports.agendamentoWorker = void 0;
exports.initJobs = initJobs;
exports.initAgendamentoWorker = initAgendamentoWorker;
exports.initManuscritoWorker = initManuscritoWorker;
const bullmq_1 = require("bullmq");
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("../lib/redis");
const prisma_1 = require("../lib/prisma");
const agendamento_task_1 = require("./WebhookWorkerTasks/agendamento.task");
const manuscrito_task_1 = require("./WebhookWorkerTasks/manuscrito.task");
const manuscrito_queue_1 = require("../lib/queue/manuscrito.queue");
const instagram_webhook_queue_1 = require("../lib/queue/instagram-webhook.queue");
const node_cron_1 = __importDefault(require("node-cron"));
dotenv_1.default.config();
// Worker de agendamento
const agendamentoWorker = new bullmq_1.Worker('agendamento', agendamento_task_1.processAgendamentoTask, { connection: redis_1.connection });
exports.agendamentoWorker = agendamentoWorker;
// Worker de manuscrito
const manuscritoWorker = new bullmq_1.Worker(manuscrito_queue_1.MANUSCRITO_QUEUE_NAME, manuscrito_task_1.processManuscritoTask, { connection: redis_1.connection });
exports.manuscritoWorker = manuscritoWorker;
// Worker para processar notificações automáticas
const autoNotificationsWorker = new bullmq_1.Worker(instagram_webhook_queue_1.AUTO_NOTIFICATIONS_QUEUE_NAME, async (job) => {
    console.log(`[BullMQ] Processando job de notificação automática: ${job.id}`);
    try {
        const { type } = job.data;
        switch (type) {
            case instagram_webhook_queue_1.AutoNotificationType.EXPIRING_TOKENS:
                await handleExpiringTokensNotification(job.data);
                break;
            default:
                console.warn(`[BullMQ] Tipo de notificação desconhecido: ${type}`);
        }
        return { success: true };
    }
    catch (error) {
        console.error(`[BullMQ] Erro ao processar notificação automática: ${error.message}`);
        throw error;
    }
}, { connection: redis_1.connection });
exports.autoNotificationsWorker = autoNotificationsWorker;
// Tratamento de eventos dos workers
[agendamentoWorker, manuscritoWorker, autoNotificationsWorker].forEach(worker => {
    worker.on('completed', (job) => {
        console.log(`[BullMQ] Job ${job.id} concluído com sucesso`);
    });
    worker.on('failed', (job, error) => {
        console.error(`[BullMQ] Job ${job === null || job === void 0 ? void 0 : job.id} falhou: ${error.message}`);
    });
});
/**
 * Processa notificações de tokens expirando
 */
async function handleExpiringTokensNotification(data) {
    try {
        console.log('[BullMQ] Verificando tokens expirando...');
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const expiringAccounts = await prisma_1.prisma.account.findMany({
            where: {
                expires_at: {
                    not: null,
                    lte: Math.floor(sevenDaysFromNow.getTime() / 1000),
                    gt: Math.floor(Date.now() / 1000),
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        console.log(`[BullMQ] Encontradas ${expiringAccounts.length} contas com tokens expirando.`);
        for (const account of expiringAccounts) {
            const expiresAt = account.expires_at ? new Date(account.expires_at * 1000) : null;
            if (!expiresAt)
                continue;
            const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            await prisma_1.prisma.notification.create({
                data: {
                    userId: account.userId,
                    title: 'Token de Acesso Expirando',
                    message: `Seu token de acesso para ${account.provider} expirará em ${daysRemaining} dias. Por favor, reconecte sua conta para evitar interrupções.`,
                    isRead: false,
                },
            });
            console.log(`[BullMQ] Notificação criada para o usuário ${account.userId} sobre token expirando em ${daysRemaining} dias.`);
        }
        return { success: true, count: expiringAccounts.length };
    }
    catch (error) {
        console.error('[BullMQ] Erro ao processar notificação de tokens expirando:', error);
        throw error;
    }
}
/**
 * Inicializa os jobs recorrentes
 */
async function initJobs() {
    try {
        console.log('[BullMQ] Inicializando jobs recorrentes...');
        node_cron_1.default.schedule('0 8 * * *', async () => {
            try {
                await (0, instagram_webhook_queue_1.addCheckExpiringTokensJob)();
            }
            catch (error) {
                console.error('[BullMQ] Erro ao agendar verificação de tokens expirando:', error);
            }
        });
        console.log('[BullMQ] Jobs recorrentes inicializados com sucesso.');
    }
    catch (error) {
        console.error('[BullMQ] Erro ao inicializar jobs recorrentes:', error);
    }
}
// Exportar a função de inicialização do worker de agendamento
async function initAgendamentoWorker() {
    try {
        console.log('[BullMQ] Inicializando worker de agendamento...');
        await agendamentoWorker.waitUntilReady();
        console.log('[BullMQ] Worker de agendamento inicializado com sucesso');
    }
    catch (error) {
        console.error('[BullMQ] Erro ao inicializar worker de agendamento:', error);
        throw error;
    }
}
// Exportar a função de inicialização do worker de manuscrito
async function initManuscritoWorker() {
    try {
        console.log('[BullMQ] Inicializando worker de manuscrito...');
        await manuscritoWorker.waitUntilReady();
        console.log('[BullMQ] Worker de manuscrito inicializado com sucesso');
    }
    catch (error) {
        console.error('[BullMQ] Erro ao inicializar worker de manuscrito:', error);
        throw error;
    }
}
// Tratamento de encerramento gracioso
process.on('SIGTERM', async () => {
    console.log('Encerrando workers...');
    await Promise.all([
        agendamentoWorker.close(),
        manuscritoWorker.close(),
        autoNotificationsWorker.close(),
    ]);
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('Encerrando workers...');
    await Promise.all([
        agendamentoWorker.close(),
        manuscritoWorker.close(),
        autoNotificationsWorker.close(),
    ]);
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
