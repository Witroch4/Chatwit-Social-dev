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
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  trustHost: true,
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
     // console.log("Início do callback JWT:", { trigger });

      if (trigger === "update" && session) {
        console.log("Atualizando token com base na sessão");
        token.isTwoFactorEnabled = session.user.isTwoFactorEnabled;
        token.instagramAccessToken = session.user.instagramAccessToken;

        if (session.user.providerAccountId) {
          token.providerAccountId = session.user.providerAccountId;
        }
        return token;
      }

      if (user) {
        console.log("Usuário acabou de fazer login, atualizando token");
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { password: true }
        });
        token.isOAuth = !dbUser?.password;
        token.isTwoFactorEnabled = user.isTwoFactorEnabled || false;

        console.log("Requisição Prisma: Buscando status de autenticação de dois fatores");
        if (!user.id) {
          throw new Error("User id não definido");
        }
        const isTwoFactorEnabled = await isTwoFactorAutenticationEnabled(user.id);
        token.isTwoFactorEnabled = isTwoFactorEnabled;

        console.log("Requisição Prisma: Buscando conta do Instagram");
        const instagramAccount = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "instagram",
          },
        });

        if (instagramAccount) {
          const partialIgToken = instagramAccount.access_token
            ? instagramAccount.access_token.slice(0, 3) + "..."
            : null;
          console.log(`Conta do Instagram encontrada. ProviderAccountId: ${instagramAccount.providerAccountId}, AccessToken parcial: ${partialIgToken}`);

          token.instagramAccessToken = instagramAccount.access_token ?? undefined;
          token.providerAccountId = instagramAccount.providerAccountId;
        } else {
          console.log("Nenhuma conta do Instagram encontrada.");
          token.instagramAccessToken = undefined;
          token.providerAccountId = undefined;
        }

        token.role = user.role as UserRole;
        console.log("Usuário COM A ROLE:", token.role);
      }

      const partialAccess = token.instagramAccessToken
        ? token.instagramAccessToken.slice(0, 3) + "..."
        : undefined;
      // console.log("Token final antes de retornar (PARCIAL IG):", {
      //   ...token,
      //   instagramAccessToken: partialAccess,
      // });

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;
        session.user.role = token.role as UserRole;
        session.user.instagramAccessToken = token.instagramAccessToken as string | undefined;
        session.user.providerAccountId = token.providerAccountId as string | undefined;
      }
      return session;
    },
  },
  ...authConfig,
});
