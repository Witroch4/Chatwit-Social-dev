import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';
import { WebhookPayload } from '@/types/webhook';   // mesmo tipo usado na rota

export const LEADS_QUEUE_NAME = 'filaLeadsChatwit';

export interface ILeadJobData {
  payload: WebhookPayload;        // o payload bruto recebido do Chatwit
}

export const leadsQueue = new Queue<ILeadJobData>(
  LEADS_QUEUE_NAME,
  { connection }
);

export async function addLeadJob(data: ILeadJobData) {
  await leadsQueue.add(
    `lead-${data.payload.origemLead.source_id}`,
    data,
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: 10_000,
      removeOnFail: 5_000
    }
  );
  console.log(`[BullMQ] Job enfileirado para lead ${data.payload.origemLead.source_id}`);
}
