// app/api/admin/atendimento/templates/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/auth';
import { atendimentoConfig } from '@/app/config/atendimento';

/**
 * Função auxiliar para obter as configurações da API do WhatsApp
 */
function getWhatsAppApiConfig() {
  return {
    fbGraphApiBase:
      process.env.FB_GRAPH_API_BASE || 'https://graph.facebook.com/v18.0',
    whatsappBusinessAccountId:
      process.env.WHATSAPP_BUSINESS_ID || '431027922671988',
    whatsappToken:
      process.env.WHATSAPP_TOKEN || atendimentoConfig.whatsappToken,
  };
}

/**
 * Função para buscar os templates do WhatsApp com paginação
 */
async function getWhatsAppTemplates() {
  try {
    const config = getWhatsAppApiConfig();

    // Forçar uso da versão v18.0 da API
    const fbGraphApiBase = 'https://graph.facebook.com/v18.0';
    
    console.log('Usando configurações da API:', {
      fbGraphApiBase: fbGraphApiBase,
      whatsappBusinessAccountId: config.whatsappBusinessAccountId,
      // Por segurança, não exibimos o token completo
      tokenLength: config.whatsappToken?.length,
    });

    if (!config.whatsappBusinessAccountId || !config.whatsappToken) {
      throw new Error(
        'Credenciais da API do WhatsApp não configuradas. Configure WHATSAPP_BUSINESS_ID e WHATSAPP_TOKEN no arquivo .env.development'
      );
    }

    // URL para buscar os templates
    const url = `${fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates?fields=name,status,category,language,components&limit=1000`;
    console.log('Fazendo requisição para:', url);

    const headers = {
      Authorization: `Bearer ${config.whatsappToken}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(url, { headers });

    if (!response.data || !response.data.data) {
      console.error(
        'Resposta da API do WhatsApp não contém dados esperados:',
        response.data
      );
      throw new Error('Resposta da API não contém dados esperados');
    }

    // Processa paginação se existir
    let templates = response.data.data;
    let nextPage = response.data.paging?.next;
    let pageCount = 1;
    const maxPages = 5;

    while (nextPage && pageCount < maxPages) {
      console.log(`Buscando próxima página de templates: ${pageCount + 1}`);
      const nextPageResponse = await axios.get(nextPage, { headers });
      if (nextPageResponse.data && nextPageResponse.data.data) {
        templates = [...templates, ...nextPageResponse.data.data];
        nextPage = nextPageResponse.data.paging?.next;
        pageCount++;
      } else {
        break;
      }
    }

    // Filtra apenas templates com status APPROVED e normaliza os dados
    const processedTemplates = templates
      .filter((template: any) => template.status === 'APPROVED')
      .map((template: any) => ({
        id: template.id,
        name: template.name,
        status: template.status,
        category: template.category || 'UTILITY',
        language: template.language || 'pt_BR',
        components: template.components || [],
      }));

    console.log(
      `Obtidos ${processedTemplates.length} templates reais aprovados`
    );
    return { templates: processedTemplates, real: true };
  } catch (error: any) {
    if (error.response) {
      console.error('Erro da API do WhatsApp:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        error: error.response.data?.error,
      });

      if (error.response.data?.error) {
        const metaError = error.response.data.error;
        throw new Error(
          `Erro da API Meta: [${metaError.code}] ${metaError.message}. Verifique se o token possui a permissão whatsapp_business_management.`
        );
      }
    }
    console.error('Erro ao buscar templates do WhatsApp:', error);
    throw error;
  }
}

/**
 * GET /api/admin/atendimento/templates
 * Retorna os templates do WhatsApp, podendo filtrar por category e language via query params.
 */
export async function GET(request: Request) {
  try {
    // Em produção, ative a autenticação
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const language = searchParams.get('language');

    const { templates } = await getWhatsAppTemplates();

    // Filtra templates por categoria e idioma se informados
    let filteredTemplates = templates;
    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(
        (template: any) =>
          template.category?.toUpperCase() === category.toUpperCase()
      );
    }
    if (language && language !== 'all') {
      filteredTemplates = filteredTemplates.filter(
        (template: any) =>
          template.language?.toLowerCase() === language.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      templates: filteredTemplates.map((template: any) => ({
        id: template.id,
        name: template.name,
        status: template.status,
        category: template.category,
        language: template.language,
      })),
      isRealData: true,
    });
  } catch (error: any) {
    console.error('Erro ao obter templates:', error);
    return NextResponse.json(
      {
        error: 'Erro ao obter templates do WhatsApp',
        details: error.message,
        isRealData: true,
        instructions:
          'Verifique se as variáveis de ambiente WHATSAPP_BUSINESS_ID e WHATSAPP_TOKEN estão configuradas e se o token possui a permissão whatsapp_business_management.',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/atendimento/templates
 * Cria um novo template.
 * Corpo esperado:
 * {
 *   "name": "nome_do_template",
 *   "category": "UTILITY|MARKETING|AUTHENTICATION",
 *   "language": "pt_BR|en_US|...",
 *   "components": [ ... ],
 *   "allow_category_change": true (opcional)
 * }
 */
export async function POST(request: Request) {
  try {
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    // }

    const config = getWhatsAppApiConfig();
    // Forçar uso da versão v18.0 da API
    const fbGraphApiBase = 'https://graph.facebook.com/v18.0';
    
    if (!config.whatsappBusinessAccountId || !config.whatsappToken) {
      throw new Error(
        'Credenciais inválidas. Verifique WHATSAPP_BUSINESS_ID e WHATSAPP_TOKEN.'
      );
    }

    const body = await request.json();
    const { name, category, language, components, allow_category_change } = body;

    if (!name || !category || !language || !components) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Campos obrigatórios: name, category, language e components.',
        },
        { status: 400 }
      );
    }

    const url = `${fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates`;
    const headers = {
      Authorization: `Bearer ${config.whatsappToken}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      name,
      category,
      language,
      components,
      ...(allow_category_change !== undefined
        ? { allow_category_change }
        : {}),
    };

    const response = await axios.post(url, payload, { headers });
    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    if (error.response) {
      console.error('Erro ao criar template - API WhatsApp:', {
        status: error.response.status,
        data: error.response.data,
      });
      if (error.response.data?.error) {
        const metaError = error.response.data.error;
        return NextResponse.json(
          {
            success: false,
            error: `Erro API Meta: [${metaError.code}] ${metaError.message}`,
          },
          { status: error.response.status }
        );
      }
    }
    console.error('Erro ao criar template:', error.message || error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro desconhecido ao criar template',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/atendimento/templates
 * Exclui um template. Informe via body o "name" ou "hsm_id" do template.
 * Corpo esperado:
 * { "name": "nome_do_template" }
 * ou
 * { "hsm_id": "ID_DO_TEMPLATE" }
 */
export async function DELETE(request: Request) {
  try {
    const config = getWhatsAppApiConfig();
    // Forçar uso da versão v18.0 da API
    const fbGraphApiBase = 'https://graph.facebook.com/v18.0';
    
    if (!config.whatsappBusinessAccountId || !config.whatsappToken) {
      throw new Error(
        'Credenciais inválidas. Verifique WHATSAPP_BUSINESS_ID e WHATSAPP_TOKEN.'
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, hsm_id } = body;

    if (!name && !hsm_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            'É necessário informar o "name" ou "hsm_id" do template para deletar.',
        },
        { status: 400 }
      );
    }

    let url = `${fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates`;
    if (hsm_id) {
      url += `?hsm_id=${hsm_id}`;
    }

    const headers = {
      Authorization: `Bearer ${config.whatsappToken}`,
      'Content-Type': 'application/json',
    };

    const payload = name ? { name } : {};
    const response = await axios.delete(url, { headers, data: payload });
    return NextResponse.json({
      success: true,
      result: response.data || 'Template deletado com sucesso',
    });
  } catch (error: any) {
    if (error.response) {
      console.error('Erro ao deletar template - API WhatsApp:', {
        status: error.response.status,
        data: error.response.data,
      });
      if (error.response.data?.error) {
        const metaError = error.response.data.error;
        return NextResponse.json(
          {
            success: false,
            error: `Erro API Meta: [${metaError.code}] ${metaError.message}`,
          },
          { status: error.response.status }
        );
      }
    }
    console.error('Erro ao deletar template:', error.message || error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro desconhecido ao deletar template',
      },
      { status: 500 }
    );
  }
}
