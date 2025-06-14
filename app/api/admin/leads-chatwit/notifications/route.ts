import { sseManager } from '@/lib/sse-manager';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');
  const action = searchParams.get('action');
  
  // Endpoint para verificar conexões ativas (retorna JSON)
  if (action === 'check' && leadId) {
    const activeConnections = sseManager.getConnectionsForLead(leadId);
    console.log(`[SSE API] Verificação de conexões para ${leadId}: ${activeConnections} ativas`);
    
    return NextResponse.json({
      leadId,
      hasActiveConnections: activeConnections > 0,
      connectionCount: activeConnections,
      totalConnections: sseManager.getConnectionsCount()
    });
  }

  // Para SSE, sempre retornar stream mesmo se leadId estiver ausente
  console.log(`[SSE API] Iniciando stream SSE para leadId: ${leadId || 'undefined'}`);

  const stream = new ReadableStream({
    start(controller) {
      if (!leadId) {
        // Enviar erro via SSE em vez de retornar JSON
        console.log(`[SSE API] ❌ leadId não fornecido, enviando erro via SSE`);
        controller.enqueue(`data: ${JSON.stringify({
          type: 'error',
          message: 'leadId é obrigatório',
          timestamp: new Date().toISOString()
        })}\n\n`);
        controller.close();
        return;
      }

      // Adicionar conexão ao manager
      sseManager.addConnection(leadId, controller);
      
      console.log(`[SSE API] ✅ Stream iniciado para leadId: ${leadId}`);
      
      // Enviar evento inicial de conexão
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Conexão SSE estabelecida com sucesso',
        leadId: leadId,
        timestamp: new Date().toISOString()
      })}\n\n`);
    },
    cancel() {
      console.log(`[SSE API] Stream cancelado pelo cliente para leadId: ${leadId}`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Endpoint POST para enviar notificações via HTTP
export async function POST(request: NextRequest) {
  try {
    const { leadId, data } = await request.json();
    
    if (!leadId || !data) {
      return NextResponse.json({ error: 'leadId e data são obrigatórios' }, { status: 400 });
    }
    
    console.log(`[SSE API] Enviando notificação via HTTP para ${leadId}:`, data);
    
    const sent = sseManager.sendNotification(leadId, data);
    
    return NextResponse.json({
      success: true,
      leadId,
      notificationsSent: sent,
      message: sent > 0 ? 'Notificação enviada com sucesso' : 'Nenhuma conexão ativa encontrada'
    });
    
  } catch (error: any) {
    console.error('[SSE API] Erro ao enviar notificação via HTTP:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 