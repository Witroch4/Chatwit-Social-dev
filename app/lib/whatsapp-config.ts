import prisma from '@/lib/prisma';

/**
 * Obtém as configurações ativas do WhatsApp para um usuário
 * Retorna as configurações do banco de dados ou utiliza os valores de fallback do .env
 */
export async function getWhatsAppConfig(userId?: string) {
  let config;
  
  // Se temos um userId, tentamos obter configuração personalizada do banco
  if (userId) {
    config = await prisma.whatsAppConfig.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }
  
  // Se não encontrarmos configuração no banco, usamos valores do .env
  if (!config) {
    return {
      whatsappToken: process.env.WHATSAPP_TOKEN || '',
      whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ID || '',
      fbGraphApiBase: 'https://graph.facebook.com/v22.0', // Forçar versão v22.0
      isFromEnv: true
    };
  }
  
  // Forçamos a versão v22.0 mesmo para configurações do banco
  return {
    whatsappToken: config.whatsappToken,
    whatsappBusinessAccountId: config.whatsappBusinessAccountId,
    fbGraphApiBase: 'https://graph.facebook.com/v22.0', // Forçar versão v22.0
    isFromEnv: false
  };
}

/**
 * Monta a URL para a API do WhatsApp para envio de mensagens
 */
export function getWhatsAppApiUrl(config: { fbGraphApiBase: string, whatsappBusinessAccountId: string }) {
  return `${config.fbGraphApiBase}/${config.whatsappBusinessAccountId}/messages`;
}

/**
 * Monta a URL para a API do WhatsApp para templates
 */
export function getWhatsAppTemplatesUrl(config: { fbGraphApiBase: string, whatsappBusinessAccountId: string }) {
  return `${config.fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates`;
}

/**
 * Obtém a versão da API do Facebook a partir da URL base
 */
export function getApiVersion(fbGraphApiBase: string) {
  const version = fbGraphApiBase.split('/').pop();
  return version || 'v22.0';
} 