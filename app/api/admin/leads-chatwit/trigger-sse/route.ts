import { NextRequest, NextResponse } from "next/server";
import { sendEventToLead } from "../sse/route";

/**
 * Endpoint interno para disparar eventos SSE
 * Esta API foi simplificada e agora apenas registra logs.
 * O processamento de manuscritos agora é síncrono.
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar chave de API interna para segurança
    const apiKey = req.headers.get("X-API-Key");
    const internalApiKey = process.env.INTERNAL_API_KEY || "desenvolvimento";
    
    if (apiKey !== internalApiKey) {
      console.error("[Trigger SSE] Acesso não autorizado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    // Obter os dados do payload
    const payload = await req.json();
    const { leadId, eventName, data } = payload;
    
    if (!leadId || !eventName || !data) {
      console.error("[Trigger SSE] Dados incompletos", payload);
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }
    
    // Log apenas para controle
    console.log(`[Trigger SSE] Recebido evento '${eventName}' para o lead ${leadId} - Ignorando (funcionalidade descontinuada)`);
    sendEventToLead(leadId, eventName, data);
    
    return NextResponse.json({
      success: true,
      message: "Evento processado (funcionalidade descontinuada)"
    });
  } catch (error: any) {
    console.error("[Trigger SSE] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 