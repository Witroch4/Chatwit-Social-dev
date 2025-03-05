import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { accountId } = params;

    if (!accountId) {
      return NextResponse.json(
        { error: "ID da conta não fornecido" },
        { status: 400 }
      );
    }

    // Buscar a conta do Instagram específica
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
        provider: "instagram"
      },
      select: {
        id: true,
        providerAccountId: true,
        access_token: true,
        igUsername: true,
        igUserId: true,
        isMain: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada ou não pertence ao usuário" },
        { status: 404 }
      );
    }

    // Mapear os resultados para garantir que todos os campos necessários estejam presentes
    const mappedAccount = {
      id: account.id,
      providerAccountId: account.providerAccountId,
      access_token: account.access_token,
      igUsername: account.igUsername || "Instagram",
      igUserId: account.igUserId || account.providerAccountId,
      isMain: account.isMain || false,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };

    return NextResponse.json(mappedAccount);
  } catch (error) {
    console.error("Erro ao validar conta do Instagram:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao validar a conta do Instagram" },
      { status: 500 }
    );
  }
}