import { NextResponse } from 'next/server';
import axios from 'axios';
import prisma from '@/lib/prisma';
import { parse } from 'papaparse';
import { auth } from '@/auth';
import { getWhatsAppConfig, getWhatsAppApiUrl } from '@/app/lib';

// Função para enviar mensagem para um número com um template (versão simulada)
async function sendTemplateMessage(to: string, templateName: string, parameters: any[] = []): Promise<boolean> {
  try {
    // Obtém a sessão do usuário
    const session = await auth();
    if (!session?.user) {
      throw new Error('Usuário não autenticado');
    }
    
    // Obtém as configurações do WhatsApp
    const config = await getWhatsAppConfig(session.user.id);
    
    // URL da API do WhatsApp
    const whatsappApiUrl = getWhatsAppApiUrl(config);
    
    // Configuração para a API do WhatsApp
    const configWhatsapp = {
      headers: {
        'Authorization': `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      }
    };
    
    // Para garantir que tenhamos um nome como parâmetro
    const params = parameters.length > 0 ? parameters : ['Usuário'];
    
    // No ambiente de desenvolvimento, simulamos o envio sem fazer chamada real à API
    if (process.env.NODE_ENV !== 'production') {
      // Em desenvolvimento, sempre usamos o template satisfacao_oab para testes
      const templateToUse = 'satisfacao_oab';
      
      // Dados que seriam enviados na API real
      const data = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateToUse,
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
              parameters: params.map(param => ({
                type: 'text',
                text: param
              }))
            },
          ],
        },
      };
      
      // Log para depuração
      console.log(`[DISPARO REAL] Enviando template ${templateToUse} para ${to}`, JSON.stringify(data));
      
      // Simulamos um pequeno atraso para parecer mais realista
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        // Faça o envio real mesmo em desenvolvimento (removendo simulação)
        const response = await axios.post(whatsappApiUrl, data, configWhatsapp);
        console.log(`[SUCESSO] Template ${templateToUse} enviado para ${to}`, response.data);
        return true;
      } catch (apiError) {
        console.error(`[ERRO API] Falha ao enviar para ${to}:`, apiError.response?.data || apiError.message);
        return false;
      }
    }
    
    // Em produção, fazemos a chamada real à API
    const data = {
      messaging_product: 'whatsapp',
      to,
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

    const response = await axios.post(whatsappApiUrl, data, configWhatsapp);
    return true;
  } catch (error) {
    console.error(`Erro ao enviar template ${templateName} para ${to}:`, error);
    return false;
  }
}

// Função para processar CSV
function processCSV(csvContent: string) {
  const { data } = parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  return data.map((row: any) => ({
    nome: row.Nome || '',
    numero: row.Numero?.replace(/\D/g, '') || ''
  })).filter((contact: any) => contact.numero);
}

// Endpoint para disparar mensagens
export async function POST(request: Request) {
  try {
    // Verificação de autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { csvData, templateName, configuracoes } = await request.json();
    
    if (!csvData || !templateName) {
      return NextResponse.json(
        { error: 'Dados CSV e nome do template são obrigatórios' },
        { status: 400 }
      );
    }

    // Processar o CSV
    const contacts = processCSV(csvData);
    
    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato válido encontrado no CSV' },
        { status: 400 }
      );
    }

    // Resultados do envio
    const results = {
      total: contacts.length,
      enviados: 0,
      falhas: 0,
      detalhes: [] as any[]
    };

    // Enviar mensagens para cada contato
    for (const contact of contacts) {
      try {
        // Garante que o número tem o formato correto (com código do país)
        let numero = contact.numero;
        if (!numero.startsWith('55')) {
          numero = '55' + numero;
        }

        // Enviar mensagem
        const success = await sendTemplateMessage(
          numero, 
          templateName, 
          [contact.nome] // Parâmetro nome para o template
        );

        // Registrar resultado
        if (success) {
          results.enviados++;
          results.detalhes.push({
            nome: contact.nome,
            numero: contact.numero,
            status: 'enviado',
          });

          // Em ambiente de produção, salvaríamos no banco de dados
          if (process.env.NODE_ENV === 'production') {
            try {
              // Buscar usuário Chatwit para associar ao lead
              const usuarioChatwit = await prisma.usuarioChatwit.findFirst({
                where: { userId: parseInt(session.user.id) }
              });
              
              if (usuarioChatwit) {
                await prisma.leadChatwit.upsert({
                  where: {
                    usuarioId_sourceId: {
                      usuarioId: usuarioChatwit.id,
                      sourceId: numero
                    }
                  },
                  update: {
                    anotacoes: `Envio de template ${templateName} em ${new Date().toISOString()}`
                  },
                  create: {
                    sourceId: numero,
                    name: contact.nome,
                    phoneNumber: numero,
                    anotacoes: `Envio de template ${templateName} em ${new Date().toISOString()}`,
                    usuarioId: usuarioChatwit.id
                  }
                });
              }
            } catch (dbError) {
              console.error('Erro ao salvar lead no banco:', dbError);
            }
          }
        } else {
          results.falhas++;
          results.detalhes.push({
            nome: contact.nome,
            numero: contact.numero,
            status: 'falha',
          });
        }

        // Adicionar um pequeno delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Erro ao processar contato ${contact.nome}:`, error);
        results.falhas++;
        results.detalhes.push({
          nome: contact.nome,
          numero: contact.numero,
          status: 'falha',
          erro: (error as Error).message
        });
      }
    }

    // Em ambiente de produção, registramos notificação
    if (process.env.NODE_ENV === 'production') {
      try {
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            title: `Disparo de WhatsApp - ${templateName}`,
            message: `Enviadas ${results.enviados} mensagens de ${results.total}. Configurações: ${JSON.stringify(configuracoes)}`,
          }
        });
      } catch (dbError) {
        console.error('Erro ao criar notificação:', dbError);
      }
    }

    // Adicionamos um atraso para simular processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      message: `Disparo concluído. Enviadas ${results.enviados} mensagens de ${results.total}.`,
      results
    });
  } catch (error) {
    console.error('Erro ao disparar mensagens:', error);
    return NextResponse.json(
      { error: 'Erro ao disparar mensagens', details: (error as Error).message },
      { status: 500 }
    );
  }
} 