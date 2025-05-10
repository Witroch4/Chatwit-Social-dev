import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Esta rota não é mais utilizada para processamento de manuscritos em tempo real.
 * Todo o processamento de manuscritos acontece de forma síncrona agora.
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação usando auth.js v5
    const session = await auth();
    
    // Verificar se o usuário está autenticado e tem role de admin
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Retornar uma resposta explicativa sobre a mudança
    return NextResponse.json({ 
      message: "Esta funcionalidade foi descontinuada.",
      details: "O processamento de manuscritos agora é síncrono. O botão muda para 'Editar Manuscrito' imediatamente após o envio."
    });
    
  } catch (error: any) {
    console.error("[SSE] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

/**
 * Função placeholder para compatibilidade com o trigger-sse.
 * Esta função não faz nada pois não há mais conexões SSE ativas.
 */
export function sendEventToLead(leadId: string, eventName: string, data: any) {
  console.log(`[SSE] Evento ignorado (funcionalidade descontinuada): ${eventName} para lead ${leadId}`);
  return true; // Retorna true para não quebrar o fluxo de chamadas existentes
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 