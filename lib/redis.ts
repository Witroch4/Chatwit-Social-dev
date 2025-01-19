//lib/redis.ts

import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 10000, // Aumenta o timeout para 10 segundos
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Se usar TLS:
  tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,
});

redisConnection.on('error', (err) => {
  console.error('Erro na conexão com o Redis:', err);
});

redisConnection.on('connect', () => {
  console.log('Conectado ao Redis com sucesso!');
});

console.log('Configuração de conexão com o Redis:', {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD ? '*****' : undefined,
  useTLS: process.env.REDIS_USE_TLS === 'true',
});

export { redisConnection as connection };
