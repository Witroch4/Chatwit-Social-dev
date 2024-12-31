// lib/redis.ts
import IORedis from 'ioredis';

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,

  // OBRIGATÓRIO para BullMQ + delayed/repeat jobs:
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Se usar TLS:
  // tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,
});

console.log('Configuração de conexão com o Redis:', {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD ? '*****' : undefined, // Evita expor a senha nos logs
  useTLS: process.env.REDIS_USE_TLS === 'true',
});

export { redisConnection as connection };
