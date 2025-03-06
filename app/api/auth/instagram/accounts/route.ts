import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: "instagram"
      },
      select: {
        id: true,
        providerAccountId: true,
        access_token: true,
        createdAt: true,
        updatedAt: true,
        igUserId: true,
        igUsername: true,
        isMain: true
      },
      orderBy: [
        { createdAt: 'asc' } // Ordenar por data de criação (mais antigas primeiro)
      ]
    });

    // Mapear os resultados para garantir que todos os campos necessários estejam presentes
    const mappedAccounts = accounts.map(account => ({
      id: account.id,
      providerAccountId: account.providerAccountId,
      access_token: account.access_token,
      igUsername: account.igUsername || "Instagram",
      igUserId: account.igUserId || account.providerAccountId,
      isMain: account.isMain || false,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }));

    return NextResponse.json({
      accounts: mappedAccounts,
      totalAccounts: mappedAccounts.length
    });
  } catch (error) {
    console.error("Erro ao buscar contas do Instagram:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao buscar as contas do Instagram" },
      { status: 500 }
    );
  }
}