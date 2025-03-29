import { NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/auth';
import { getWhatsAppConfig } from '@/app/lib';
import { atendimentoConfig } from '@/app/config/atendimento';

// Definição da interface para o tipo de template detalhado
interface TemplateDetailComponent {
  tipo: string;
  formato?: string;
  texto?: string;
  variaveis: false | { nome: string; descricao: string; exemplo: string; }[];
  botoes?: { tipo: string; texto: string; url: string | null; telefone: string | null; }[];
}

interface TemplateDetail {
  nome: string;
  categoria: string;
  status?: string;
  idioma?: string;
  componentes: TemplateDetailComponent[];
}

// Função para obter detalhes de templates do WhatsApp
async function getTemplateDetails(templateName: string) {
  if (!templateName) {
    throw new Error('Nome do template não informado');
  }
  
  try {
    // Usar configurações diretamente das variáveis de ambiente
    const config = {
      fbGraphApiBase: "https://graph.facebook.com/v18.0", // Forçar versão v18.0
      whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ID || "",
      whatsappToken: process.env.WHATSAPP_TOKEN || atendimentoConfig.whatsappToken
    };
    
    // Verificar se temos credenciais válidas
    if (!config.whatsappBusinessAccountId || !config.whatsappToken) {
      throw new Error('Credenciais da API do WhatsApp não configuradas');
    }
    
    // Configuração para a API do WhatsApp
    const url = `${config.fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates?fields=name,components,category,language,status&name=${templateName}`;
    
    console.log("Buscando detalhes do template:", templateName);
    console.log("URL da requisição:", url);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      }
    });

    // Verificamos se temos dados
    if (!response.data.data || response.data.data.length === 0) {
      console.error('Template não encontrado:', templateName);
      throw new Error(`Template "${templateName}" não encontrado na API do WhatsApp`);
    }

    // Processamos a resposta para um formato mais amigável
    const template = response.data.data[0];
    const processedTemplate: TemplateDetail = {
      nome: template.name,
      categoria: template.category,
      status: template.status,
      idioma: template.language,
      componentes: template.components.map((comp: any) => {
        // Processamos com base no tipo de componente
        if (comp.type === 'HEADER') {
          return {
            tipo: comp.type,
            formato: comp.format, // TEXT, IMAGE, VIDEO, DOCUMENT
            variaveis: comp.format === 'TEXT' && comp.text ? extractVariables(comp.text) : false
          };
        } else if (comp.type === 'BODY') {
          return {
            tipo: comp.type,
            texto: comp.text,
            variaveis: extractVariables(comp.text)
          };
        } else if (comp.type === 'FOOTER') {
          return {
            tipo: comp.type,
            texto: comp.text,
            variaveis: false
          };
        } else if (comp.type === 'BUTTONS') {
          return {
            tipo: comp.type,
            variaveis: false,
            botoes: comp.buttons.map((btn: any) => ({
              tipo: btn.type,
              texto: btn.text,
              url: btn.url || null,
              telefone: btn.phone_number || null
            }))
          };
        }
        return {
          tipo: comp.type,
          variaveis: false
        };
      })
    };
    
    return processedTemplate;
  } catch (error) {
    console.error('Erro ao buscar detalhes do template:', error);
    throw error;
  }
}

// Função para extrair variáveis de um texto de template
function extractVariables(text: string) {
  if (!text) return false;
  
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return false;
  
  return matches.map(match => {
    const varNumber = match.replace('{{', '').replace('}}', '');
    return {
      nome: varNumber,
      descricao: `Variável ${varNumber}`,
      exemplo: `Valor${varNumber}`
    };
  });
}

// Endpoint GET para obter detalhes de um template específico
export async function GET(request: Request) {
  try {
    // Obtém parâmetros da URL
    const url = new URL(request.url);
    const templateName = url.searchParams.get('template');
    
    // Obter a sessão do usuário em produção
    // Comentado temporariamente para facilitar testes
    /*
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    */
    
    if (!templateName) {
      return NextResponse.json({ error: 'Nome do template não informado' }, { status: 400 });
    }
    
    // Sempre busca detalhes reais da API do WhatsApp
    const templateDetails = await getTemplateDetails(templateName);
    
    return NextResponse.json({
      success: true,
      template: templateDetails,
      isRealData: true
    });
  } catch (error) {
    console.error('Erro ao obter detalhes do template:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao obter detalhes do template', 
        details: (error as Error).message,
        isRealData: true
      },
      { status: 500 }
    );
  }
} 