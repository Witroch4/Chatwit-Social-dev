// lib/queue/agendamento.queue.ts

import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';

const AGENDAMENTO_QUEUE_NAME = 'agendamento';

/**
 * Interface dos dados que serão passados ao job.
 */
export interface IAgendamentoJobData {
  baserowId: string; // ID formatado como "ag-job-<id>"
  Data: string;      // Data/hora em formato ISO
  userID: string;    // ID do usuário responsável pelo agendamento
  Diario?: boolean;  // Indica se é uma postagem diária
}

/**
 * Criação da Fila de Agendamento
 */
export const agendamentoQueue = new Queue<IAgendamentoJobData, any, string>(AGENDAMENTO_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  }
});
