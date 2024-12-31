// bull-board-server.ts

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { agendamentoQueue } from './lib/queue/agendamento.queue'; // Ajuste o caminho conforme necessário
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(agendamentoQueue)],
  serverAdapter,
});



app.use('/admin/queues', serverAdapter.getRouter());

const PORT = process.env.BULL_BOARD_PORT || 3005;

app.listen(PORT, () => {
  console.log(`Bull Board rodando em http://localhost:${PORT}/admin/queues`);
});
