import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handler da rota POST para enviar manuscrito, espelho ou prova para processamento.
 * Versão simplificada que marca o manuscrito como processado imediatamente.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[Enviar Documento] Recebendo requisição POST");
    
    // Obter a URL do webhook do ambiente
    const webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error("[Enviar Documento] URL do webhook não configurada no ambiente");
      throw new Error("URL do webhook não configurada");
    }
    
    // Obter o payload completo
    const payload = await request.json();
    console.log("[Enviar Documento] Dados recebidos:", JSON.stringify(payload, null, 2));
    
    // Determinar o tipo de documento
    const isManuscrito = payload.manuscrito === true;
    const isEspelho = payload.espelho === true || payload.espelhoconsultoriafase2 === true || payload.espelhoparabiblioteca === true;
    const isProva = payload.prova === true;
    
    // Obter o tipo do documento para logs
    const docType = isManuscrito ? 'Manuscrito' : isEspelho ? 'Espelho' : isProva ? 'Prova' : 'Documento';
    
    // Atualizar o lead para o estado apropriado
    const leadId = payload.leadID;
    
    if (leadId) {
      if (isManuscrito && !isEspelho && !isProva) {
        // Marcar manuscrito como AGUARDANDO processamento
        await prisma.leadChatwit.update({
          where: { id: leadId },
          data: { 
            manuscritoProcessado: false,  // NÃO processado ainda
            aguardandoManuscrito: true    // Aguardando processamento
          }
        });
        console.log("[Enviar Manuscrito] Lead marcado como aguardando processamento");
      } else if (isEspelho && !isManuscrito && !isProva) {
        // Marcar espelho como AGUARDANDO processamento
        await prisma.leadChatwit.update({
          where: { id: leadId },
          data: { 
            espelhoProcessado: false,     // NÃO processado ainda
            aguardandoEspelho: true       // Aguardando processamento
          }
        });
        console.log("[Enviar Espelho] Lead marcado como aguardando processamento");
      }
    }
    
    // Enviar o payload para o sistema externo de forma assíncrona
    // (Não esperamos a resposta para não bloquear o fluxo)
    console.log(`[Enviar ${docType}] Enviando payload para processamento:`, webhookUrl);
    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then(response => {
      if (!response.ok) {
        console.error(`[Enviar ${docType}] Erro na resposta do sistema externo:`, response.status);
      } else {
        console.log(`[Enviar ${docType}] Enviado com sucesso para o sistema externo`);
      }
    }).catch(error => {
      console.error(`[Enviar ${docType}] Erro ao enviar para o sistema externo:`, error);
    });

    // Responder imediatamente ao cliente, independente do resultado do webhook
    return NextResponse.json({
      success: true,
      message: `${docType} processado com sucesso`,
    });

  } catch (error: any) {
    console.error("[Enviar Documento] Erro ao enviar:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro interno ao enviar documento",
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 