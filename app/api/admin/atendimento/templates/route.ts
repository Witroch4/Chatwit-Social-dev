// app/api/admin/atendimento/templates/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/auth';
import { atendimentoConfig } from '@/app/config/atendimento';
import prisma from '@/lib/prisma';

// Templates mockados para desenvolvimento (caso a API não retorne dados)
const mockTemplates = [
  {
    id: 'mock_consulta',
    name: 'consulta',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'pt_BR',
    components: [],
  },
  {
    id: 'mock_analise_paga',
    name: 'analise_paga',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'pt_BR',
    components: [],
  },
  {
    id: 'mock_satisfacao_oab',
    name: 'satisfacao_oab',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'pt_BR',
    components: [],
  },
  {
    id: 'mock_menu_novo',
    name: 'menu_novo',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'pt_BR',
    components: [],
  },
  {
    id: 'mock_hello_world',
    name: 'hello_world',
    status: 'APPROVED',
    category: 'UTILITY',
    language: 'en_US',
    components: [],
  },
];

/**
 * Função auxiliar para obter as configurações da API do WhatsApp.
 * As variáveis de ambiente devem conter:
 *  - FB_GRAPH_API_BASE (ex.: https://graph.facebook.com/v22.0)
 *  - WHATSAPP_BUSINESS_ID (deve ser o WABA ID, e não o Business ID)
 *  - WHATSAPP_TOKEN (Token do System User com as permissões necessárias)
 */
function getWhatsAppApiConfig() {
  return {
    fbGraphApiBase:
      process.env.FB_GRAPH_API_BASE || 'https://graph.facebook.com/v22.0',
    whatsappBusinessAccountId:
      process.env.WHATSAPP_BUSINESS_ID || '294585820394901',
    whatsappToken:
      process.env.WHATSAPP_TOKEN ||
      atendimentoConfig.whatsappToken ||
      'EAAGIBII4GXQBO2qgvJ2jdcUmgkdqBo5bUKEanJWmCLpcZAsq0Ovpm4JNlrNLeZAv3OYNrdCqqQBAHfEfPFD0FPnZAOQJURB9GKcbjXeDpa83XdAsa3i6fTr23lBFM2LwUZC23xXrZAnB8QjCCFZBxrxlBvzPj8LsejvUjz0C04Q8Jsl8nTGHUd4ZBRPc4NiHFnc',
  };
}

/**
 * Função para salvar ou atualizar um template no banco de dados.
 * Ela mapeia os campos da API para os campos do modelo do Prisma.
 */
async function syncTemplateWithDatabase(template: any, userId: string) {
  try {
    // Verifica se já existe um template com o mesmo templateId
    const existingTemplate = await prisma.whatsAppTemplate.findFirst({
      where: { templateId: template.id.toString() },
    });

    // Mapeia os dados da API para os campos do modelo
    const data = {
      templateId: template.id.toString(),
      name: template.name,
      status: template.status,
      category: template.category || 'UTILITY',
      language: template.language || 'pt_BR',
      components: template.components || {},
      subCategory: template.sub_category || null,
      qualityScore: template.quality_score?.score || null,
      correctCategory: template.correct_category || null,
      ctaUrlLinkTrackingOptedOut:
        template.cta_url_link_tracking_opted_out || null,
      libraryTemplateName: template.library_template_name || null,
      messageSendTtlSeconds: template.message_send_ttl_seconds || null,
      parameterFormat: template.parameter_format || null,
      previousCategory: template.previous_category || null,
      // Atualizamos lastEdited para a data atual; em um fluxo real, pode-se
      // preservar um campo enviado pela API se disponível.
      lastEdited: new Date(),
      // Se houver histórico de edições, preservamos; caso contrário, deixamos nulo.
      editHistory: existingTemplate?.editHistory || undefined,
      userId: userId,
    };

    if (existingTemplate) {
      await prisma.whatsAppTemplate.update({
        where: { id: existingTemplate.id },
        data,
      });
      console.log(`Template ${template.name} atualizado no banco de dados`);
    } else {
      await prisma.whatsAppTemplate.create({
        data,
      });
      console.log(`Template ${template.name} criado no banco de dados`);
    }
    return true;
  } catch (error) {
    console.error(`Erro ao sincronizar template ${template.name}:`, error);
    return false;
  }
}

/**
 * Função para buscar os templates do WhatsApp com paginação e sincronizá‑los no banco.
 */
