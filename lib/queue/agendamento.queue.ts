// lib/queue/agendamento.queue.ts

import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';

const AGENDAMENTO_QUEUE_NAME = 'agendamento';

/**
 * Interface dos dados que serão passados ao job.
 */
export interface IAgendamentoJobData {
  baserowId: string; // Ex: "ag-job-<id>"
  Data: string;      // Data/hora em formato ISO
  userID: string;    // ID do usuário responsável pelo agendamento
  accountId: string; // ID da conta associada ao agendamento
  Diario?: boolean;  // Indica se é um agendamento diário
}

/**
 * Criação da Fila de Agendamento
 */
export const agendamentoQueue = new Queue<IAgendamentoJobData>('agendamento', {
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

/**
 * Agenda um job na fila com delay calculado.
 * @param agendamento Objeto com os dados do agendamento (id, Data, userID, accountId, Diario)
 */
export async function scheduleAgendamentoJob(agendamento: {
  id: string;
  Data: Date;
  userId: string;
  accountId: string;
  Diario?: boolean;
}) {
  // Calcula o delay em milissegundos
  const delay = new Date(agendamento.Data).getTime() - Date.now();
  const delayMs = Math.max(delay, 0); // Garante que o delay não seja negativo

  const jobData: IAgendamentoJobData = {
    baserowId: `ag-job-${agendamento.id}`,
    Data: agendamento.Data.toISOString(),
    userID: agendamento.userId,
    accountId: agendamento.accountId,
    Diario: agendamento.Diario,
  };

  console.log(`[AgendamentoQueue] Agendando job para ${agendamento.Data.toISOString()} (delay: ${delayMs}ms)`);

  await agendamentoQueue.add('process-agendamento', jobData, {
    delay: delayMs,
    jobId: `ag-job-${agendamento.id}-${Date.now()}`, // Garante ID único mesmo para reagendamentos
  });
}

/**
 * Cancela um job de agendamento na fila
 * @param agendamentoId ID do agendamento a ser cancelado
 */
export async function cancelAgendamentoJob(agendamentoId: string) {
  const jobs = await agendamentoQueue.getJobs();

  // Filtra jobs pelo ID do agendamento no baserowId
  const jobsToRemove = jobs.filter(job =>
    job.data.baserowId === `ag-job-${agendamentoId}`
  );

  console.log(`[AgendamentoQueue] Cancelando ${jobsToRemove.length} jobs para o agendamento ${agendamentoId}`);

  // Remove todos os jobs encontrados
  await Promise.all(jobsToRemove.map(job => job.remove()));
}
