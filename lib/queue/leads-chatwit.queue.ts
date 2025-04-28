import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';
import { WebhookPayload } from '@/types/webhook';   // mesmo tipo usado na rota

export const LEADS_QUEUE_NAME = 'filaLeadsChatwit';

export interface ILeadJobData {
  payload: WebhookPayload;        // o payload bruto recebido do Chatwit
}

export const leadsQueue = new Queue<ILeadJobData>(
  LEADS_QUEUE_NAME,
  { 
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: 10_000,
      removeOnFail: 5_000
    }
  }
);

export async function addLeadJob(data: ILeadJobData) {
  const sourceId = data.payload.origemLead.source_id;
  
  // Use o sourceId como nome do job para facilitar o rastreamento
  await leadsQueue.add(
    `lead-${sourceId}`,
    data,
    {
      // Não define novas opções aqui para usar as padrões,
      // evitando sobrescrever os valores definidos acima
    }
  );
  console.log(`[BullMQ] Job enfileirado para lead ${sourceId}`);
}
