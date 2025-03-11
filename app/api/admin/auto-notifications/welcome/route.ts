import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST: Enviar notificação de boas-vindas para todos os usuários
export async function POST(req: Request) {
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

    // Buscar todos os usuários
    const users = await prisma.user.findMany({
      select: {
        id: true,
      }
    });

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        count: 0,
        message: "Nenhum usuário encontrado para enviar notificações"
      }, { status: 404 });
    }

    // Criar notificações para cada usuário
    const title = "Bem-vindo ao ChatWit Social!";
    const message = "Olá! Bem-vindo à plataforma ChatWit Social. Aqui você pode gerenciar suas redes sociais, automatizar interações e muito mais. Explore todas as funcionalidades disponíveis e aproveite ao máximo nossa plataforma!";

    const notifications = await Promise.all(
      users.map(async (user) => {
        return prisma.notification.create({
          data: {
            userId: user.id,
            title,
            message
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: notifications.length,
      message: `${notifications.length} notificações de boas-vindas enviadas com sucesso`
    });
  } catch (error) {
    console.error("[ADMIN_WELCOME_NOTIFICATIONS]", error);
    return NextResponse.json({
      success: false,
      count: 0,
      message: "Erro ao enviar notificações de boas-vindas"
    }, { status: 500 });
  }
}