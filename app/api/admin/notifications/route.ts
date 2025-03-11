import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: Listar todos os usuários (apenas para administradores)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    // Verificar se o usuário é administrador
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    });

    if (user?.role !== "ADMIN") {
      return new NextResponse("Acesso negado", { status: 403 });
    }

    // Listar todos os usuários
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[ADMIN_USERS_GET]", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}

// POST: Enviar notificação para um ou mais usuários
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    // Verificar se o usuário é administrador
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    });

    if (user?.role !== "ADMIN") {
      return new NextResponse("Acesso negado", { status: 403 });
    }

    const body = await req.json();
    const { userIds, title, message } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new NextResponse("Lista de usuários é obrigatória", { status: 400 });
    }

    if (!title || !message) {
      return new NextResponse("Título e mensagem são obrigatórios", { status: 400 });
    }

    // Criar notificações para cada usuário
    const notifications = await Promise.all(
      userIds.map(async (userId) => {
        return prisma.notification.create({
          data: {
            userId,
            title,
            message
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: notifications.length,
      message: `${notifications.length} notificações enviadas com sucesso`
    });
  } catch (error) {
    console.error("[ADMIN_SEND_NOTIFICATION]", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}