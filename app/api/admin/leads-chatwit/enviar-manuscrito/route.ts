import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handler da rota POST para enviar manuscrito, espelho ou prova para processamento.
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
    const isEspelho = payload.espelho === true;
    const isProva = payload.prova === true;
    
    // Obter o tipo do documento para logs
    const docType = isManuscrito ? 'Manuscrito' : isEspelho ? 'Espelho' : isProva ? 'Prova' : 'Documento';
    
    // Atualizar o lead para o estado apropriado
    const leadId = payload.leadID;
    
    if (leadId) {
      if (isManuscrito && !isEspelho && !isProva) { // Garantir que é apenas manuscrito
        await prisma.leadChatwit.update({
          where: { id: leadId },
          data: { aguardandoManuscrito: true }
        });
        console.log("[Enviar Manuscrito] Lead marcado como aguardando processamento");
      }
      // Não precisamos fazer nada especial para o espelho ou prova, já que o próprio cliente
      // atualiza o estado do espelhoCorrecao no banco de dados se necessário
    }
    
    // Enviar o payload para o sistema externo
    console.log(`[Enviar ${docType}] Enviando payload para processamento:`, webhookUrl);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro ao processar resposta" }));
      console.error(`[Enviar ${docType}] Erro na resposta do sistema externo:`, errorData);
      
      // Resetar aguardandoManuscrito para false em caso de erro (apenas para manuscrito)
      if (isManuscrito && !isEspelho && !isProva && leadId) {
        await prisma.leadChatwit.update({
          where: { id: leadId },
          data: { aguardandoManuscrito: false }
        }).catch(e => {
          console.error("[Enviar Manuscrito] Erro ao resetar estado do lead:", e);
        });
      }
      
      throw new Error(errorData.message || `Erro ao enviar ${docType.toLowerCase()} para processamento`);
    }

    console.log(`[Enviar ${docType}] Enviado com sucesso`);
    return NextResponse.json({
      success: true,
      message: `${docType} enviado para processamento`,
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