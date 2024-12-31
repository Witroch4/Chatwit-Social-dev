// lib/queue/agendamento.queue.ts

import { Queue, Job } from 'bullmq';
import { connection } from '@/lib/redis';

const AGENDAMENTO_QUEUE_NAME = 'agendamento';

/**
 * Interface dos dados que serão passados ao job.
 */
export interface IAgendamentoJobData {
  Data: string;
  userID: string;
  baserowId: string;
}

/**
 * Criação da Fila de Agendamento
 */
export const agendamentoQueue = new Queue<IAgendamentoJobData, any, string>(AGENDAMENTO_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: true, // Remove o job do Redis ao completar
    removeOnFail: false,    // Mantém registro de falhas
    attempts: 3,            // Tenta refazer até 3 vezes
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

/**
 * Função para agendar (enfileirar) um novo job.
 */
export async function addAgendamentoJob(data: IAgendamentoJobData) {
  console.log(`DEBUG -> addAgendamentoJob: jobId=${data.baserowId}, typeof=${typeof data.baserowId}`);
  return agendamentoQueue.add('agendamento', data, {
    jobId: data.baserowId, // Já é string com prefixo
    delay: 0,               // Sem delay adicional
  });
}

/**
 * Função para cancelar/remover um job pelo ID do Baserow.
 */
export async function removeAgendamentoJob(jobId: string) {
  console.log(`DEBUG -> removeAgendamentoJob: jobId=${jobId}, typeof=${typeof jobId}`);
  const job = await agendamentoQueue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`[BullMQ] Job removido com sucesso. ID=${jobId}`);
  } else {
    console.warn(`[BullMQ] Nenhum job encontrado com ID=${jobId}`);
  }
}
