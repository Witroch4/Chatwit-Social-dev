import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Use Node.js runtime for Prisma compatibility
export const runtime = 'nodejs';

// GET - Listar sessões de chat
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }
    
    const chatSessions = await db.chatSession.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
    
    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error("[CHAT_SESSIONS_GET]", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}

// POST - Criar nova sessão de chat
export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }
    
    const { title, model = "chatgpt-4o-latest" } = await req.json();
    
    const chatSession = await db.chatSession.create({
      data: {
        userId: session.user.id,
        title: title || "Nova conversa",
        model
      }
    });
    
    return NextResponse.json(chatSession);
  } catch (error) {
    console.error("[CHAT_SESSIONS_POST]", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
} 