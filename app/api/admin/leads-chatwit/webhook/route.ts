import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addManuscritoJob } from '@/lib/queue/manuscrito.queue';
// Função SSE desabilitada

// Criando uma instância do Prisma fora do escopo da rota
const prisma = new PrismaClient();

/**
 * Handler da rota POST.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[Webhook] Recebendo payload...");
    
    // Log de debug para a requisição completa
    console.log("[Webhook DEBUG] Headers:", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    
    // Obter o payload completo
    let webhookData = await request.json();
    
    // Verificar se o payload está dentro de um array ou outro contêiner
    if (Array.isArray(webhookData) && webhookData.length > 0) {
      console.log("[Webhook] Payload recebido como array, extraindo primeiro elemento");
      webhookData = webhookData[0];
    }
    
    // Verificar se o payload está dentro de um "body"
    if (webhookData.body && typeof webhookData.body === 'object') {
      console.log("[Webhook] Payload com wrapper 'body', extraindo conteúdo");
      webhookData = webhookData.body;
    }

    // Se o payload possui um debug que contém analisepreliminar, extrair o debug como payload
    if (webhookData.debug && webhookData.debug.analisepreliminar === true) {
      console.log("[Webhook] Identificado payload de pré-análise dentro do debug, extraindo");
      webhookData = webhookData.debug;
    }
    
    // Log detalhado do payload recebido
    console.log("[Webhook DEBUG] Payload normalizado:", JSON.stringify(webhookData, null, 2));
    
    // Verificar o formato do payload para identificar o tipo
    const isEspelho = webhookData.espelho === true;
    const isEspelhoConsultoriaFase2 = webhookData.espelhoconsultoriafase2 === true;
    const isManuscrito = webhookData.manuscrito === true && webhookData.textoDAprova;
    const isAnalise = webhookData.analise === true;
    const isAnaliseSimulado = webhookData.analisesimulado === true;
    const isAnalisePreliminar = webhookData.analisepreliminar === true;
    const isAnaliseSimuladoPreliminar = webhookData.analisesimuladopreliminar === true;
    const isAnaliseValidada = webhookData.analiseValidada === true;
    const isAnaliseSimuladoValidada = webhookData.analisesimuladovalidado === true;
    const isAnaliseSimuladoValidadaCamelCase = webhookData.analiseSimuladoValidada === true;
    
    console.log("[Webhook] Tipo do payload - espelho:", isEspelho, "espelhoConsultoriaFase2:", isEspelhoConsultoriaFase2, "manuscrito:", isManuscrito, "analise:", isAnalise, "analiseSimulado:", isAnaliseSimulado, "analisePreliminar:", isAnalisePreliminar, "analiseSimuladoPreliminar:", isAnaliseSimuladoPreliminar, "analiseValidada:", isAnaliseValidada, "analiseSimuladoValidada:", isAnaliseSimuladoValidada, "analiseSimuladoValidadaCamelCase:", isAnaliseSimuladoValidadaCamelCase);

    // Processar webhook de pré-análise
    if (isAnalisePreliminar) {
      console.log("[Webhook] Identificado payload de pré-análise de prova");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      try {
        // Armazenar o payload completo da pré-análise
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analisePreliminar: webhookData,
            analiseValidada: false,
            aguardandoAnalise: true, // Mantém aguardando análise até que seja validada
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Pré-análise de prova armazenada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Pré-análise de prova processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com pré-análise:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar pré-análise: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Processar webhook de pré-análise de simulado
    if (isAnaliseSimuladoPreliminar) {
      console.log("[Webhook] Identificado payload de pré-análise de simulado");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      try {
        // Armazenar o payload completo da pré-análise de simulado
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analisePreliminar: webhookData,
            analiseValidada: false,
            aguardandoAnalise: true, // Mantém aguardando análise até que seja validada
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Pré-análise de simulado armazenada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Pré-análise de simulado processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com pré-análise de simulado:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar pré-análise de simulado: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Processar webhook de análise validada (nova implementação)
    if (webhookData.analiseValidada === true) {
      console.log("[Webhook] Identificado payload de análise validada com URL");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Verificar se a URL foi fornecida
      const analiseUrl = webhookData.analiseUrl;
      
      if (!analiseUrl) {
        console.error("[Webhook] URL da análise validada não fornecida");
        return NextResponse.json({
          success: false,
          message: "URL da análise validada não fornecida (campo 'analiseUrl')",
        });
      }
      
      console.log("[Webhook] URL da análise validada:", analiseUrl);
      
      try {
        // Atualizar o lead com a URL da análise validada
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analiseUrl: analiseUrl,
            analiseProcessada: true,
            analiseValidada: true,
            aguardandoAnalise: false,
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Análise validada processada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Análise validada processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com análise validada:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar análise validada: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Processar webhook de consultoria fase 2 (nova implementação)
    if (webhookData.consultoriafase2 === true) {
      console.log("[Webhook] Identificado payload de consultoria fase 2 com URL");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Verificar se a URL foi fornecida
      const analiseUrl = webhookData.analiseUrl;
      
      if (!analiseUrl) {
        console.error("[Webhook] URL da consultoria fase 2 não fornecida");
        return NextResponse.json({
          success: false,
          message: "URL da consultoria fase 2 não fornecida (campo 'analiseUrl')",
        });
      }
      
      console.log("[Webhook] URL da consultoria fase 2:", analiseUrl);
      
      try {
        // Atualizar o lead com a URL da consultoria fase 2
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analiseUrl: analiseUrl,
            analiseProcessada: true,
            analiseValidada: true, // Marcar como validada para consultoria fase 2
            aguardandoAnalise: false,
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Consultoria fase 2 processada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Consultoria fase 2 processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com consultoria fase 2:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar consultoria fase 2: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Processar webhook de análise
    if (isAnalise) {
      console.log("[Webhook] Identificado payload de análise de prova");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Verificar se a URL de análise foi fornecida
      const analiseUrl = webhookData.analiseUrl;
      
      if (!analiseUrl) {
        console.error("[Webhook] URL da análise não fornecida (analiseUrl)");
        return NextResponse.json({
          success: false,
          message: "URL da análise não fornecida (analiseUrl)",
        });
      }
      
      console.log("[Webhook] URL da análise:", analiseUrl);
      
      try {
        // Atualizar o lead com a URL da análise
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analiseUrl: analiseUrl,
            analiseProcessada: true,
            aguardandoAnalise: false,
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Análise de prova processada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Análise de prova processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com análise:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar análise: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Processar webhook de análise de simulado
    if (isAnaliseSimulado) {
      console.log("[Webhook] Identificado payload de análise de simulado");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Verificar se a URL de análise foi fornecida
      const analiseUrl = webhookData.analiseUrl;
      
      if (!analiseUrl) {
        console.error("[Webhook] URL da análise de simulado não fornecida (analiseUrl)");
        return NextResponse.json({
          success: false,
          message: "URL da análise de simulado não fornecida (analiseUrl)",
        });
      }
      
      console.log("[Webhook] URL da análise de simulado:", analiseUrl);
      
      try {
        // Atualizar o lead com a URL da análise de simulado
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analiseUrl: analiseUrl,
            analiseProcessada: true,
            aguardandoAnalise: false,
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Análise de simulado processada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Análise de simulado processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com análise de simulado:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar análise de simulado: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Processar webhook de validação de análise de simulado
    if (isAnaliseSimuladoValidada) {
      console.log("[Webhook] Identificado payload de validação de análise de simulado");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Verificar se a URL foi fornecida
      const analiseUrl = webhookData.analiseUrl;
      
      if (!analiseUrl) {
        console.error("[Webhook] URL da análise de simulado validada não fornecida");
        return NextResponse.json({
          success: false,
          message: "URL da análise de simulado validada não fornecida (campo 'analiseUrl')",
        });
      }
      
      console.log("[Webhook] URL da análise de simulado validada:", analiseUrl);
      
      try {
        // Atualizar o lead com a URL da análise de simulado validada
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analiseUrl: analiseUrl,
            analiseProcessada: true,
            analiseValidada: true,
            aguardandoAnalise: false,
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Análise de simulado validada processada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Análise de simulado validada processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com análise de simulado validada:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar análise de simulado validada: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Processar webhook de validação de análise de simulado (camelCase)
    if (isAnaliseSimuladoValidadaCamelCase) {
      console.log("[Webhook] Identificado payload de validação de análise de simulado (camelCase)");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Verificar se a URL foi fornecida
      const analiseUrl = webhookData.analiseUrl;
      
      if (!analiseUrl) {
        console.error("[Webhook] URL da análise de simulado validada não fornecida");
        return NextResponse.json({
          success: false,
          message: "URL da análise de simulado validada não fornecida (campo 'analiseUrl')",
        });
      }
      
      console.log("[Webhook] URL da análise de simulado validada:", analiseUrl);
      
      try {
        // Atualizar o lead com a URL da análise de simulado validada
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: {
            analiseUrl: analiseUrl,
            analiseProcessada: true,
            analiseValidada: true,
            aguardandoAnalise: false,
            updatedAt: new Date()
          }
        });
        
        console.log("[Webhook] Análise de simulado validada (camelCase) processada para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Análise de simulado validada processada com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com análise de simulado validada:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar análise de simulado validada: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Verificar se é um espelho de correção
    if (isEspelho) {
      console.log("[Webhook] Identificado payload de espelho de correção");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Processar o texto do espelho, que é obrigatório
      const textoDOEspelho = webhookData.textoDOEspelho || null;
      
      if (!textoDOEspelho) {
        console.error("[Webhook] Espelho sem texto (textoDOEspelho)");
        return NextResponse.json({
          success: false,
          message: "Texto do espelho não fornecido (textoDOEspelho)",
        });
      }
      
      console.log("[Webhook] Texto do espelho:", textoDOEspelho ? "Presente" : "Ausente");
      
      try {
        // Verificar imagens do espelho (opcional)
        let urlsEspelho: string[] = [];
        
        if (webhookData.arquivos_imagens_espelho && 
            Array.isArray(webhookData.arquivos_imagens_espelho) && 
            webhookData.arquivos_imagens_espelho.length > 0) {
          
          console.log("[Webhook] Processando imagens do espelho");
          const imagensEspelho = webhookData.arquivos_imagens_espelho;
          urlsEspelho = imagensEspelho.map((item: { url: string }) => item.url);
          console.log("[Webhook] URLs do espelho:", urlsEspelho);
        } else {
          console.log("[Webhook] Nenhuma imagem do espelho fornecida, processando apenas o texto");
        }
        
        // Atualizar o lead com as informações do espelho
        const leadUpdateData: any = {
          textoDOEspelho: textoDOEspelho,
          updatedAt: new Date()
        };
        
        // Adicionar espelhoCorrecao apenas se houver imagens
        if (urlsEspelho.length > 0) {
          leadUpdateData.espelhoCorrecao = JSON.stringify(urlsEspelho);
        }
        
        console.log("[Webhook] Atualizando lead com dados:", leadUpdateData);
        
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: leadUpdateData
        });
        
        console.log("[Webhook] Espelho de correção processado para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Espelho de correção processado com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com espelho:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar espelho: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }

    // Verificar se é um espelho de consultoria fase 2
    if (isEspelhoConsultoriaFase2) {
      console.log("[Webhook] Identificado payload de espelho de consultoria fase 2");
      
      // Verificar se temos o leadID
      let leadID = webhookData.leadID;
      
      // Buscar pelo telefone se não tiver o leadID
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Processar o texto do espelho de consultoria
      const textoDOEspelho = webhookData.textoDOEspelho || null;
      
      console.log("[Webhook] Texto do espelho de consultoria:", textoDOEspelho ? "Presente" : "Ausente");
      
      try {
        // Verificar imagens do espelho (opcional)
        let urlsEspelho: string[] = [];
        
        if (webhookData.arquivos_imagens_espelho && 
            Array.isArray(webhookData.arquivos_imagens_espelho) && 
            webhookData.arquivos_imagens_espelho.length > 0) {
          
          console.log("[Webhook] Processando imagens do espelho de consultoria");
          const imagensEspelho = webhookData.arquivos_imagens_espelho;
          urlsEspelho = imagensEspelho.map((item: { url: string }) => item.url);
          console.log("[Webhook] URLs do espelho de consultoria:", urlsEspelho);
        }
        
        // Atualizar o lead com as informações do espelho de consultoria
        const leadUpdateData: any = {
          updatedAt: new Date()
        };
        
        // Adicionar texto do espelho se fornecido
        if (textoDOEspelho) {
          leadUpdateData.textoDOEspelho = textoDOEspelho;
        }
        
        // Adicionar espelhoCorrecao apenas se houver imagens
        if (urlsEspelho.length > 0) {
          leadUpdateData.espelhoCorrecao = JSON.stringify(urlsEspelho);
        }
        
        console.log("[Webhook] Atualizando lead com dados de consultoria:", leadUpdateData);
        
        const leadUpdate = await prisma.leadChatwit.update({
          where: {
            id: leadID
          },
          data: leadUpdateData
        });
        
        console.log("[Webhook] Espelho de consultoria fase 2 processado para o lead:", leadID);
        
        // SSE desabilitado
        console.log("[Webhook] Notificação SSE desabilitada");
        
        return NextResponse.json({
          success: true,
          message: "Espelho de consultoria fase 2 processado com sucesso",
        });
      } catch (error: any) {
        console.error("[Webhook] Erro ao atualizar lead com espelho de consultoria:", error);
        return NextResponse.json({
          success: false,
          message: `Erro ao processar espelho de consultoria: ${error.message || 'Erro desconhecido'}`,
        }, { status: 500 });
      }
    }
    
    // Verificar se é um manuscrito processado
    if (isManuscrito && webhookData.textoDAprova) {
      console.log("[Webhook] Identificado payload de manuscrito processado");
      
      // Primeira tentativa: usar o leadID do payload
      let leadID = webhookData.leadID;
      
      // Segunda tentativa: buscar pelo telefone
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Adicionar à fila de processamento
      await addManuscritoJob({
        leadID: leadID,
        textoDAprova: webhookData.textoDAprova
      });
      
      // Juntar os "output" em uma única string com separadores
      const conteudoUnificado = webhookData.textoDAprova
        .map((item: { output: string }) => item.output)
        .join('\n\n---------------------------------\n\n');
        
      // Atualizar o lead com o texto manuscrito
      const leadUpdate = await prisma.leadChatwit.update({
        where: {
          id: leadID
        },
        data: {
          provaManuscrita: conteudoUnificado,
          manuscritoProcessado: true,
          aguardandoManuscrito: false,
          updatedAt: new Date()
        }
      });
      
      console.log("[Webhook] Manuscrito adicionado à fila de processamento");
      
      // SSE desabilitado
      console.log("[Webhook] Notificação SSE desabilitada");
      
      return NextResponse.json({
        success: true,
        message: "Manuscrito adicionado à fila de processamento",
      });
    }
    
    // Se não for identificado como espelho, manuscrito, pré-análise, pré-análise de simulado, análise ou análise de simulado
    console.error("[Webhook] Payload não identificado como espelho, manuscrito, pré-análise, pré-análise de simulado, análise, análise de simulado, validação ou validação de simulado");
    console.error("[Webhook] Valores das flags - espelho:", webhookData.espelho, 
      "espelhoConsultoriaFase2:", webhookData.espelhoconsultoriafase2, "manuscrito:", webhookData.manuscrito, "análise:", webhookData.analise,
      "análiseSimulado:", webhookData.analisesimulado, "pré-análise:", webhookData.analisepreliminar, "préAnaliseSimulado:", webhookData.analisesimuladopreliminar,
      "analiseValidada:", webhookData.analiseValidada, "analiseSimuladoValidada:", webhookData.analisesimuladovalidado);
    console.error("[Webhook] Campos disponíveis:", Object.keys(webhookData));
    
    return NextResponse.json({
      success: false,
      message: "Payload não identificado como manuscrito, espelho, pré-análise, pré-análise de simulado, análise, análise de simulado, validação ou validação de simulado",
      debug: webhookData // Incluir o payload para debug
    });
    
  } catch (error: any) {
    console.error("[Webhook] Erro ao processar webhook:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro interno ao processar webhook",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Verifica se o webhook está funcionando
 */
export async function GET(request: Request): Promise<Response> {
  return NextResponse.json(
    { status: "Webhook do Chatwit funcionando corretamente" },
    { status: 200 }
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
