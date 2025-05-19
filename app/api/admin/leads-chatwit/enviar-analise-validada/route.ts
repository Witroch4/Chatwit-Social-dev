import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handler da rota POST para enviar análise validada para geração do PDF.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[Enviar Análise Validada] Recebendo requisição POST");
    
    // Obter a URL do webhook do ambiente
    const webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error("[Enviar Análise Validada] URL do webhook não configurada no ambiente");
      throw new Error("URL do webhook não configurada");
    }
    
    // Obter o payload completo
    const payload = await request.json();
    console.log("[Enviar Análise Validada] Dados recebidos:", JSON.stringify(payload, null, 2));
    
    // Verificar se o leadID foi fornecido
    const leadId = payload.leadID;
    
    if (!leadId) {
      console.error("[Enviar Análise Validada] leadID não fornecido");
      throw new Error("leadID não fornecido");
    }
    
    // Buscar o lead no banco de dados
    const lead = await prisma.leadChatwit.findUnique({
      where: { id: leadId }
    });
    
    if (!lead) {
      console.error("[Enviar Análise Validada] Lead não encontrado:", leadId);
      throw new Error("Lead não encontrado");
    }
    
    // Marcar o lead como análise validada
    await prisma.leadChatwit.update({
      where: { id: leadId },
      data: { 
        analiseValidada: true,
        // Atualizar o payload da análise preliminar, caso tenha sido editado
        analisePreliminar: payload.analiseData
      }
    });
    
    console.log("[Enviar Análise Validada] Lead marcado como análise validada");
    
    // Extrair os dados da análise preliminar
    const analiseData = payload.analiseData || {};
    
    // Preparar o payload para envio com as flags requeridas e garantir que todos os campos do cabeçalho estejam presentes
    const requestPayload = {
      // Flags necessárias para o sistema externo
      leadID: leadId,
      analisevalidada: true,
      telefone: lead.phoneNumber,
      
      // Garantir que os campos do cabeçalho estejam explicitamente presentes
      exameDescricao: analiseData.exameDescricao || "",
      inscricao: analiseData.inscricao || "",
      nomeExaminando: analiseData.nomeExaminando || lead.nomeReal || lead.name || "",
      seccional: analiseData.seccional || "",
      areaJuridica: analiseData.areaJuridica || "",
      notaFinal: analiseData.notaFinal || "",
      situacao: analiseData.situacao || "",
      
      // Garantir que os outros dados da análise também estejam presentes
      pontosPeca: analiseData.pontosPeca || [],
      subtotalPeca: analiseData.subtotalPeca || "",
      pontosQuestoes: analiseData.pontosQuestoes || [],
      subtotalQuestoes: analiseData.subtotalQuestoes || "",
      conclusao: analiseData.conclusao || "",
      argumentacao: analiseData.argumentacao || [],
      
      // Incluir o restante dos dados da análise preliminar
      ...analiseData,
      
      // Adicionar flag de análise preliminar
      analisepreliminar: true
    };
    
    // Logar o payload final que será enviado
    console.log("[Enviar Análise Validada] Payload final para envio:", JSON.stringify(requestPayload, null, 2));
    
    // Enviar para o sistema externo
    console.log("[Enviar Análise Validada] Enviando payload para processamento:", webhookUrl);
    
    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    }).then(response => {
      if (!response.ok) {
        console.error("[Enviar Análise Validada] Erro na resposta do sistema externo:", response.status);
      } else {
        console.log("[Enviar Análise Validada] Enviado com sucesso para o sistema externo");
      }
    }).catch(error => {
      console.error("[Enviar Análise Validada] Erro ao enviar para o sistema externo:", error);
    });
    
    // Responder imediatamente ao cliente, independente do resultado do webhook
    return NextResponse.json({
      success: true,
      message: "Análise validada enviada com sucesso",
    });
    
  } catch (error: any) {
    console.error("[Enviar Análise Validada] Erro ao enviar solicitação:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro interno ao enviar análise validada",
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 