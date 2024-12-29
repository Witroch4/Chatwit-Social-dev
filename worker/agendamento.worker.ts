// worker/agendamento.worker.ts

import axios from "axios";
import { agendamentoQueue } from "@/lib/queue"; // Alias @ definido no tsconfig.json
import dotenv from "dotenv";
import { processarAgendamentosPendentes } from "@/lib/scheduler-bull";
import cron from "node-cron";
import { Job } from "bull"; // Importar tipo Job

dotenv.config();

const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://autofluxofilaapi.witdev.com.br/webhook/5f439037-6e1a-4d53-80ae-1cc0c4633c51";

// Eventos para depuração
agendamentoQueue.on("error", (error) => {
  console.error("[Bull] Erro na conexão com o Redis:", error);
});

agendamentoQueue.on("ready", () => {
  console.log("[Bull] Conexão com o Redis estabelecida com sucesso.");
});

// Processa os jobs da fila 'agendamento'
agendamentoQueue.process(async (job: Job<{ id: string | number; Data: string; userID: string }>) => {
  try {
    const { id, Data, userID } = job.data;

    console.log(`[Bull] Iniciando processamento do job ID=${id} em ${new Date().toISOString()}`);

    await axios.post(WEBHOOK_URL, {
      baserowId: id,
      dataAgendada: Data,
      userID,
    });

    console.log(`[Bull] Webhook disparado com sucesso para ID=${id}.`);
  } catch (error: any) {
    console.error(`[Bull] Erro ao processar job ID=${job.data?.id}:`, error?.message || error);
    throw error;
    /**
     * Lançar o erro faz o Bull registrar falha e,
     * se houver 'attempts' configurado, ele tentará reprocessar.
     */
  }
});

console.log("[Bull Worker] Iniciado e aguardando jobs na fila 'agendamento'...");

// Agendar a tarefa para processar agendamentos pendentes uma vez por dia às 00:00
cron.schedule("0 0 * * *", async () => {
  console.log("[Bull Worker] Executando tarefa diária de processamento de agendamentos pendentes...");
  await processarAgendamentosPendentes();
});

console.log("[Bull Worker] Tarefa agendada para processar agendamentos pendentes diariamente às 00:00.");
