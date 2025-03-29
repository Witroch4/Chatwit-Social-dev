// Exportar funções do módulo de configurações do WhatsApp
export * from './whatsapp-config';

// Exportar outras funções conforme necessário
export { default as prisma } from '@/lib/prisma';

// Exportar funções úteis da lib
import { getWhatsAppConfig, getWhatsAppApiUrl, getWhatsAppTemplatesUrl, getApiVersion } from './whatsapp-config';

export {
  getWhatsAppConfig,
  getWhatsAppApiUrl,
  getWhatsAppTemplatesUrl,
  getApiVersion
}; 