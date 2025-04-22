/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing code ...
  
  // Increase the allowed body size for API routes to handle file uploads
  api: {
    bodyParser: {
      sizeLimit: '25mb', // Limit to 25MB as per OpenAI's file size limit
    },
    responseLimit: '30mb', // Increase response limit as well
  },
  
  // Increase the serverless function execution timeout
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  
  // Enable CORS for API routes
  async headers() {
    return [
      {
        source: '/api/chatwitia/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  
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