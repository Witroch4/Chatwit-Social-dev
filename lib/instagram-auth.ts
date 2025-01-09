// lib/instagram-auth.ts
import { prisma } from "@/lib/prisma"; // <-- Ajuste para seu caminho real do Prisma

/**
 * Função para buscar o token do usuário do Instagram no banco de dados,
 * usando o providerAccountId (igUserId) como chave.
 */
export async function getInstagramUserToken(igUserId: string): Promise<string | null> {
  try {
    // Buscamos na tabela 'Account'
    const instagramAccount = await prisma.account.findFirst({
      where: {
        provider: "instagram",
        providerAccountId: igUserId,  // <-- "igUserId" é o ID do Instagram
      },
    });

    if (!instagramAccount) {
      // Se não encontrou nenhuma conta do Instagram para esse IG User ID
      return null;
    }

    // Se encontrou, retornamos o access_token
    return instagramAccount.access_token ?? null;
  } catch (error) {
    console.error("[getInstagramUserToken] Erro ao buscar no banco:", (error as Error)?.message);
    return null;
  }
}
