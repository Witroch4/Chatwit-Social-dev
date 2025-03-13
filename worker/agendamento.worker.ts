// worker/agendamento.worker.ts

import { Worker, Job } from 'bullmq';
import axios from 'axios';
import dotenv from 'dotenv';
import { connection } from '@/lib/redis';
import { prepareWebhookData } from '@/lib/agendamento.service';
import { scheduleAgendamentoJob, IAgendamentoJobData } from '@/lib/queue/agendamento.queue';
import { prisma } from '@/lib/prisma';
import {
  AUTO_NOTIFICATIONS_QUEUE_NAME,
  IAutoNotificationJobData,
  AutoNotificationType,
  addCheckExpiringTokensJob
} from '@/lib/queue/instagram-webhook.queue';
import { Worker as BullMQWorker } from 'bullmq';
import cron from 'node-cron';

dotenv.config();

const webhookUrl = process.env.WEBHOOK_URL || 'https://default-webhook-url.com';

// Criação do worker de agendamento
const agendamentoWorker = new Worker(
  'agendamento',
  async (job: Job<IAgendamentoJobData>) => {
    console.log(`[BullMQ] Processando job de agendamento: ${job.id}`);
    console.log(`[BullMQ] Dados do job:`, job.data);

    // Extrai o ID do agendamento a partir do baserowId
    const agendamentoId = job.data.baserowId.split('-').pop() || '';

    try {
      // Verifica se o agendamento ainda existe no banco
      const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId },
      });

      if (!agendamento) {
        console.log(`[BullMQ] Agendamento ${agendamentoId} não encontrado no banco de dados. Job cancelado.`);
        return { success: false, message: 'Agendamento não encontrado' };
      }

      // Prepara os dados para o webhook
      const webhookData = await prepareWebhookData(agendamentoId);

      // Envia o webhook
      const response = await axios.post(webhookUrl, webhookData, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[BullMQ] Webhook enviado com sucesso para o agendamento ${agendamentoId}. Resposta: ${response.status}`);

      // Se for um agendamento diário, agenda o próximo job para o dia seguinte
      if (job.data.Diario) {
        const jobDate = new Date(job.data.Data);
        const nextDay = new Date(jobDate);
        nextDay.setDate(nextDay.getDate() + 1);

        console.log(`[BullMQ] Reagendando job diário para: ${nextDay.toISOString()}`);

        // Agenda o próximo job utilizando a função de agendamento com delay
        await scheduleAgendamentoJob({
          id: agendamentoId,
          Data: nextDay,
          userId: job.data.userID,
          accountId: job.data.accountId,
          Diario: true,
        });
      }

      return { success: true, message: 'Agendamento processado com sucesso' };
    } catch (error: any) {
      console.error(`[BullMQ] Erro ao processar job de agendamento: ${error.message}`);
      throw error;
    }
  },
  { connection }
);

// Tratamento de eventos do worker
agendamentoWorker.on('completed', (job) => {
  console.log(`[BullMQ] Job ${job.id} concluído com sucesso`);
});

agendamentoWorker.on('failed', (job, error) => {
  console.error(`[BullMQ] Job ${job?.id} falhou: ${error.message}`);
});

export async function initAgendamentoWorker() {
  console.log('[BullMQ] Worker de agendamento iniciado');
  return agendamentoWorker;
}

// Exporta o worker para ser usado em outros lugares
export { agendamentoWorker };

// Worker para processar notificações automáticas
const autoNotificationsWorker = new Worker<IAutoNotificationJobData>(
  AUTO_NOTIFICATIONS_QUEUE_NAME,
  async (job) => {
    console.log(`[BullMQ] Processando job de notificação automática: ${job.id}`);

    try {
      const { type } = job.data;

      switch (type) {
        case AutoNotificationType.EXPIRING_TOKENS:
          await handleExpiringTokensNotification(job.data);
          break;
        default:
          console.warn(`[BullMQ] Tipo de notificação desconhecido: ${type}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`[BullMQ] Erro ao processar notificação automática: ${error.message}`);
      throw error;
    }
  },
  { connection }
);

/**
 * Processa notificações de tokens expirando
 */
async function handleExpiringTokensNotification(data: IAutoNotificationJobData) {
  try {
    console.log('[BullMQ] Verificando tokens expirando...');

    // Busca contas com tokens expirando nos próximos 7 dias
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringAccounts = await prisma.account.findMany({
      where: {
        expires_at: {
          not: null,
          lte: Math.floor(sevenDaysFromNow.getTime() / 1000),
          gt: Math.floor(Date.now() / 1000),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`[BullMQ] Encontradas ${expiringAccounts.length} contas com tokens expirando.`);

    // Processa cada conta
    for (const account of expiringAccounts) {
      // Calcula dias restantes
      const expiresAt = account.expires_at ? new Date(account.expires_at * 1000) : null;
      if (!expiresAt) continue;

      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Cria notificação para o usuário
      await prisma.notification.create({
        data: {
          userId: account.userId,
          title: 'Token de Acesso Expirando',
          message: `Seu token de acesso para ${account.provider} expirará em ${daysRemaining} dias. Por favor, reconecte sua conta para evitar interrupções.`,
          isRead: false,
        },
      });

      console.log(`[BullMQ] Notificação criada para o usuário ${account.userId} sobre token expirando em ${daysRemaining} dias.`);
    }

    return { success: true, count: expiringAccounts.length };
  } catch (error: any) {
    console.error('[BullMQ] Erro ao processar notificação de tokens expirando:', error);
    throw error;
  }
}

/**
 * Inicializa os jobs recorrentes
 */
export async function initJobs() {
  try {
    console.log('[BullMQ] Inicializando jobs recorrentes...');

    // Verifica tokens expirando diariamente às 8h
    cron.schedule('0 8 * * *', async () => {
      try {
        await addCheckExpiringTokensJob();
      } catch (error) {
        console.error('[BullMQ] Erro ao agendar verificação de tokens expirando:', error);
      }
    });

    console.log('[BullMQ] Jobs recorrentes inicializados com sucesso.');
  } catch (error) {
    console.error('[BullMQ] Erro ao inicializar jobs recorrentes:', error);
  }
}

// Removida a inicialização automática dos jobs recorrentes
// initJobs().catch(console.error);

// Tratamento de encerramento gracioso
process.on('SIGTERM', async () => {
  console.log('Encerrando workers...');
  await agendamentoWorker.close();
  await autoNotificationsWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Encerrando workers...');
  await agendamentoWorker.close();
  await autoNotificationsWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
