// bull-board-server.ts

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { agendamentoQueue } from './lib/queue/agendamento.queue';
import { instagramWebhookQueue, autoNotificationsQueue } from './lib/queue/instagram-webhook.queue';
import { followUpQueue } from './worker/queues/followUpQueue';
import { manuscritoQueue } from './lib/queue/manuscrito.queue';
import { initializeWorkers } from './worker/init';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Registra todas as filas no Bull Board
const bullBoard = createBullBoard({
  queues: [
    // @ts-ignore - Ignorando erro de tipos devido à incompatibilidade entre versões
    new BullMQAdapter(agendamentoQueue),
    // @ts-ignore - Ignorando erro de tipos devido à incompatibilidade entre versões
    new BullMQAdapter(instagramWebhookQueue),
    // @ts-ignore - Ignorando erro de tipos devido à incompatibilidade entre versões
    new BullMQAdapter(autoNotificationsQueue),
    // @ts-ignore - Ignorando erro de tipos devido à incompatibilidade entre versões
    new BullMQAdapter(followUpQueue),
    // @ts-ignore - Ignorando erro de tipos devido à incompatibilidade entre versões
    new BullMQAdapter(manuscritoQueue)
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

const PORT = process.env.BULL_BOARD_PORT || 3005;

// Inicializa os workers e agendamentos existentes de forma centralizada
async function initializeAllWorkers() {
  console.log('[BullBoard] Iniciando inicialização centralizada dos workers...');

  try {
    // Inicializa o worker de agendamento diretamente
    // await initAgendamentoWorker();

    // Inicializa os agendamentos existentes e outros workers
    const result = await initializeWorkers();

    console.log('[BullBoard] Todos os workers inicializados com sucesso');
    return result;
  } catch (error) {
    console.error('[BullBoard] Erro ao inicializar workers:', error);
    throw error;
  }
}

// Inicializa os workers e depois inicia o servidor
initializeAllWorkers()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Bull Board rodando em http://localhost:${PORT}/admin/queues`);
    });
  })
  .catch((error) => {
    console.error('[BullBoard] Erro crítico na inicialização:', error);
    process.exit(1);
  });
