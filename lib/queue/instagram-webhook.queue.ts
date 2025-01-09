// lib/queue/instagram-webhook.queue.ts

import { Queue } from 'bullmq';
import { connection } from '@/lib/redis';

/**
 * Nome da fila para os webhooks do Instagram.
 */
export const INSTAGRAM_WEBHOOK_QUEUE_NAME = 'instagram-webhooks';

/**
 * Interface para os dados do job do webhook do Instagram.
 */
export interface IInstagramWebhookJobData {
  object: string;
  entry: any[];
  // Adicione outros campos conforme necessário
}

/**
 * Instância da fila de webhooks do Instagram.
 */
export const instagramWebhookQueue = new Queue<IInstagramWebhookJobData>(
  INSTAGRAM_WEBHOOK_QUEUE_NAME,
  { connection }
);
