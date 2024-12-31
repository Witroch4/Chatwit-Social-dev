// lib/scheduler-bullmq.ts

import axios from "axios";
import dotenv from "dotenv";
import { agendamentoQueue, IAgendamentoJobData } from "@/lib/queue/agendamento.queue";

dotenv.config();

const BASEROW_TOKEN = process.env.BASEROW_TOKEN || "";
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || "";

/**
 * Agenda (ou reagenda) um job no BullMQ, com cálculo de delay baseado em "Data".
 * Garante que `jobId` seja uma string alfanumérica.
 */
export async function scheduleAgendamentoBullMQ(agendamento: {
  id: string | number;
  Data: string;     // Data/hora em formato ISO ou algo que o new Date(...) entenda
  userID: string;   // Usuário responsável pelo agendamento
}) {
  // 1) Calcula o delay em milissegundos
  const now = Date.now();
  const targetTime = new Date(agendamento.Data).getTime();
  let delay = targetTime - now;
  if (delay < 0) {
    // Se a Data já passou, processa imediatamente (delay = 0)
    delay = 0;
  }

  // 2) Converte ID para string com prefixo para evitar interpretação como inteiro
  const jobIdString = `ag-job-${String(agendamento.id)}`;
  console.log(`DEBUG -> jobIdString: ${jobIdString}, typeof: ${typeof jobIdString}`);

  // 3) Remove job anterior, caso exista
  const oldJob = await agendamentoQueue.getJob(jobIdString);
  if (oldJob) {
    await oldJob.remove();
    console.log(`[BullMQ] Job antigo removido: jobId=${oldJob.id}`);
  }

  // 4) Cria (ou recria) o job na fila
  try {
    const jobData: IAgendamentoJobData = {
      baserowId: jobIdString, // Renomeado para evitar conflitos
      Data: agendamento.Data,
      userID: agendamento.userID,
    };

    const newJob = await agendamentoQueue.add(
      "agendamento", // nome do job
      jobData,
      {
        jobId: jobIdString,   // ID único no Redis (string alfanumérica)
        delay,                // executa após 'delay' milissegundos
        attempts: 3,          // tenta 3x se falhar
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    console.log(
      `[BullMQ] (schedule) Job agendado: jobId=${jobIdString}, ` +
      `delay=${delay}ms. JobId interno: ${newJob.id}`
    );
  } catch (error: any) {
    console.error(`[BullMQ] Erro ao adicionar job: ${error.message}`);
    throw error; // Re-lançar o erro para ser tratado na rota
  }
}

/**
 * Cancela um job específico (pelo ID do Baserow).
 * Força o uso de string alfanumérica para buscar o job no Redis.
 */
export async function cancelAgendamentoBullMQ(rowId: string | number) {
  const jobIdString = `ag-job-${String(rowId)}`;
  console.log(`DEBUG -> cancelAgendamentoBullMQ: jobIdString=${jobIdString}, typeof=${typeof jobIdString}`);
  const oldJob = await agendamentoQueue.getJob(jobIdString);
  if (oldJob) {
    await oldJob.remove();
    console.log(`[BullMQ] Job removido com sucesso. ID=${jobIdString}`);
  } else {
    console.warn(`[BullMQ] Nenhum job encontrado com ID=${jobIdString}`);
  }
}

/**
 * Processa agendamentos pendentes do Baserow (ex.: 1x/dia),
 * criando jobs no BullMQ para cada um.
 */
export async function processarAgendamentosPendentes() {
  try {
    console.log("[BullMQ] Iniciando processamento de agendamentos pendentes...");

    // Definindo o intervalo de datas (24 dias a partir de agora)
    const now = new Date();
    const maxDelayDate = new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000);

    const filter = JSON.stringify({
      userID: { _neq: null },
      Data: {
        _gte: now.toISOString(),
        _lte: maxDelayDate.toISOString(),
      },
    });

    // Chama API do Baserow
    const response = await axios.get(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&filter=${encodeURIComponent(
        filter
      )}`,
      {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      }
    );

    const agendamentos = response.data?.results || [];
    console.log(`[BullMQ] Encontrados ${agendamentos.length} agendamento(s).`);

    // Agenda cada item
    for (const agendamento of agendamentos) {
      await scheduleAgendamentoBullMQ({
        id: agendamento.id, // O jobId será convertido dentro da função
        Data: agendamento.Data,
        userID: agendamento.userID,
      });
    }

    console.log("[BullMQ] Processamento de agendamentos pendentes concluído.");
  } catch (error: any) {
    console.error(
      "[BullMQ] Erro ao processar agendamentos pendentes:",
      error.message || error
    );
  }
}
