// Configurações para o sistema de atendimento
export const atendimentoConfig = {
  // Token da API do WhatsApp (da variável de ambiente)
  whatsappToken: process.env.WHATSAPP_TOKEN || "EAAGIBII4GXQBO2qgvJ2jdcUmgkdqBo5bUKEanJWmCLpcZAsq0Ovpm4JNlrNLeZAv3OYNrdCqqQBAHfEfPFD0FPnZAOQJURB9GKcbjXeDpa83XdAsa3i6fTr23lBFM2LwUZC23xXrZAnB8QjCCFZBxrxlBvzPj8LsejvUjz0C04Q8Jsl8nTGHUd4ZBRPc4NiHFnc",
  
  // ID da conta de negócios do WhatsApp
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ID || "274633962398273",
  
  // URL da API do WhatsApp
  whatsappApiUrl: `${process.env.FB_GRAPH_API_BASE || "https://graph.facebook.com/v18.0"}/${process.env.WHATSAPP_BUSINESS_ID || "274633962398273"}/messages`,
  
  // Versão da API do WhatsApp
  whatsappApiVersion: (process.env.FB_GRAPH_API_BASE || "https://graph.facebook.com/v18.0").split('/').pop() || "v18.0",
  
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
  
  // Templates mockados para desenvolvimento
  mockTemplates: [
    {
      id: "12345678901234",
      name: "satisfacao_oab",
      status: "APPROVED"
    },
    {
      id: "23456789012345",
      name: "menu_novo",
      status: "APPROVED"
    },
    {
      id: "34567890123456",
      name: "bpc_loas",
      status: "APPROVED"
    },
    {
      id: "45678901234567",
      name: "maternidade_novo",
      status: "APPROVED"
    },
    {
      id: "56789012345678",
      name: "invalidez",
      status: "APPROVED"
    },
    {
      id: "67890123456789",
      name: "auxilio",
      status: "APPROVED"
    },
    {
      id: "78901234567890",
      name: "consulta_juridica",
      status: "APPROVED"
    },
    {
      id: "89012345678901",
      name: "falar_com_atendente",
      status: "APPROVED"
    }
  ],
  
  // ID do usuário administrador (substituir pelo real em produção)
  adminUserId: "admin-user-id",
  
  // Modo de desenvolvimento (para simulações)
  isDevelopment: true,
}; 