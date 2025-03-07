// worker/agendamento.worker.ts

import { Worker, JobScheduler, Job } from 'bullmq';
import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { connection } from '@/lib/redis';
import { processarAgendamentosPendentes } from '@/lib/scheduler-bullmq';
import { IAgendamentoJobData } from '@/lib/queue/agendamento.queue';

dotenv.config();

// Corrigir a URL do webhook (garantir que o protocolo esteja correto)
let webhookUrl = process.env.WEBHOOK_URL || 'https://autofluxofilaapi.witdev.com.br/webhook/5f439037-6e1a-4d53-80ae-1cc0c4633c51';

// Garantir que a URL começa com 'https://' (corrigir 'https://')
if (webhookUrl.startsWith('https://')) {
  webhookUrl = 'https://' + webhookUrl.substring(8);
  console.log('[BullMQ] URL do webhook corrigida:', webhookUrl);
}

const WEBHOOK_URL = webhookUrl;
const AGENDAMENTO_QUEUE_NAME = 'agendamento';

/**
 * Inicializa o JobScheduler (usado para jobs atrasados, re-tentativas, etc.)
 */
const jobScheduler = new JobScheduler(AGENDAMENTO_QUEUE_NAME, {
  connection,
});

/**
 * Cria o Worker que processa a fila 'agendamento'
 */
const worker = new Worker<IAgendamentoJobData>(
  AGENDAMENTO_QUEUE_NAME,
  async (job: Job<IAgendamentoJobData>) => {
    try {
      const { baserowId, Data, userID } = job.data;
      console.log(`[BullMQ] Processando job baserowId=${baserowId} às ${new Date().toISOString()}`);

      // Exemplo de envio de webhook
      await axios.post(WEBHOOK_URL, {
        baserowId,
        dataAgendada: Data,
        userID,
      });

      console.log(`[BullMQ] Webhook disparado com sucesso para baserowId=${baserowId}.`);
    } catch (error: any) {
      console.error(`[BullMQ] Erro ao processar job baserowId=${job.data.baserowId}: ${error.message}`);
      throw error; // Lança o erro para o BullMQ marcar o job como "failed"
    }
  },
  { connection }
);

// Eventos de debug do Worker
worker.on('active', (job) => {
  console.log(`[BullMQ Worker] Job ativo: baserowId=${job.data.baserowId}`);
});

worker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Job concluído: baserowId=${job.data.baserowId}`);
});

worker.on('failed', (job, err) => {
  console.error(`[BullMQ Worker] Job falhou: baserowId=${job?.data.baserowId}, Erro: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[BullMQ Worker] Erro no worker:', err);
});

console.log('[BullMQ Worker] Iniciado e aguardando jobs na fila "agendamento"...');

// Cron para processar agendamentos pendentes 1 vez por dia (ex.: meia-noite)
cron.schedule('0 0 * * *', async () => {
  console.log('[BullMQ Worker] Executando tarefa diária de processamento de agendamentos pendentes...');
  await processarAgendamentosPendentes();
});
