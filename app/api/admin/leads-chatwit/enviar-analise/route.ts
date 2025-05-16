import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handler da rota POST para enviar lead para análise de prova.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[Enviar Análise] Recebendo requisição POST");
    
    // Obter a URL do webhook do ambiente
    const webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error("[Enviar Análise] URL do webhook não configurada no ambiente");
      throw new Error("URL do webhook não configurada");
    }
    
    // Obter o payload completo
    const payload = await request.json();
    console.log("[Enviar Análise] Dados recebidos:", JSON.stringify(payload, null, 2));
    
    // Verificar se o leadID foi fornecido
    const leadId = payload.leadID;
    
    if (!leadId) {
      console.error("[Enviar Análise] leadID não fornecido");
      throw new Error("leadID não fornecido");
    }
    
    // Buscar o lead no banco de dados
    const lead = await prisma.leadChatwit.findUnique({
      where: { id: leadId },
      include: {
        usuario: true,
        arquivos: true
      }
    });
    
    if (!lead) {
      console.error("[Enviar Análise] Lead não encontrado:", leadId);
      throw new Error("Lead não encontrado");
    }
    
    // Marcar o lead como aguardando análise
    await prisma.leadChatwit.update({
      where: { id: leadId },
      data: { 
        aguardandoAnalise: true
      }
    });
    
    console.log("[Enviar Análise] Lead marcado como aguardando análise");
    
    // Formatar o texto do manuscrito e do espelho se existirem
    let textoManuscrito = "";
    if (lead.provaManuscrita) {
      if (typeof lead.provaManuscrita === 'string') {
        textoManuscrito = `Texto da Prova:\n${lead.provaManuscrita}`;
      } else if (Array.isArray(lead.provaManuscrita)) {
        // Caso seja um array de objetos com campo 'output'
        textoManuscrito = "Texto da Prova:\n" + lead.provaManuscrita
          .map((item: any) => typeof item === 'object' && item.output ? item.output : JSON.stringify(item))
          .join('\n\n---------------------------------\n\n');
      } else if (typeof lead.provaManuscrita === 'object') {
        textoManuscrito = `Texto da Prova:\n${JSON.stringify(lead.provaManuscrita, null, 2)}`;
      }
    }
    
    let textoEspelho = "";
    if (lead.textoDOEspelho) {
      if (typeof lead.textoDOEspelho === 'string') {
        textoEspelho = `Espelho da Prova:\n${lead.textoDOEspelho}`;
      } else if (Array.isArray(lead.textoDOEspelho)) {
        // Caso seja um array de objetos com campo 'output'
        textoEspelho = "Espelho da Prova:\n" + lead.textoDOEspelho
          .map((item: any) => typeof item === 'object' && item.output ? item.output : JSON.stringify(item))
          .join('\n\n---------------------------------\n\n');
      } else if (typeof lead.textoDOEspelho === 'object') {
        textoEspelho = `Espelho da Prova:\n${JSON.stringify(lead.textoDOEspelho, null, 2)}`;
      }
    }
    
    // Preparar o payload para envio com a flag de análise
    const requestPayload = {
      ...payload,
      analise: true, // Adicionar a flag de análise
      leadID: leadId,
      nome: lead.nomeReal || lead.name || "Lead sem nome",
      telefone: lead.phoneNumber,
      textoManuscrito: textoManuscrito, // Adiciona o texto do manuscrito formatado
      textoEspelho: textoEspelho, // Adiciona o texto do espelho formatado
      arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
        id: a.id,
        url: a.dataUrl,
        tipo: a.fileType,
        nome: a.fileType
      })),
      arquivos_pdf: lead.pdfUnificado ? [{
        id: lead.id,
        url: lead.pdfUnificado,
        nome: "PDF Unificado"
      }] : [],
      metadata: {
        leadUrl: lead.leadUrl,
        sourceId: lead.sourceId,
        concluido: lead.concluido,
        fezRecurso: lead.fezRecurso,
        manuscritoProcessado: lead.manuscritoProcessado,
        temEspelho: !!lead.espelhoCorrecao
      }
    };
    
    // Enviar para o sistema externo de forma assíncrona
    // (Não esperamos a resposta para não bloquear o fluxo)
    console.log("[Enviar Análise] Enviando payload para processamento:", webhookUrl);
    
    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    }).then(response => {
      if (!response.ok) {
        console.error("[Enviar Análise] Erro na resposta do sistema externo:", response.status);
      } else {
        console.log("[Enviar Análise] Enviado com sucesso para o sistema externo");
      }
    }).catch(error => {
      console.error("[Enviar Análise] Erro ao enviar para o sistema externo:", error);
    });
    
    // Responder imediatamente ao cliente, independente do resultado do webhook
    return NextResponse.json({
      success: true,
      message: "Solicitação de análise enviada com sucesso",
    });
    
  } catch (error: any) {
    console.error("[Enviar Análise] Erro ao enviar solicitação:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro interno ao enviar solicitação de análise",
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
