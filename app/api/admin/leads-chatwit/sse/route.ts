import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { auth } from "@/auth";

const prisma = new PrismaClient();

// Armazenamento temporário das conexões SSE
// Chave: leadId, Valor: array de objetos de resposta
const connections: Record<string, Response[]> = {};

// Função para enviar evento para todas as conexões de um lead específico
export async function sendEventToLead(leadId: string, eventName: string, data: any) {
  if (connections[leadId]) {
    const eventData = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    
    // Enviar o evento para todas as conexões deste lead
    connections[leadId].forEach(response => {
      const writer = (response as any).body?.getWriter();
      if (writer) {
        writer.write(new TextEncoder().encode(eventData));
        writer.releaseLock();
      }
    });
    
    console.log(`[SSE] Evento '${eventName}' enviado para o lead ${leadId}`);
  } else {
    console.log(`[SSE] Nenhuma conexão ativa para o lead ${leadId}`);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação usando auth.js v5
    const session = await auth();
    
    // Verificar se o usuário está autenticado e tem role de admin
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Obter o ID do lead da query string
    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json({ error: "ID do lead não fornecido" }, { status: 400 });
    }

    // Verificar se o lead existe
    const lead = await prisma.leadChatwit.findUnique({
      where: { id: leadId },
      select: { id: true }
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    // Configurar stream de resposta
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Enviar evento inicial
        controller.enqueue(encoder.encode(`: conexão estabelecida\n\n`));
        
        // Registrar conexão
        if (!connections[leadId]) {
          connections[leadId] = [];
        }
        
        // Armazenar a resposta para enviar eventos posteriormente
        const response = new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
        
        connections[leadId].push(response);
        
        console.log(`[SSE] Nova conexão estabelecida para o lead ${leadId}`);
        
        // Verificar se o manuscrito já foi processado
        prisma.leadChatwit.findUnique({
          where: { id: leadId },
          select: { manuscritoProcessado: true, provaManuscrita: true }
        }).then(leadData => {
          if (leadData && leadData.manuscritoProcessado) {
            // Enviar evento imediatamente se já estiver processado
            const eventData = `event: manuscrito_processado\ndata: ${JSON.stringify({
              leadId,
              manuscritoProcessado: true,
              provaManuscrita: leadData.provaManuscrita
            })}\n\n`;
            
            controller.enqueue(encoder.encode(eventData));
          }
        });
      },
      cancel() {
        // Remover a conexão quando o cliente desconectar
        if (connections[leadId]) {
          connections[leadId] = connections[leadId].filter(resp => resp !== this);
          
          // Se não houver mais conexões para este lead, remover do objeto
          if (connections[leadId].length === 0) {
            delete connections[leadId];
          }
        }
        console.log(`[SSE] Conexão fechada para o lead ${leadId}`);
      }
    });

    // Retornar a resposta de stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error("[SSE] Erro ao estabelecer conexão SSE:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao estabelecer conexão" },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 