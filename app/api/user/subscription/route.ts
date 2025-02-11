// app/api/user/subscription/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Certifique-se de que esse arquivo exporta { auth, handlers, ... } conforme a nova configuração do NextAuth v5
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Obtenha a sessão usando o novo método auth()
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Localize o usuário no banco de dados a partir do email presente na sessão
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Busca o registro de assinatura mais recente do usuário.
  // Caso o usuário possua múltiplos registros, este exemplo retorna o mais recente.
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Retorne o objeto da assinatura (ou null, caso não exista nenhum registro)
  return NextResponse.json({ subscription });
}
