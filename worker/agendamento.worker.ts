// worker/agendamento.worker.ts

import { Worker, Job } from "bullmq";
import { connection } from "@/lib/redis";
import dotenv from "dotenv";
import {
  INSTAGRAM_WEBHOOK_QUEUE_NAME,
  IInstagramWebhookJobData,
} from "@/lib/queue/instagram-webhook.queue";
import { handleInstagramWebhook } from "./automacao/eu-quero/automation";

dotenv.config();

/**
 * Worker principal que escuta a fila INSTAGRAM_WEBHOOK_QUEUE_NAME
 * e delega o processamento para a lógica de automação ("eu-quero").
 */
export const instagramWebhookWorker = new Worker<IInstagramWebhookJobData>(
  INSTAGRAM_WEBHOOK_QUEUE_NAME,
  async (job: Job<IInstagramWebhookJobData>) => {
    try {
      console.log(
        JSON.stringify({
          event: "processando",
          worker: "InstagramWebhookWorker",
          jobId: job.id,
          data: job.data,
        })
      );

      // Processa o job delegando para a função de automação
      await handleInstagramWebhook(job.data);

      console.log(
        JSON.stringify({
          event: "sucesso",
          worker: "InstagramWebhookWorker",
          jobId: job.id,
          message: "Evento(s) processado(s) com sucesso",
        })
      );
    } catch (error: any) {
      console.error(
        JSON.stringify({
          event: "erro_processamento",
          worker: "InstagramWebhookWorker",
          jobId: job.id,
          error: error.message,
        })
      );
      console.error(error);
      // Propaga o erro para que o BullMQ reprocessa o job conforme configurado
      throw error;
    }
  },
  { connection }
);

// Eventos de monitoramento do BullMQ
instagramWebhookWorker.on("active", (job) => {
  console.log(
    JSON.stringify({
      event: "ativo",
      worker: "InstagramWebhookWorker",
      jobId: job.id,
    })
  );
});

instagramWebhookWorker.on("completed", (job) => {
  console.log(
    JSON.stringify({
      event: "concluido",
      worker: "InstagramWebhookWorker",
      jobId: job.id,
    })
  );
});

instagramWebhookWorker.on("failed", (job, err) => {
  console.error(
    JSON.stringify({
      event: "falhou",
      worker: "InstagramWebhookWorker",
      jobId: job?.id,
      error: err.message,
    })
  );
});

instagramWebhookWorker.on("error", (err) => {
  console.error(
    JSON.stringify({
      event: "erro_worker",
      worker: "InstagramWebhookWorker",
      error: err.message,
    })
  );
  console.error(err);
});

console.log(
  JSON.stringify({
    event: "iniciado",
    worker: "InstagramWebhookWorker",
    fila: INSTAGRAM_WEBHOOK_QUEUE_NAME,
    message: `Iniciado e aguardando jobs na fila ${INSTAGRAM_WEBHOOK_QUEUE_NAME}`,
  })
);
