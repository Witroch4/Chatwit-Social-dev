import { NextRequest, NextResponse } from 'next/server';
import { sseManager } from '@/lib/sse-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');
  
  if (!leadId) {
    return NextResponse.json({ error: 'leadId é obrigatório' }, { status: 400 });
  }
  
  const activeConnections = sseManager.getConnectionsForLead(leadId);
  console.log(`[SSE Check] Verificação de conexões para ${leadId}: ${activeConnections} ativas`);
  
  return NextResponse.json({
    leadId,
    hasActiveConnections: activeConnections > 0,
    connectionCount: activeConnections,
    totalConnections: sseManager.getConnectionsCount(),
    retryQueueSize: sseManager.getRetryQueueSize()
  });
} 