async function getWhatsAppTemplatesFromAPI(userId: string) {
  try {
    const config = getWhatsAppApiConfig();
    const fbGraphApiBase = 'https://graph.facebook.com/v22.0';

    console.log('Usando configurações da API:', {
      fbGraphApiBase,
      whatsappBusinessAccountId: config.whatsappBusinessAccountId,
      tokenLength: config.whatsappToken?.length,
      tokenStart: config.whatsappToken?.substring(0, 10) + '...',
    });

    if (!config.whatsappBusinessAccountId || !config.whatsappToken) {
      throw new Error(
        'Credenciais da API do WhatsApp não configuradas. Configure WHATSAPP_BUSINESS_ID e WHATSAPP_TOKEN no .env.'
      );
    }

    // Incluímos na query os campos adicionais para armazenar no banco
    const url = `${fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates?fields=name,status,category,language,components,sub_category,quality_score,correct_category,cta_url_link_tracking_opted_out,library_template_name,message_send_ttl_seconds,parameter_format,previous_category&limit=1000`;
    console.log('Fazendo requisição para:', url);

    const headers = {
      Authorization: `Bearer ${config.whatsappToken}`,
      'Content-Type': 'application/json',
    };

    console.log('Iniciando requisição para a API do WhatsApp...');
    const response = await axios.get(url, { headers });
    console.log('Resposta completa da API do WhatsApp:', JSON.stringify(response.data));

    if (!response.data) {
      throw new Error('Resposta da API do WhatsApp vazia');
    }
    if (!response.data.data) {
      if (response.data.error) {
        throw new Error(`Erro na API do WhatsApp: ${response.data.error.message}`);
      }
      console.log('Nenhum template real encontrado, usando templates mockados');
      return { templates: mockTemplates, real: false };
    }

    let templates = response.data.data;
    let nextPage = response.data.paging?.next;
    let pageCount = 1;
    const maxPages = 5;

    console.log(`Obtidos ${templates.length} templates na página 1`);
    while (nextPage && pageCount < maxPages) {
      console.log(`Buscando próxima página de templates: ${pageCount + 1}`);
      const nextPageResponse = await axios.get(nextPage, { headers });
      if (nextPageResponse.data && nextPageResponse.data.data) {
        templates = [...templates, ...nextPageResponse.data.data];
        nextPage = nextPageResponse.data.paging?.next;
        pageCount++;
        console.log(`Obtidos ${nextPageResponse.data.data.length} templates na página ${pageCount}`);
      } else {
        break;
      }
    }

    // Mapeia os templates para incluir os campos extras
    const processedTemplates = templates.map((template: any) => {
      console.log(`Processando template: ${template.name}, status: ${template.status}`);
      return {
        id: template.id,
        name: template.name,
        status: template.status,
        category: template.category || 'UTILITY',
        language: template.language || 'pt_BR',
        components: template.components || {},
        sub_category: template.sub_category,
        quality_score: template.quality_score,
        correct_category: template.correct_category,
        cta_url_link_tracking_opted_out: template.cta_url_link_tracking_opted_out,
        library_template_name: template.library_template_name,
        message_send_ttl_seconds: template.message_send_ttl_seconds,
        parameter_format: template.parameter_format,
        previous_category: template.previous_category,
      };
    });

    if (processedTemplates.length === 0) {
      console.log('API retornou array vazio, usando templates mockados');
      return { templates: mockTemplates, real: false };
    }

    // Sincroniza cada template com o banco de dados
    console.log('Sincronizando templates com o banco de dados...');
    for (const template of processedTemplates) {
      await syncTemplateWithDatabase(template, userId);
    }
    console.log(`Obtidos ${processedTemplates.length} templates reais`);
    return { templates: processedTemplates, real: true };
  } catch (error: any) {
    console.error('Erro ao buscar templates do WhatsApp - Detalhes completos:', error);
    if (error.response) {
      console.error('Erro da API do WhatsApp - Resposta:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: JSON.stringify(error.response.data),
        error: error.response.data?.error,
        headers: error.response.headers,
      });
    }
    console.log('Erro ao buscar templates reais, usando templates mockados');
    return { templates: mockTemplates, real: false };
  }
}

/**
 * GET /api/admin/atendimento/templates
 * Retorna os templates do WhatsApp, sincroniza com o banco e permite filtrar por category e language via query params.
 */
