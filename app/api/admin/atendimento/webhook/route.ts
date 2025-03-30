import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { getWhatsAppConfig, getWhatsAppApiUrl } from '@/app/lib';

// Valores de configuração padrão que serão substituídos pelos valores dinâmicos quando necessário
const lote1 = "R$ 287,90";
const analise = "R$ 27,90";
const lote2 = "R$ 287,90";
const comecoLote1 = "13/03/2025 as 15:00";
const comecoLote2 = "13/03/2025 as 15:00";
const fim = "sábado as 5:00 da tarde";
const pix = "atendimento@amandasousaprev.adv.br";

// Função para obter configuração do WhatsApp atual (usando primeira configuração ativa no sistema)
async function getCurrentWhatsAppConfig() {
  // Buscar a primeira configuração ativa no banco de dados
  const config = await prisma.whatsAppConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' }
  });
  
  if (!config) {
    // Se não houver configuração no banco, usar valores do .env
    return {
      token: process.env.WHATSAPP_TOKEN || '',
      businessId: process.env.WHATSAPP_BUSINESS_ID || '',
      apiBase: 'https://graph.facebook.com/v22.0', // Forçar versão v22.0
    };
  }
  
  return {
    token: config.whatsappToken,
    businessId: config.whatsappBusinessAccountId,
    apiBase: 'https://graph.facebook.com/v22.0', // Forçar versão v22.0
  };
}

// Sanitizar chave para armazenamento seguro no banco de dados
function sanitizeKey(key: string): string {
  return key.replace(/[.#$[\]]/g, '_');
}

// Manipulador para atendimento OAB (versão simulada)
async function handleOAB(req: any, witMASTER: string): Promise<boolean> {
  try {
    const parameters = req.queryResult.parameters;
    const nome = parameters['person']['name'];

    console.log(`[SIMULAÇÃO] Dados salvos no banco para o usuário ${nome}`);

    // Obter configuração atual
    const config = await getCurrentWhatsAppConfig();
    
    // Configuração para a API do WhatsApp
    const urlwhatsapp = `${config.apiBase}/${config.businessId}/messages`;
    const configwhatsapp = {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    };

    // Mensagem personalizada utilizando as constantes e incluindo a chave Pix
    const messageText = `Últimas Vagas - Sr(a) *${nome}*,
Para a análise de pontos, cobro ${analise}.
Escolha a opção que melhor se encaixa:
- Ultimo Lote: Valor ${lote1}, válido a partir de ${comecoLote1}.

O valor pago na análise será deduzido do total.
Envie o comprovante de pagamento para a chave Pix: ${pix}.
Envie a prova e o espelho (NÃO envie login e senha).
Obrigado. Escolha uma opção:`;

    // Dados que seriam enviados para a API do WhatsApp (apenas para referência)
    const data = {
      messaging_product: "whatsapp",
      to: witMASTER,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "image",
          image: {
            link: "https://amandasousaprev.adv.br/wp-content/uploads/2024/10/AmandaFOTO.jpg",
          },
        },
        body: {
          text: messageText,
        },
        footer: {
          text: "Dra. Amanda Sousa Advocacia e Consultoria Jurídica™",
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: "id_enviar_prova",
                title: "Enviar a Prova",
              },
            },
            {
              type: "reply",
              reply: {
                id: "id_qual_pix",
                title: "Qual o PIX?",
              },
            },
            {
              type: "reply",
              reply: {
                id: "id_finalizar",
                title: "Foi Engano.",
              },
            },
          ],
        },
      },
    };

    console.log('[SIMULAÇÃO] Enviando mensagem interativa para o WhatsApp:', JSON.stringify(data));

    // Simulamos um pequeno atraso para parecer mais realista
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('[SIMULAÇÃO] Mensagem interativa enviada com sucesso.');
    
    return true;
  } catch (error) {
    console.error('Erro ao simular atendimento OAB:', error);
    return false;
  }
}

// Manipulador para atendimento humano (versão simulada)
async function handleAtendimentoHumano(witMASTER: string): Promise<boolean> {
  try {
    // Obter configuração atual
    const config = await getCurrentWhatsAppConfig();
    
    // Dados que seriam enviados para a API do WhatsApp (apenas para referência)
    const data = {
      messaging_product: "whatsapp",
      to: witMASTER,
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "image",
          image: {
            link: "https://amandasousaprev.adv.br/wp-content/uploads/2024/10/AmandaFOTO.jpg",
          },
        },
        body: {
          text: "*Agradecemos por entrar em contato com o Escritório Dra. Amanda Sousa.*\n*MENU de atendimento*",
        },
        footer: { text: "Dra. Amanda Sousa Advocacia e Consultoria Jurídica™" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "id02", title: "Atendimento Humano" } },
            { type: "reply", reply: { id: "id03", title: "OAB" } },
            { type: "reply", reply: { id: "id11", title: "Não Quero" } },
          ],
        },
      },
    };

    console.log('[SIMULAÇÃO] Enviando mensagem interativa para o WhatsApp:', JSON.stringify(data));
    
    // Simulamos um pequeno atraso para parecer mais realista
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('[SIMULAÇÃO] Mensagem enviada com sucesso.');
    return true;
  } catch (error) {
    console.error('Erro ao simular atendimento humano:', error);
    return false;
  }
}

// Manipulador para enviar mensagem de template (versão simulada)
async function sendTemplateMessage(witMASTER: string, templateName: string, parameters: any[] = []): Promise<boolean> {
  try {
    // Obter configuração atual
    const config = await getCurrentWhatsAppConfig();
    
    // Dados que seriam enviados para a API do WhatsApp (apenas para referência)
    const data = {
      messaging_product: 'whatsapp',
      to: witMASTER,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'pt_BR',
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: 'https://amandasousaprev.adv.br/wp-content/uploads/2024/10/AmandaFOTO.jpg',
                },
              },
            ],
          },
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          },
        ],
      },
    };

    // Simulamos um pequeno atraso para parecer mais realista
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`[SIMULAÇÃO] Template ${templateName} enviado com sucesso para ${witMASTER}`);
    return true;
  } catch (error) {
    console.error(`Erro ao simular envio de template ${templateName}:`, error);
    return false;
  }
}

