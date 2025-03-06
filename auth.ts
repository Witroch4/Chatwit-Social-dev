// auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { prisma } from "./lib/prisma";
import { findUserbyEmail } from "./services";
import { isTwoFactorAutenticationEnabled } from "./services/auth";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
  unstable_update: update,
} = NextAuth({
  adapter: PrismaAdapter(prisma),

  // 1. Defina explicitamente o secret
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ user, email, account, profile }) {
      if (account && (account.provider === "google" || account.provider === "github")) {
        return true;
      }

      if (user.email) {
        console.log("Requisição Prisma: Buscando usuário por email durante sign-in");
        const registeredUser = await findUserbyEmail(user.email);
        if (!registeredUser?.emailVerified) return false;
      }


      return true;
    },

    async jwt({ token, user, trigger, session }) {
      console.log("Início do callback JWT:", { trigger });

      // Atualização do token quando há um gatilho específico (ex.: atualização de perfil)
      if (trigger === "update" && session) {
        console.log("Atualizando token com base na sessão");

        // Remover 'instagramExpiresAt'
        token.isTwoFactorEnabled = session.user.isTwoFactorEnabled;
        token.instagramAccessToken = session.user.instagramAccessToken;

        // Adicionar 'providerAccountId'
        if (session.user.providerAccountId) {
          token.providerAccountId = session.user.providerAccountId;
        }

        return token;
      }

      // Caso seja o primeiro login (user está definido)
      if (user) {
        console.log("Usuário detectado durante sign-in:", user);

        // Requisição para verificar se a autenticação de dois fatores está habilitada
        console.log("Requisição Prisma: Buscando status de autenticação de dois fatores");
        const isTwoFactorEnabled = await isTwoFactorAutenticationEnabled(user.id);
        token.isTwoFactorEnabled = isTwoFactorEnabled;

        // Requisição para buscar a conta do Instagram
        console.log("Requisição Prisma: Buscando conta do Instagram");
        const instagramAccount = await prisma.account.findFirst({
          where: {
            userId: user.id, // user.id ou token.sub (ambos referem-se ao mesmo usuário)
            provider: "instagram",
          },
        });

        if (instagramAccount) {
          console.log("Conta do Instagram encontrada:", instagramAccount);
          token.instagramAccessToken = instagramAccount.access_token ?? undefined;
          // Remover a atribuição de 'instagramExpiresAt'
          // token.instagramExpiresAt = instagramAccount.expires_at ?? undefined;

          // Adicionar 'providerAccountId'
          token.providerAccountId = instagramAccount.providerAccountId;
        } else {
          console.log("Nenhuma conta do Instagram encontrada.");
          token.instagramAccessToken = undefined;
          // Remover a atribuição de 'instagramExpiresAt'
          // token.instagramExpiresAt = undefined;
          token.providerAccountId = undefined;
        }

        token.role = user.role as UserRole;
        console.log("Usuário COM A ROLE:", token.role);
      }

      // Caso não seja sign-in nem update, não faz nenhuma consulta ao banco
      console.log("Token final antes de retornar:", token);
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;
        session.user.role = token.role as UserRole;

        // Incluir o token do Instagram na sessão, se disponível
        session.user.instagramAccessToken = token.instagramAccessToken as string | undefined;
        // Remover 'instagramExpiresAt'
        // session.user.instagramExpiresAt = token.instagramExpiresAt as number | undefined;

        // Incluir 'providerAccountId' na sessão, se disponível
        session.user.providerAccountId = token.providerAccountId as string | undefined;
      }

      return session;
    },
  },
  ...authConfig,
});
