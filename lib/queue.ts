// lib/queue.ts

import Queue from "bull";

// OBS: A leitura das variáveis de ambiente aqui.
// Se estiver usando Next.js, pode usar process.env normalmente.
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
const REDIS_USE_TLS = process.env.REDIS_USE_TLS === "true";

// Crie a fila 'agendamento'
export const agendamentoQueue = new Queue("agendamento", {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    // Se estiver usando stunnel/SSL/TLS:
    tls: REDIS_USE_TLS ? {} : undefined,
  },
});
