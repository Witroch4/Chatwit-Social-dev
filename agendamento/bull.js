//agendamento/bull.js


const Queue = require('bull');
require('dotenv').config(); // Certifique-se de carregar as variáveis de ambiente

// Cria a fila 'agendamento'
const agendamentoQueue = new Queue('agendamento', {
  redis: {
    host: process.env.REDIS_HOST || '188.245.200.61',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || 'WIt2357111317',
    tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined, // Configura TLS se necessário
  },
});

module.exports = agendamentoQueue;
