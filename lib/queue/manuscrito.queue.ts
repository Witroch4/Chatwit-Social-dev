import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';

export const MANUSCRITO_QUEUE_NAME = 'filaManuscrito';

export interface IManuscritoJobData {
  leadID: string;
  textoDAprova: Array<{ output: string }>;
}

export const manuscritoQueue = new Queue<IManuscritoJobData>(
  MANUSCRITO_QUEUE_NAME,
  { connection }
);

export async function addManuscritoJob(data: IManuscritoJobData) {
  await manuscritoQueue.add(
    `manuscrito-${data.leadID}`,
    data,
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );
  console.log(`[BullMQ] Job de manuscrito adicionado para leadID: ${data.leadID}`);
} 