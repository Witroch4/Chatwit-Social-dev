import { prisma } from "@/lib/prisma";
import { auth, update } from "@/auth"; // <-- IMPORTANTE: trazer a função 'update'
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 1. Remove do banco a conta do Instagram
  await prisma.account.deleteMany({
    where: {
      userId: session.user.id,
      provider: "instagram",
    },
  });

  // 2. Força a atualização do token JWT, setando instagramAccessToken e providerAccountId como undefined
  //    Isso fará com que o callback 'jwt' capture esse estado e limpe o token
  await update({
    user: {
      isTwoFactorEnabled: session?.user?.isTwoFactorEnabled ?? false,
      instagramAccessToken: undefined,
      providerAccountId: undefined,
    },
  });

  // 3. Retorna sucesso
  return NextResponse.json({ success: true });
}
