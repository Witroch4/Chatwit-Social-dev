// app/auth/instagram/disconnect/route.ts
import { prisma } from "@/lib/prisma"
import { auth, update } from "@/auth" // <-- IMPORTANTE: trazer a função 'update'
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // 1. Remove do banco a conta do Instagram
  await prisma.account.deleteMany({
    where: {
      userId: session.user.id,
      provider: "instagram",
    },
  })

  // 2. Força a atualização do token JWT, setando instagramAccessToken e providerAccountId como nulos
  //    Isso fará com que o callback 'jwt' capture esse estado e limpe o token
  await update({
    trigger: "update",
    user: {
      // Podemos manter ou não o isTwoFactorEnabled,
      // mas se você não quiser mexer nisso, basta deixá-lo ou usar `session?.user?.isTwoFactorEnabled`.
      isTwoFactorEnabled: session?.user?.isTwoFactorEnabled ?? false,

      instagramAccessToken: null,
      providerAccountId: null,
    },
  })

  // 3. Retorna sucesso
  return NextResponse.json({ success: true })
}
