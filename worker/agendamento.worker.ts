// worker/agendamento.worker.ts

import { Worker, Job } from 'bullmq';
import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { connection } from '@/lib/redis';
import { processarAgendamentosPendentes } from '@/lib/scheduler-bullmq';
import { IAgendamentoJobData } from '@/lib/queue/agendamento.queue';
import {
  AUTO_NOTIFICATIONS_QUEUE_NAME,
  IAutoNotificationJobData,
  AutoNotificationType,
  addCheckExpiringTokensJob
} from '@/lib/queue/instagram-webhook.queue';
import { PrismaClient } from '@prisma/client';
import { prepareWebhookData } from '@/lib/agendamento.service';

dotenv.config();
const prisma = new PrismaClient();

// Configuração da URL do webhook
let webhookUrl = process.env.WEBHOOK_URL || 'https://autofluxofilaapi.witdev.com.br/webhook/5f439037-6e1a-4d53-80ae-1cc0c4633c51';

// Garantir que a URL começa com 'https://'
if (webhookUrl.startsWith('https://')) {
  webhookUrl = 'https://' + webhookUrl.substring(8);
  console.log('[BullMQ] URL do webhook corrigida:', webhookUrl);
}

// Configuração do worker para processar os jobs de agendamento
const agendamentoWorker = new Worker<IAgendamentoJobData>(
  'agendamento',
  async (job) => {
    console.log(`[BullMQ] Processando job de agendamento: ${job.id}`);
    console.log(`[BullMQ] Dados do job:`, job.data);

    try {
      // Usamos o campo baserowId para extrair o ID do agendamento
      // No novo formato, o baserowId contém o ID do agendamento
      const agendamentoId = job.data.baserowId.split('-').pop() || '';

      // Prepara os dados para o webhook
      const webhookData = await prepareWebhookData(agendamentoId);

      // Envia o webhook
      const webhookResponse = await axios.post(webhookUrl, webhookData, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[BullMQ] Webhook enviado com sucesso para o agendamento ${agendamentoId}. Resposta: ${webhookResponse.status}`);

      // Se for um agendamento diário, reagenda para o próximo dia
      if (job.data.Diario) {
        // Calcula a data para o próximo dia (mantém o mesmo horário)
        const jobDate = new Date(job.data.Data);
        const nextDay = new Date(jobDate);
        nextDay.setDate(nextDay.getDate() + 1);

        console.log(`[BullMQ] Reagendando job diário para: ${nextDay.toISOString()}`);

        // Atualiza o agendamento no banco de dados, se necessário
        // Isso pode ser útil para rastrear quando foi a última execução

        // Agenda o próximo job
        const nextJobData = {
          ...job.data,
          Data: nextDay.toISOString(),
        };

        // Aqui você implementaria a lógica para reagendar o job
        // Isso depende da sua implementação específica do BullMQ
      }

      return { success: true, message: 'Agendamento processado com sucesso' };
    } catch (error: any) {
      console.error(`[BullMQ] Erro ao processar job de agendamento: ${error.message}`);
      throw error;
    }
  },
  { connection }
);

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
async function initJobs() {
  try {
    console.log('[BullMQ] Inicializando jobs recorrentes...');

    // Processa agendamentos pendentes a cada minuto
    cron.schedule('* * * * *', async () => {
      try {
        await processarAgendamentosPendentes();
      } catch (error) {
        console.error('[BullMQ] Erro ao processar agendamentos pendentes:', error);
      }
    });

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

// Inicializa os jobs recorrentes
initJobs().catch(console.error);

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