// Identificar usuário e salvar no banco (versão simulada)
async function handleIdentificacao(req: any, witMASTER: string): Promise<NextResponse> {
  try {
    const parameters = req.queryResult.parameters;
    const nome = parameters['person']['name'];

    console.log(`[SIMULAÇÃO] Dados do usuário ${nome} (${witMASTER}) salvos no banco`);

    return NextResponse.json({
      fulfillmentMessages: [
        { text: { text: [`Perfeito, ${nome}. Posso confirmar o cadastro do seu nome?`] } },
      ],
      outputContexts: [
        {
          name: `${req.session}/contexts/menu`,
          lifespanCount: 10,
          parameters: {
            person: nome,
          },
        },
      ],
    });
  } catch (error) {
    console.error('Erro ao processar identificação:', error);
    return NextResponse.json({ error: 'Erro ao processar identificação' }, { status: 500 });
  }
}

// Bem-vindo e verificação de usuário existente (versão simulada)
async function handleWelcome(req: any, witMASTER: string): Promise<NextResponse> {
  try {
    // Simulação de busca no banco - alternar entre usuário novo e existente
    const exists = Math.random() > 0.5;

    if (exists) {
      // Simulação de usuário já existente
      const mockName = "Cliente Existente";
      console.log(`[SIMULAÇÃO] Usuário existente encontrado: ${mockName}`);
      
      const responseData = {
        fulfillmentMessages: [
          {
            text: {
              text: [
                `*Bem-vindo(a) de volta, Sr(a). ${mockName}!* \nSegue as opções disponíveis para atendimento (espere um pouco).`,
              ],
            },
          },
        ],
        outputContexts: [
          {
            name: `${req.session}/contexts/menu`,
            lifespanCount: 10,
            parameters: {
              person: mockName,
            },
          },
        ],
      };

      // Enviar menu para usuário existente
      await sendTemplateMessage(witMASTER, 'menu_novo');
      
      return NextResponse.json(responseData);
    } else {
      // Simulação de novo usuário
      console.log(`[SIMULAÇÃO] Novo usuário: ${witMASTER}`);
      
      return NextResponse.json({
        fulfillmentMessages: [
          {
            text: {
              text: [
                'Olá, tudo bem? Sou Ana, assistente virtual da Dra. Amanda Sousa. *(No momento eu ainda não consigo reconhecer mensagens de mídia (áudio, vídeo, foto, etc). Por favor, envie apenas mensagens de texto. 🚫🎵📸🚫)* Para sua segurança, informamos que o escritório *Dra. Amanda Sousa* utiliza dados pessoais em conformidade com a `Lei Geral de Proteção de Dados Pessoais (LGPD) Lei Nº 13.709/18`. Ao prosseguir com seu contato, você está de acordo com a troca de mensagens por este canal. Faço seu pré-atendimento, antes de começar qual é seu *NOME?*',
              ],
            },
          },
        ],
      });
    }
  } catch (error) {
    console.error('Erro ao processar boas-vindas:', error);
    return NextResponse.json({ error: 'Erro ao processar boas-vindas' }, { status: 500 });
  }
}

// Rota principal que processa o webhook
export async function POST(request: Request) {
  try {
    const req = await request.json();
    console.log('[SIMULAÇÃO] Dialogflow Request body:', JSON.stringify(req));

    // Se o payload estiver vazio ou incompleto, criamos um mock básico para demonstração
    const intentName = req.queryResult?.intent?.displayName || 'Welcome';
    const session = req.session || 'session/5584994072876';

    // Extrai o número de telefone da sessão e remove caracteres não numéricos
    const witMASTER = session.split('/').pop().replace(/\D/g, '');

    let result: any;

    // Processa a intenção recebida
    switch (intentName) {
      case 'oab':
        await handleOAB(req, witMASTER);
        result = NextResponse.json({});
        break;
      case 'atendimentohumano':
        await handleAtendimentoHumano(witMASTER);
        result = NextResponse.json({});
        break;
      case 'Welcome':
        result = await handleWelcome(req, witMASTER);
        break;
      case 'identificacao':
        result = await handleIdentificacao(req, witMASTER);
        break;
      case 'confirmação.nome.menu':
        await sendTemplateMessage(witMASTER, 'menu_novo');
        result = NextResponse.json({});
        break;
      case 'maternidade':
        await sendTemplateMessage(witMASTER, 'maternidade_novo');
        result = NextResponse.json({});
        break;
      case 'invalidez':
        await sendTemplateMessage(witMASTER, 'invalidez');
        result = NextResponse.json({});
        break;
      case 'auxilio':
        await sendTemplateMessage(witMASTER, 'auxilio');
        result = NextResponse.json({});
        break;
      case 'consulta.juridica':
        await sendTemplateMessage(witMASTER, 'consulta_juridica');
        result = NextResponse.json({});
        break;
      case 'BPC-LOAS':
        await sendTemplateMessage(witMASTER, 'bpc_loas');
        result = NextResponse.json({});
        break;
      default:
        console.log(`[SIMULAÇÃO] Intenção desconhecida: ${intentName}`);
        result = NextResponse.json({
          fulfillmentMessages: [
            {
              text: {
                text: ['Desculpe, não consegui entender sua solicitação. Poderia reformular?'],
              },
            },
          ],
        });
    }

    return result;
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 