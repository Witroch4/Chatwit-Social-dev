import { NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/auth';
import { getWhatsAppConfig } from '@/app/lib';
import { atendimentoConfig } from '@/app/config/atendimento';

// Exemplo de templates predefinidos para demonstração
// Isso evita a necessidade de uma API key válida do WhatsApp
const mockTemplates = [
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
];

// Função para obter templates do WhatsApp
// Em produção, você usaria esta função com credenciais válidas
async function getWhatsAppTemplates(useReal = false) {
  // Se estamos em modo de demonstração, retorne os templates mockados
  if (!useReal) {
    return atendimentoConfig.mockTemplates;
  }
  
  try {
    // Obtém a sessão do usuário
    const session = await auth();
    if (!session?.user) {
      throw new Error('Usuário não autenticado');
    }
    
    // Obtém as configurações do WhatsApp
    const config = await getWhatsAppConfig(session.user.id);
    
    // Configuração para a API do WhatsApp
    const url = `${config.fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates?fields=name,status&limit=1000`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      }
    });

    // Filtra apenas templates ativos/aprovados
    const templates = response.data.data.filter(
      (template: any) => template.status === 'APPROVED'
    );

    return templates;
  } catch (error) {
    console.error('Erro ao buscar templates do WhatsApp:', error);
    // Em caso de erro, retornamos templates mockados como fallback
    return atendimentoConfig.mockTemplates;
  }
}

// Endpoint GET para obter templates
export async function GET() {
  try {
    // Obtém a sessão do usuário
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Usamos o modo de desenvolvimento da configuração
    const templates = await getWhatsAppTemplates(!atendimentoConfig.isDevelopment);
    
    return NextResponse.json({
      success: true,
      templates: templates.map((template: any) => ({
        id: template.id,
        name: template.name,
        status: template.status
      }))
    });
  } catch (error) {
    console.error('Erro ao obter templates:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao obter templates', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 