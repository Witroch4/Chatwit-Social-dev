import { NextRequest, NextResponse } from "next/server";
import { sendEventToLead } from "../sse/route";

// Endpoint interno para disparar eventos SSE
// Esta API é usada pelo worker e outros processos de backend
// para notificar o frontend sobre atualizações de manuscrito

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
    
    // Enviar o evento SSE
    console.log(`[Trigger SSE] Enviando evento '${eventName}' para o lead ${leadId}`);
    await sendEventToLead(leadId, eventName, data);
    
    return NextResponse.json({
      success: true,
      message: "Evento SSE enviado com sucesso"
    });
  } catch (error: any) {
    console.error("[Trigger SSE] Erro ao disparar evento SSE:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao disparar evento SSE" },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 