"use strict";
// lib/queue/agendamento.queue.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.agendamentoQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("@/lib/redis");
const AGENDAMENTO_QUEUE_NAME = 'agendamento';
/**
 * Criação da Fila de Agendamento
 */
exports.agendamentoQueue = new bullmq_1.Queue(AGENDAMENTO_QUEUE_NAME, {
    connection: redis_1.connection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
});
