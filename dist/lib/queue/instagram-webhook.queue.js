"use strict";
// lib/queue/instagram-webhook.queue.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.instagramWebhookQueue = exports.INSTAGRAM_WEBHOOK_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../lib/redis");
/**
 * Nome da fila para os webhooks do Instagram.
 */
exports.INSTAGRAM_WEBHOOK_QUEUE_NAME = 'instagram-webhooks';
/**
 * Instância da fila de webhooks do Instagram.
 */
exports.instagramWebhookQueue = new bullmq_1.Queue(exports.INSTAGRAM_WEBHOOK_QUEUE_NAME, { connection: redis_1.connection });
