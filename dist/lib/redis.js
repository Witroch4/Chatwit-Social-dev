"use strict";
//lib/redis.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connection = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisConnection = new ioredis_1.default({
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
exports.connection = redisConnection;
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
