// lib/instagram-auth.ts
import { prisma } from "@/lib/prisma";

/**
 * Retorna o access_token da conta do Instagram
 * com base no igUserId (ex.: "17841468190323715").
 */
export async function getInstagramUserToken(igUserId: string): Promise<string | null> {
  // Buscamos a account com provider="instagram" e igUserId=...
  // (ou se preferir, provider="instagram-business", fica a seu critério).
  const account = await prisma.account.findFirst({
    where: {
      provider: "instagram",
      igUserId: igUserId,
    },
  });

  return account?.access_token ?? null;
}
