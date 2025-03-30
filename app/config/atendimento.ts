// Configurações para o sistema de atendimento
export const atendimentoConfig = {
  // Token da API do WhatsApp (da variável de ambiente)
  // ID do App: 431027922671988 - API ZAP WIT
  // User ID: 122105475986262788
  // Token com permissões: whatsapp_business_management, whatsapp_business_messaging
  whatsappToken: process.env.WHATSAPP_TOKEN || "",
  
  // ID da conta de negócios do WhatsApp
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ID || "294585820394901",
  
  // URL da API do WhatsApp
  whatsappApiUrl: `${process.env.FB_GRAPH_API_BASE || "https://graph.facebook.com/v22.0"}/${process.env.WHATSAPP_BUSINESS_ID || "294585820394901"}`,
  
  // Versão da API do WhatsApp
  whatsappApiVersion: "v22.0",
  
  // API App ID do WhatsApp
  whatsappAppId: "431027922671988",
  
  // Configurações padrão
  defaultConfig: {
    // Valores padrão
    valorLote1: "R$ 287,90",
    valorLote2: "R$ 287,90",
    valorAnalise: "R$ 27,90",
    
    // Datas padrão (formato Brasil)
    comecoLote1: "13/03/2025 as 15:00",
    comecoLote2: "13/03/2025 as 15:00",
    fim: "sábado as 5:00 da tarde",
    
    // Chave PIX
    chavePix: "atendimento@amandasousaprev.adv.br",
  },
  
  // Templates mockados para desenvolvimento - removidos para usar apenas dados reais
  mockTemplates: [],
  
  // ID do usuário administrador (substituir pelo real em produção)
  adminUserId: "admin-user-id",
  
  // Modo de desenvolvimento - forçando uso de dados reais
  isDevelopment: false,
  useRealData: true,
}; 