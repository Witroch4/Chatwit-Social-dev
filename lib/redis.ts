//lib/redis.ts

import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Variável para controlar se já exibimos a configuração
let configLogged = false;

// Função para exibir a configuração apenas uma vez
function logRedisConfig() {
  if (!configLogged) {
    console.log('Configuração de conexão com o Redis:', {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD ? '*****' : undefined,
      useTLS: process.env.REDIS_USE_TLS === 'true',
    });
    configLogged = true;
  }
}

// Criação de uma única instância de conexão Redis
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '188.245.200.61',
  port: parseInt(process.env.REDIS_PORT || '6380', 10),
  password: process.env.REDIS_PASSWORD || 'WIt2357111317',
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

// Variável para controlar se já exibimos a mensagem de conexão
let connectionLogged = false;

redisConnection.on('error', (err) => {
  console.error('Erro na conexão com o Redis:', err);
});

redisConnection.on('connect', () => {
  if (!connectionLogged) {
    console.log('Conectado ao Redis com sucesso!');
    connectionLogged = true;
  }
});

// Exibe a configuração apenas uma vez
logRedisConfig();

export { redisConnection as connection };
