import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handler da rota POST para enviar manuscrito para processamento.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[Enviar Manuscrito] Recebendo requisição POST");
    
    // Obter a URL do webhook do ambiente
    const webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error("[Enviar Manuscrito] URL do webhook não configurada no ambiente");
      throw new Error("URL do webhook não configurada");
    }
    
    // Obter o payload completo
    const payload = await request.json();
    console.log("[Enviar Manuscrito] Dados recebidos:", JSON.stringify(payload, null, 2));
    
    // Atualizar o lead para aguardandoManuscrito = true
    const leadId = payload.leadID;
    
    if (leadId) {
      await prisma.leadChatwit.update({
        where: { id: leadId },
        data: { aguardandoManuscrito: true }
      });
      console.log("[Enviar Manuscrito] Lead marcado como aguardando processamento");
    }
    
    // Enviar o payload para o sistema externo
    console.log("[Enviar Manuscrito] Enviando payload para processamento:", webhookUrl);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro ao processar resposta" }));
      console.error("[Enviar Manuscrito] Erro na resposta do sistema externo:", errorData);
      
      // Resetar aguardandoManuscrito para false em caso de erro
      if (leadId) {
        await prisma.leadChatwit.update({
          where: { id: leadId },
          data: { aguardandoManuscrito: false }
        }).catch(e => {
          console.error("[Enviar Manuscrito] Erro ao resetar estado do lead:", e);
        });
      }
      
      throw new Error(errorData.message || "Erro ao enviar manuscrito para processamento");
    }

    console.log("[Enviar Manuscrito] Manuscrito enviado com sucesso");
    return NextResponse.json({
      success: true,
      message: "Manuscrito enviado para processamento",
    });

  } catch (error: any) {
    console.error("[Enviar Manuscrito] Erro ao enviar manuscrito:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro interno ao enviar manuscrito",
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 