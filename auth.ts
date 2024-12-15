// auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { prisma } from "./lib/db";
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
        const registeredUser = await findUserbyEmail(user?.email);
        if (!registeredUser?.emailVerified) return false;
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      console.log("Início do callback JWT:");
      console.log("Trigger:", trigger);
      console.log("Token antes de atualizações:", token);

      // Atualizações no caso de trigger "update"
      if (trigger && trigger === "update" && session) {
        console.log("Atualizando token com base na sessão:");
        console.log("Sessão recebida:", session);
        token.isTwoFactorEnabled = session.user.isTwoFactorEnabled;
        console.log("Token atualizado (update):", token);
        return token;
      }

      // Adicionar informações do usuário ao token
      if (user) {
        console.log("Usuário detectado durante sign-in:", user);

        if (user.id) {
          const isTwoFactorEnabled = await isTwoFactorAutenticationEnabled(user.id);
          console.log("Two Factor Authentication habilitado:", isTwoFactorEnabled);
          token.isTwoFactorEnabled = isTwoFactorEnabled;
        }

        if (token.sub) {
          console.log("Buscando conta do Instagram para userId:", token.sub);
          try {
            const instagramAccount = await prisma.account.findFirst({
              where: {
                userId: token.sub as string,
                provider: "instagram",
              },
            });

            if (instagramAccount) {
              console.log("Conta do Instagram encontrada:", instagramAccount);
              token.instagramAccessToken = instagramAccount.access_token ?? undefined;
              token.instagramExpiresAt = instagramAccount.expires_at ?? undefined;
            } else {
              console.log("Nenhuma conta do Instagram encontrada.");
              token.instagramAccessToken = undefined;
              token.instagramExpiresAt = undefined;
            }
          } catch (error) {
            console.error("Erro ao buscar token do Instagram:", error);
            token.instagramAccessToken = undefined;
            token.instagramExpiresAt = undefined;
          }
        }

        token.role = UserRole.DEFAULT;
        console.log("Token atualizado após processamento do usuário:", token);
      }

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
        session.user.instagramExpiresAt = token.instagramExpiresAt as number | undefined;
      }

      return session;
    },
  },
  ...authConfig,
});
