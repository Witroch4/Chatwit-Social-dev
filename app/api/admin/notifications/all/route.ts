import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: Obter todas as notificações com informações dos usuários
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    // Verificar se o usuário é administrador
    const adminUser = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    });

    if (adminUser?.role !== "ADMIN") {
      return new NextResponse("Acesso negado", { status: 403 });
    }

    // Buscar todas as notificações com informações dos usuários
    const notifications = await prisma.notification.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[ADMIN_ALL_NOTIFICATIONS_GET]", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}