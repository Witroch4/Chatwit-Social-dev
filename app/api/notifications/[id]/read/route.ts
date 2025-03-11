import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST: Marcar uma notificação específica como lida
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const notificationId = resolvedParams.id;

    if (!notificationId) {
      return new NextResponse("ID da notificação não fornecido", { status: 400 });
    }

    // Verificar se a notificação existe e pertence ao usuário
    const notification = await prisma.notification.findUnique({
      where: {
        id: notificationId,
        userId: session.user.id
      }
    });

    if (!notification) {
      return new NextResponse("Notificação não encontrada", { status: 404 });
    }

    // Marcar a notificação como lida
    await prisma.notification.update({
      where: {
        id: notificationId
      },
      data: {
        isRead: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "Notificação marcada como lida"
    });
  } catch (error) {
    console.error("[NOTIFICATION_READ]", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}