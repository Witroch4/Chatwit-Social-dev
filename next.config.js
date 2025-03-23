/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing code ...
  
  // Garantir que as variáveis de ambiente corretas estão sendo carregadas
  // O Next.js carrega automaticamente .env, .env.local, .env.development em desenvolvimento
  // e .env, .env.local, .env.production em produção
  
  // Adicionar quaisquer variáveis de ambiente públicas que precisem ser expostas ao cliente
  env: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_INSTAGRAM_APP_ID: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID,
    NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  
  // ... existing code ...
};

module.exports = nextConfig; 