// app/api/admin/atendimento/template-info/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/auth';
import { atendimentoConfig } from '@/app/config/atendimento';
import prisma from '@/lib/prisma';

/**
 * Função auxiliar para obter as configurações da API do WhatsApp.
 * Certifique-se de definir as variáveis de ambiente:
 *  - FB_GRAPH_API_BASE (ex.: https://graph.facebook.com/v22.0)
 *  - WHATSAPP_BUSINESS_ID (deve ser o ID da conta do WhatsApp, WABA)
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
 * Função para obter detalhes do template diretamente da API do WhatsApp
 * e sincronizá‑lo no banco de dados.
 */
async function getWhatsAppTemplateDetailsFromAPI(templateId: string) {
  try {
    const config = getWhatsAppApiConfig();
    // Inclui campos extras para a sincronização completa
    const url = `${config.fbGraphApiBase}/${config.whatsappBusinessAccountId}/message_templates?fields=name,status,category,language,components,sub_category,quality_score,correct_category,cta_url_link_tracking_opted_out,library_template_name,message_send_ttl_seconds,parameter_format,previous_category&limit=1000`;
    console.log('Consultando API do WhatsApp em:', url);
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.data || !response.data.data || response.data.data.length === 0) {
      throw new Error('Nenhum template encontrado na API');
    }
    
    // Localiza o template específico pelo ID
    const template = response.data.data.find((t: any) => t.id === templateId);
    if (!template) {
      throw new Error(`Template com ID ${templateId} não encontrado na API`);
    }
    
    // Tenta sincronizar o template com o banco de dados
    try {
      const session = await auth();
      if (session?.user) {
        const existingTemplate = await prisma.whatsAppTemplate.findFirst({
          where: { templateId: templateId }
        });
        
        // Preparar dados para salvar no banco
        const data = {
          name: template.name,
          category: template.category,
          status: template.status,
          language: template.language,
          components: template.components,
          subCategory: template.sub_category || null,
          qualityScore: template.quality_score?.score || null,
          correctCategory: template.correct_category || null,
          ctaUrlLinkTrackingOptedOut: template.cta_url_link_tracking_opted_out || null,
          libraryTemplateName: template.library_template_name || null,
          messageSendTtlSeconds: template.message_send_ttl_seconds || null,
          parameterFormat: template.parameter_format || null,
          previousCategory: template.previous_category || null,
          lastEdited: new Date(),
        };

        if (existingTemplate) {
          await prisma.whatsAppTemplate.update({
            where: { id: existingTemplate.id },
            data,
          });
          console.log(`Template ${template.name} atualizado no banco de dados`);
        } else {
          await prisma.whatsAppTemplate.create({
            data: {
              templateId: template.id,
              userId: session.user.id,
              ...data,
            },
          });
          console.log(`Template ${template.name} criado no banco de dados`);
        }
      }
    } catch (dbError) {
      console.error(`Erro ao salvar template no banco:`, dbError);
      // Se ocorrer erro no banco, não interrompe o fluxo
    }
    
    return template;
  } catch (error) {
    console.error(`Erro ao obter detalhes do template da API:`, error);
    throw error;
  }
}

/**
 * Endpoint GET /api/admin/atendimento/template-info
 * Recebe o parâmetro de query "template" (ID do template) e retorna os detalhes.
 * Apenas usuários autenticados com role ADMIN têm acesso.
 */
export async function GET(req: Request) {
  try {
    // Verifica autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    // Verifica se o usuário é admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const url = new URL(req.url);
    const templateId = url.searchParams.get("template");
    if (!templateId) {
      return NextResponse.json({ error: "ID do template não fornecido" }, { status: 400 });
    }
    console.log("Buscando template com ID:", templateId);
    
    // Busca o template na API do WhatsApp e sincroniza com o banco
    const template = await getWhatsAppTemplateDetailsFromAPI(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    }
    console.log("Template encontrado:", template ? "Sim" : "Não");
    
    // Formata a resposta simplificada para o frontend
    return NextResponse.json({
      success: true,
      template: {
        nome: template.name,
        categoria: template.category,
        idioma: template.language,
        status: template.status,
        subCategoria: template.sub_category || null,
        qualidadeScore: template.quality_score?.score || null,
        categoriaCorreta: template.correct_category || null,
        ctaUrlLinkTrackingOptedOut: template.cta_url_link_tracking_opted_out || null,
        nomeTemplateBiblioteca: template.library_template_name || null,
        mensagemSendTtlSegundos: template.message_send_ttl_seconds || null,
        formatoParametro: template.parameter_format || null,
        categoriaAnterior: template.previous_category || null,
        componentes: Array.isArray(template.components)
          ? template.components.map((component: any) => {
              // Objeto base com propriedades comuns
              const mappedComponent: any = {
                tipo: component.type,
                formato: component.format,
                texto: component.text,
              };
              
              // Adicionar exemplo se existir
              if (component.example) {
                mappedComponent.example = component.example;
              }
              
              // Processar variáveis se existirem
              if (component.example && component.text && component.text.includes('{{')) {
                // Extrair variáveis de texto com {{número}}
                const varRegex = /{{(\d+)}}/g;
                const matches = [...component.text.matchAll(varRegex)];
                
                if (matches.length > 0) {
                  mappedComponent.variaveis = matches.map((match: any, index: number) => {
                    // Tentar obter exemplo das variáveis
                    let exemplo = '';
                    if (component.example.body_text && 
                        component.example.body_text[0] && 
                        component.example.body_text[0][index]) {
                      exemplo = component.example.body_text[0][index];
                    }
                    
                    return {
                      nome: match[1],
                      descricao: `Variável ${match[1]}`,
                      exemplo: exemplo
                    };
                  });
                } else {
                  mappedComponent.variaveis = false;
                }
              } else {
                mappedComponent.variaveis = false;
              }
              
              // Processar botões se existirem
              if (component.buttons) {
                mappedComponent.botoes = component.buttons.map((btn: any) => ({
                  tipo: btn.type,
                  texto: btn.text,
                  url: btn.url || null,
                  telefone: btn.phone_number || null
                }));
              }
              
              return mappedComponent;
            })
          : [],
      }
    });
  } catch (error) {
    console.error("Erro ao buscar informações do template:", error);
    return NextResponse.json({ error: "Erro ao buscar informações do template" }, { status: 500 });
  }
}
