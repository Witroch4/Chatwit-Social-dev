import { NextResponse } from 'next/server';
import axios from 'axios';
import { parse } from 'papaparse';
import { auth } from '@/auth';
import { getWhatsAppConfig, getWhatsAppApiUrl } from '@/app/lib';
import { db } from "@/lib/db";
import { z } from "zod";

// Função para formatar número de telefone
function formatPhoneNumber(phone: string): string {
  // Remover caracteres não numéricos
  const numbers = phone.replace(/\D/g, '');
  
  // Verificar se já tem o código do país (55)
  if (numbers.startsWith('55') && numbers.length >= 12) {
    return numbers;
  }
  
  // Adicionar código do país (55)
  return `55${numbers}`;
}

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
        const errorMessage = apiError instanceof Error 
          ? apiError.message 
          : 'Erro desconhecido';
        const errorData = apiError && typeof apiError === 'object' && 'response' in apiError 
          ? (apiError.response as any)?.data 
          : undefined;
        console.error(`[ERRO API] Falha ao enviar para ${to}:`, errorData || errorMessage);
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

interface EnvioResult {
  nome: string;
  numero: string;
  status: "enviado" | "falha";
  erro?: string;
}

const DisparoSchema = z.object({
  csvData: z.string(),
  templateName: z.string(),
  configuracoes: z.object({
    variaveis: z.array(z.string())
  })
});

export async function POST(req: Request) {
  try {
    // Verificar autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se o usuário é admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Validar o corpo da requisição
    const body = await req.json();
    const validationResult = DisparoSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Dados inválidos", 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const { csvData, templateName, configuracoes } = validationResult.data;

    // Verificar se o template existe
    const template = await db.whatsAppTemplate.findFirst({
      where: {
        name: templateName
      }
    });

    if (!template) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    }

    // Verificar status do template
    if (template.status !== "APPROVED") {
      return NextResponse.json({ 
        error: "O template selecionado não está aprovado", 
        status: template.status 
      }, { status: 400 });
    }

    // Processar CSV
    const lines = csvData.split('\n');
    const contacts: { nome: string; numero: string }[] = [];
    
    // Pular cabeçalho
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      if (values.length >= 2) {
        contacts.push({
          nome: values[0].trim(),
          numero: values[1].trim()
        });
      }
    }
    
    if (contacts.length === 0) {
      return NextResponse.json({ error: "Nenhum contato válido encontrado no CSV" }, { status: 400 });
    }

    // Limitar número máximo de envios (opcional, ajuste conforme necessário)
    const MAX_CONTACTS = 1000;
    if (contacts.length > MAX_CONTACTS) {
      return NextResponse.json({ 
        error: `Limite de ${MAX_CONTACTS} contatos excedido. Divida o envio em lotes menores.` 
      }, { status: 400 });
    }

    // Enviar mensagens para cada contato
    const results: EnvioResult[] = [];
    let enviados = 0;
    let falhas = 0;

    for (const contact of contacts) {
      try {
        // Formatar número de telefone
        const formattedNumber = formatPhoneNumber(contact.numero);
        
        if (!formattedNumber) {
          results.push({
            nome: contact.nome,
            numero: contact.numero,
            status: "falha",
            erro: "Número de telefone inválido"
          });
          falhas++;
          continue;
        }

        // Enviar mensagem usando o template
        const success = await sendTemplateMessage(
          formattedNumber, 
          templateName, 
          configuracoes.variaveis
        );

        if (!success) {
          results.push({
            nome: contact.nome,
            numero: formattedNumber,
            status: "falha",
            erro: "Falha ao enviar mensagem através da API"
          });
          falhas++;
          continue;
        }

        // Log de registro
        console.log(`[REGISTRO] Mensagem enviada para ${contact.nome} (${formattedNumber}) usando template ${templateName}`);

        results.push({
          nome: contact.nome,
          numero: formattedNumber,
          status: "enviado"
        });
        
        enviados++;
      } catch (error: any) {
        console.error(`Erro ao enviar para ${contact.nome} (${contact.numero}):`, error);
        
        results.push({
          nome: contact.nome,
          numero: contact.numero,
          status: "falha",
          erro: error.message || "Erro ao enviar mensagem"
        });
        
        falhas++;
      }
      
      // Aguardar um pequeno intervalo entre mensagens para evitar throttling
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Retornar resultados
    return NextResponse.json({
      success: true,
      results: {
        total: contacts.length,
        enviados,
        falhas,
        detalhes: results
      }
    });

  } catch (error) {
    console.error("Erro ao processar disparo em massa:", error);
    return NextResponse.json({ error: "Erro ao processar disparo" }, { status: 500 });
  }
} 