export async function GET(request: Request) {
  try {
    // Autenticação para obter o userId
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const language = searchParams.get('language');
    const useMock = searchParams.get('mock') === 'true';

    console.log('Buscando templates do WhatsApp...');
    if (useMock) {
      console.log('Usando templates mockados por parâmetro de URL');
      return NextResponse.json({
        success: true,
        templates: mockTemplates,
        isRealData: false,
      });
    }

    const { templates, real } = await getWhatsAppTemplatesFromAPI(userId);
    console.log(`Após busca, obtidos ${templates.length} templates (real: ${real})`);

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

    console.log(`Após filtragem, retornando ${filteredTemplates.length} templates`);
    return NextResponse.json({
      success: true,
      templates: filteredTemplates.map((template: any) => ({
        id: template.id,
        name: template.name,
        status: template.status,
        category: template.category,
        language: template.language,
      })),
      isRealData: real,
    });
  } catch (error: any) {
    console.error('Erro ao obter templates:', error);
    return NextResponse.json({
      success: true,
      templates: mockTemplates,
      isRealData: false,
      _error: error.message,
    });
  }
}

/**
 * Função para fazer upload de mídia usando a API de Carregamento Retomável da Meta
 * Esta função implementa o processo descrito na documentação da Meta para carregar arquivos grandes
 * @param mediaUrl URL do arquivo de mídia a ser carregado
 * @param mediaType Tipo MIME do arquivo (ex: 'video/mp4', 'image/jpeg')
 * @param appId ID do aplicativo da Meta (opcional, usa o padrão do ambiente)
 * @returns O identificador de mídia (media_handle) para uso no template
 */
async function uploadMediaToMeta(mediaUrl: string, mediaType: string, appId?: string): Promise<string> {
  try {
    const accessToken = process.env.WHATSAPP_TOKEN || atendimentoConfig.whatsappToken;
    const metaAppId = appId || process.env.META_APP_ID || '1046737990071057'; // Use o ID do app configurado ou um padrão
    
    console.log(`Iniciando upload de mídia: ${mediaUrl}`);
    
    // Primeiro, baixar o arquivo da URL
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const fileBuffer = response.data;
    const fileLength = fileBuffer.length;
    
    // Extrair o nome do arquivo da URL
    const urlParts = mediaUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    console.log(`Arquivo: ${fileName}, Tamanho: ${fileLength} bytes, Tipo: ${mediaType}`);
    
    // Etapa 1: Iniciar sessão de carregamento
    const sessionResponse = await axios.post(
      `https://graph.facebook.com/v22.0/${metaAppId}/uploads`,
      null,
      {
        params: {
          file_name: fileName,
          file_length: fileLength,
          file_type: mediaType,
          access_token: accessToken
        }
      }
    );
    
    const uploadSessionId = sessionResponse.data.id.replace('upload:', '');
    console.log(`Sessão de upload iniciada: ${uploadSessionId}`);
    
    // Etapa 2: Fazer o upload do arquivo
    const uploadResponse = await axios.post(
      `https://graph.facebook.com/v22.0/upload:${uploadSessionId}`,
      fileBuffer,
      {
        headers: {
          'Authorization': `OAuth ${accessToken}`,
          'file_offset': '0',
          'Content-Type': 'application/octet-stream'
        }
      }
    );
    
    const mediaHandle = uploadResponse.data.h;
    console.log(`Upload concluído. Media handle: ${mediaHandle}`);
    
    return mediaHandle;
  } catch (error: any) {
    console.error('Erro ao fazer upload de mídia:', error.response?.data || error.message);
    throw new Error(`Falha ao fazer upload de mídia: ${error.message}`);
  }
}

/**
 * POST /api/admin/atendimento/templates
 * Cria um novo template na API do WhatsApp.
 */
