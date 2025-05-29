import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Node.js runtime to support Prisma
export const runtime = 'nodejs';

// GET - Obter uma sessão específica
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }
    
    const chatSession = await db.chatSession.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
    
    if (!chatSession) {
      return new NextResponse("Sessão não encontrada", { status: 404 });
    }
    
    return NextResponse.json(chatSession);
  } catch (error) {
    console.error("[CHAT_SESSION_GET]", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}

// PATCH - Atualizar uma sessão específica
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }
    
    const { title, model, lastResponseId } = await req.json();
    
    console.log(`🔧 PATCH sessão ${sessionId}:`, { title, model, lastResponseId });
    
    // Verificar se a sessão pertence ao usuário
    const chatSession = await db.chatSession.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    });
    
    if (!chatSession) {
      return new NextResponse("Sessão não encontrada", { status: 404 });
    }
    
    const updatedSession = await db.chatSession.update({
      where: {
        id: sessionId
      },
      data: {
        ...(title && { title }),
        ...(model && { model }),
        ...(lastResponseId && { lastResponseId })
      }
    });
    
    console.log(`✅ Sessão ${sessionId} atualizada:`, {
      title: updatedSession.title,
      model: updatedSession.model,
      lastResponseId: updatedSession.lastResponseId
    });
    
    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("[CHAT_SESSION_PATCH]", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}

// DELETE - Excluir uma sessão específica
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }
    
    // Verificar se a sessão pertence ao usuário
    const chatSession = await db.chatSession.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    });
    
    if (!chatSession) {
      return new NextResponse("Sessão não encontrada", { status: 404 });
    }
    
    // Excluir a sessão
    await db.chatSession.delete({
      where: {
        id: sessionId
      }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CHAT_SESSION_DELETE]", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
} 