// lib/queue/agendamento.queue.ts

import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';

const AGENDAMENTO_QUEUE_NAME = 'agendamento';

/**
 * Interface dos dados que serão passados ao job.
 */
export interface IAgendamentoJobData {
  Data: string;
  userID: string;
  baserowId: string; // ID do Baserow + prefixo "ag-job-<BASEROW_TABLE_ID>-<rowId>"
}

/**
 * Criação da Fila de Agendamento
 */
export const agendamentoQueue = new Queue<IAgendamentoJobData, any, string>(AGENDAMENTO_QUEUE_NAME, {
  connection,
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
