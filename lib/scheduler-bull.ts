// lib/scheduler-bull.ts

import { agendamentoQueue } from "@/lib/queue";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BASEROW_TOKEN = process.env.BASEROW_TOKEN || "";
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || "";

/**
 * Adiciona um job na fila com delay para a Data informada.
 * @param agendamento Objeto com { id, Data, userID }
 */
export async function scheduleAgendamentoBull(agendamento: {
  id: string | number;
  Data: string; // Data/hora completa
  userID: string;
}) {
  const now = Date.now();
  const target = new Date(agendamento.Data).getTime();
  let delay = target - now;
  if (delay < 0) {
    // Se já passou, define delay = 0 para disparar imediatamente
    delay = 0;
  }

  // Remove o job antigo se existir
  await agendamentoQueue.removeJobs(String(agendamento.id));

  const job = await agendamentoQueue.add(
    {
      id: agendamento.id,
      Data: agendamento.Data,
      userID: agendamento.userID,
    },
    {
      jobId: String(agendamento.id), // Identificador único
      delay,
      attempts: 3, // Tente 3 vezes se falhar
      removeOnComplete: true, // Remove do Redis quando concluído
      removeOnFail: false, // Mantém no Redis se falhar
    }
  );

  console.log(`[Bull] (schedule) Job agendado: ID=${agendamento.id}, delay=${delay}ms. JobId interno: ${job.id}`);
}

/**
 * Remove (cancela) o agendamento da fila do Bull.
 * @param id ID do Baserow (ou da row).
 */
export async function cancelAgendamentoBull(id: string | number) {
  // Remove o job com jobId = id
  const removedJobs = await agendamentoQueue.removeJobs(String(id));
    console.log(`[Bull] (cancel) Agendamento ID=${id} removido da fila`);

}

/**
 * Função para carregar e agendar agendamentos pendentes.
 * Essa função deve ser chamada periodicamente, por exemplo, uma vez por dia.
 */
export async function processarAgendamentosPendentes() {
  try {
    console.log("[Scheduler-Bull] Iniciando processamento de agendamentos pendentes...");

    // Define o período para agendar (24 dias a partir de agora)
    const now = new Date();
    const maxDelayDate = new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000); // 24 dias

    // Filtra os agendamentos do Baserow que estão dentro do próximo período
    const filter = JSON.stringify({
      userID: { _neq: null }, // Ajuste conforme necessário
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
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    const agendamentos = response.data?.results || [];

    console.log(`[Scheduler-Bull] Encontrados ${agendamentos.length} agendamento(s) para agendar na fila Bull.`);

    for (const agendamento of agendamentos) {
      await scheduleAgendamentoBull({
        id: agendamento.id,
        Data: agendamento.Data,
        userID: agendamento.userID,
      });
    }

    console.log("[Scheduler-Bull] Processamento de agendamentos pendentes concluído.");
  } catch (error: any) {
    console.error("[Scheduler-Bull] Erro ao processar agendamentos pendentes:", error.message || error);
  }
}
