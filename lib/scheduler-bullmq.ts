import axios from 'axios';
import dotenv from 'dotenv';
import { agendamentoQueue, IAgendamentoJobData } from '@/lib/queue/agendamento.queue';

dotenv.config();

const BASEROW_TOKEN = process.env.BASEROW_TOKEN || '';
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || '';

/**
 * Agenda (ou re-agenda) um job no BullMQ, calculando o delay com base em "Data".
 * Garante que `jobId` seja no formato "ag-job-<id>".
 */
export async function scheduleAgendamentoBullMQ(agendamento: {
  id: string | number; // ID do Baserow
  Data: string;        // Data/hora em formato ISO
  userID: string;      // Usuário responsável pelo agendamento
}) {
  // 1) Calcula o delay
  const now = Date.now();
  const targetTime = new Date(agendamento.Data).getTime();
  let delay = targetTime - now;
  if (delay < 0) {
    // Se a data já passou, processa imediatamente
    delay = 0;
  }

  // 2) Monta o jobId: "ag-job-<rowId>"
  const jobIdString = `ag-job-${BASEROW_TABLE_ID}-${String(agendamento.id)}`;
  console.log(`[scheduleAgendamentoBullMQ] jobIdString=${jobIdString}`);

  // 3) Remove job anterior, se existir
  const oldJob = await agendamentoQueue.getJob(jobIdString);
  if (oldJob) {
    await oldJob.remove();
    console.log(`[BullMQ] Job antigo removido: jobId=${oldJob.id}`);
  }

  // 4) Cria o novo job
  try {
    const jobData: IAgendamentoJobData = {
      baserowId: jobIdString,
      Data: agendamento.Data,
      userID: agendamento.userID,
    };

    const newJob = await agendamentoQueue.add('agendamento', jobData, {
      jobId: jobIdString,
      delay,
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
    });

    console.log(`[BullMQ] (schedule) Job agendado com sucesso: jobId=${jobIdString}, delay=${delay}ms`);
    return newJob;
  } catch (error: any) {
    console.error(`[BullMQ] Erro ao adicionar job: ${error.message}`);
    throw error;
  }
}

// lib/scheduler-bullmq.ts

/**
 * Cancela um job específico (pelo ID do Baserow).
 * Formata o ID no padrão "ag-job-<BASEROW_TABLE_ID>-<rowId>" para buscar no Redis.
 */
export async function cancelAgendamentoBullMQ(rowId: string | number) {
  const jobIdString = `ag-job-${BASEROW_TABLE_ID}-${String(rowId)}`;
  console.log(`[cancelAgendamentoBullMQ] jobIdString=${jobIdString}`);

  const oldJob = await agendamentoQueue.getJob(jobIdString);
  if (oldJob) {
    await oldJob.remove();
    console.log(`[BullMQ] Job removido com sucesso. ID=${jobIdString}`);
  } else {
    console.warn(`[BullMQ] Nenhum job encontrado com ID=${jobIdString}`);
  }
}


/// lib/scheduler-bullmq.ts

/**
 * Processa agendamentos pendentes do Baserow (1x/dia), criando jobs no BullMQ.
 */
export async function processarAgendamentosPendentes() {
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

    const response = await axios.get(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&filter=${encodeURIComponent(
        filter
      )}`,
      {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      }
    );

    const agendamentos = response.data?.results || [];
    console.log(`[BullMQ] Encontrados ${agendamentos.length} agendamento(s) pendente(s).`);

    // Agenda cada item
    for (const agendamento of agendamentos) {
      await scheduleAgendamentoBullMQ({
        id: agendamento.id,
        Data: agendamento.Data,
        userID: agendamento.userID,
      });
    }

    console.log('[BullMQ] Processamento de agendamentos pendentes concluído.');
  } catch (error: any) {
    console.error('[BullMQ] Erro ao processar agendamentos pendentes:', error.message || error);
  }
}

