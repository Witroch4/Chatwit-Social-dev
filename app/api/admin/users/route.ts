import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: Listar todos os usuários (apenas para administradores)
export async function GET(req: Request) {
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

    // Verificar se deve incluir as contas
    const url = new URL(req.url);
    const includeAccounts = url.searchParams.get('includeAccounts') !== 'false'; // Por padrão, incluir contas

    // Listar todos os usuários
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTwoFactorAuthEnabled: true,
        createdAt: true,
        image: true,
        accounts: includeAccounts ? {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            type: true,
            access_token: true,
            refresh_token: true,
            expires_at: true,
            token_type: true,
            scope: true,
            id_token: true,
            session_state: true,
            igUserId: true,
            igUsername: true,
            isMain: true,
            createdAt: true,
            updatedAt: true
          }
        } : false
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error("[ADMIN_USERS_GET]", error);
    return new NextResponse("Erro interno", { status: 500 });
  }
}