export async function POST(request: Request) {
  try {
    // Autenticação, se necessário (descomente se o endpoint for protegido)
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    // }

    const config = getWhatsAppApiConfig();
    const fbGraphApiBase = 'https://graph.facebook.com/v22.0';

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
          error: 'Campos obrigatórios: name, category, language e components.',
        },
        { status: 400 }
      );
    }
    
    // Verificar se há cabeçalhos de vídeo e se o formato do media handle está correto
    if (components && Array.isArray(components)) {
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        if (comp.type === "HEADER" && comp.format === "VIDEO") {
          console.log("Detectado cabeçalho de vídeo...");
          
          // Verificar se temos exemplo e media handle
          if (comp.example?.header_handle?.[0]) {
            const mediaHandle = comp.example.header_handle[0];
            
            // Log para debug
            console.log(`Media handle no componente: ${mediaHandle}`);
            
            // Se o media_handle já está no formato correto (começando com 4::), não precisamos processá-lo
            if (typeof mediaHandle === 'string' && mediaHandle.startsWith('4::')) {
              console.log("O handle já está no formato correto, não é necessário processamento adicional.");
            } 
            // Se parece ser uma URL, isso pode causar erro 2388273
            else if (typeof mediaHandle === 'string' && mediaHandle.startsWith('http')) {
              console.log("AVISO: Está sendo usado uma URL em vez de um media handle. Isso pode causar erro 2388273.");
              console.log("Para evitar erros, use o componente MetaMediaUpload para obter o media handle correto.");
            }
          } else {
            console.error("Erro: Componente de vídeo sem header_handle no exemplo.");
            return NextResponse.json(
              {
                success: false,
                error: "Cabeçalho de vídeo sem exemplo válido. Use o componente de upload específico para WhatsApp.",
              },
              { status: 400 }
            );
          }
        }
      }
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
      ...(allow_category_change !== undefined ? { allow_category_change } : {}),
    };

    // Logs detalhados para debugging
    console.log("=== PAYLOAD FINAL PARA API DO WHATSAPP ===");
    console.log("Payload completo enviado para a API:", JSON.stringify(payload, null, 2));
    
    if (components && Array.isArray(components) && components.length > 0) {
      const mediaHeaders = components.filter(comp => 
        comp.type === "HEADER" && ["VIDEO", "IMAGE", "DOCUMENT"].includes(comp.format));
      
      if (mediaHeaders.length > 0) {
        console.log("=== COMPONENTES DE MÍDIA DETECTADOS ===");
        mediaHeaders.forEach((header, index) => {
          console.log(`Componente de cabeçalho ${index + 1}:`, JSON.stringify(header, null, 2));
        });
      }
    }

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
      
      // Log detalhado do erro para problemas com templates de vídeo
      if (error.response.status === 400 && error.response.data?.error) {
        const metaError = error.response.data.error;
        console.log("=== DETALHES DO ERRO DA API DO WHATSAPP ===");
        console.log("Código:", metaError.code);
        console.log("Mensagem:", metaError.message);
        console.log("Tipo:", metaError.type);
        console.log("Subcódigo:", metaError.error_subcode);
        console.log("Título do erro:", metaError.error_user_title);
        console.log("Mensagem do erro:", metaError.error_user_msg);
        console.log("Trace ID:", metaError.fbtrace_id);
      }
      
      if (error.response.data?.error) {
        const metaError = error.response.data.error;
        return NextResponse.json(
          {
            success: false,
            error: `Erro API Meta: [${metaError.code}] ${metaError.message}`,
            details: metaError
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
 */
export async function DELETE(request: Request) {
  try {
    const config = getWhatsAppApiConfig();
    const fbGraphApiBase = 'https://graph.facebook.com/v22.0';

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

// Função para enviar o template para a API do WhatsApp
async function createWhatsAppTemplate(template: any) {
  try {
    const whatsappBusinessId = process.env.WHATSAPP_BUSINESS_ID;
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    
    if (!whatsappBusinessId || !whatsappToken) {
      throw new Error("Credenciais do WhatsApp não configuradas");
    }
    
    console.log("Enviando template para WhatsApp API:", JSON.stringify(template, null, 2));
    
    /* IMPORTANTE: Cabeçalhos de vídeo devem usar o formato correto
     * Se estiver recebendo o erro 2388273, isso geralmente indica um problema com o formato do cabeçalho de vídeo.
     * De acordo com a documentação oficial do WhatsApp:
     * 1. O vídeo deve ser primeiro carregado usando a API de Carregamento Retomável (Resumable Upload API)
     * 2. O identificador retornado (media asset handle) deve ser usado no campo header_handle
     * 3. O formato correto é:
     *    {
     *      "type": "HEADER",
     *      "format": "VIDEO",
     *      "example": {
     *        "header_handle": [
     *          "<MEDIA_ASSET_HANDLE>"
     *        ]
     *      }
     *    }
     * 4. Usar URLs diretas não é suportado oficialmente e pode causar erros
     */
    
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${whatsappBusinessId}/message_templates`,
      template,
      {
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("Resposta da WhatsApp API:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao criar template no WhatsApp:", error.response?.data || error.message);
    throw error;
  }
}