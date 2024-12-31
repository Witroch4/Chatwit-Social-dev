// worker/agendamento.worker.ts

import { Worker, JobScheduler, Job } from 'bullmq';
import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { connection } from '@/lib/redis';
import { processarAgendamentosPendentes } from '@/lib/scheduler-bullmq';
import { IAgendamentoJobData } from '@/lib/queue/agendamento.queue'; // Importação correta

dotenv.config();

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://autofluxofilaapi.witdev.com.br/...';
const AGENDAMENTO_QUEUE_NAME = 'agendamento';

/**
 * Inicializar o JobScheduler (necessário para jobs atrasados e re-tentativas)
 */
const jobScheduler = new JobScheduler(AGENDAMENTO_QUEUE_NAME, {
  connection,
});

/**
 * Criar o Worker que processa a fila 'agendamento'
 */
const worker = new Worker<IAgendamentoJobData>(
  AGENDAMENTO_QUEUE_NAME,
  async (job: Job<IAgendamentoJobData>) => {
    try {
      const { baserowId, Data, userID } = job.data;
      console.log(`[BullMQ] Processando job baserowId=${baserowId} às ${new Date().toISOString()}`);

      // Exemplo de envio de webhook
      await axios.post(WEBHOOK_URL, {
        baserowId: baserowId,
        dataAgendada: Data,
        userID: userID,
      });

      console.log(`[BullMQ] Webhook disparado com sucesso para baserowId=${baserowId}.`);
    } catch (error: any) {
      console.error(`[BullMQ] Erro ao processar job baserowId=${job.data.baserowId}: ${error.message}`);
      // Lançar o erro faz o BullMQ marcar o job como failed
      throw error;
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

// Cron para processar agendamentos pendentes (1x ao dia)
cron.schedule('0 0 * * *', async () => {
  console.log('[BullMQ Worker] Executando tarefa diária de processamento de agendamentos pendentes...');
  await processarAgendamentosPendentes();
});
