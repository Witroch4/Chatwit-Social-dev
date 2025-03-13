import { initAgendamentoWorker } from './agendamento.worker';
import { initializeExistingAgendamentos } from '@/lib/scheduler-bullmq';
import { initJobs } from './agendamento.worker';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Inicializa todos os workers e agendamentos existentes
 */
export async function initializeWorkers() {
  try {
    console.log('[Worker] Inicializando workers...');

    // Inicializa o worker de agendamento (agora é feito no bull-board-server.ts)
    // await initAgendamentoWorker();

    // Inicializa os jobs recorrentes (apenas uma vez)
    await initJobs();

    // Inicializa os agendamentos existentes
    const result = await initializeExistingAgendamentos();

    console.log(`[Worker] Workers inicializados com sucesso. ${result.count} agendamentos carregados.`);

    return { success: true, count: result.count };
  } catch (error) {
    console.error('[Worker] Erro ao inicializar workers:', error);
    return { success: false, error };
  }
}

// Se este arquivo for executado diretamente (não importado)
if (require.main === module) {
  initializeWorkers()
    .then(() => {
      console.log('[Worker] Inicialização concluída.');
    })
    .catch((error) => {
      console.error('[Worker] Erro na inicialização:', error);
      process.exit(1);
    });
}