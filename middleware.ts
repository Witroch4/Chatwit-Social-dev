// middleware.ts
import { auth } from "@/auth"; // Importe o auth já configurado
import { NextResponse } from "next/server";
import { configRoutes } from "./config/routes";
import { createRouteMatchers } from "./lib/route";

export default auth(async (req) => {
  const { isPublicRoute, isProtectedRoute, isApiRoute, isAuthRoute, isAdminRoute } =
    createRouteMatchers(configRoutes, req);
  const { nextUrl } = req;

  // Obtenha a role do usuário do token
  const userRole = req.auth?.user.role;
  const isLoggedIn = !!req.auth;
  console.log(`User Role: ${userRole}`);
  console.log(`Public: ${isPublicRoute}`);
  console.log(`Protected: ${isProtectedRoute}`);
  console.log(`Api: ${isApiRoute}`);
  console.log(`Auth: ${isAuthRoute}`);
  console.log(`Admin: ${isAdminRoute}`);

  // Verificar se é uma rota dinâmica de conta
  const isAccountRoute = nextUrl.pathname.match(/^\/[^\/]+\/dashboard/);

  // Redireciona para a página de login se tentar acessar uma rota protegida sem estar autenticado
  if ((isProtectedRoute || isAccountRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Redireciona usuários logados da home para a conta do Instagram ou página de registro
  if (isLoggedIn && nextUrl.pathname === "/") {
    // Verificar se o usuário tem uma conta do Instagram conectada
    try {
      // Garantir que temos o ID do usuário antes de fazer a requisição
      if (!req.auth?.user?.id) {
        console.log('ID do usuário não disponível, redirecionando para /registro/redesocial');
        return NextResponse.redirect(new URL("/registro/redesocial", req.url));
      }

      const subscriptionApiUrl = new URL("/api/auth/instagram/accounts", req.url).toString();
      const cookie = req.headers.get("cookie") || "";
      const response = await fetch(subscriptionApiUrl, {
        headers: { cookie },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        const accounts = data.accounts || [];

        if (Array.isArray(accounts) && accounts.length > 0) {
          // Usuário tem pelo menos uma conta do Instagram, redirecionar para a rota dinâmica
          const mainAccount = accounts.find(account => account.isMain === true) || accounts[0];
          console.log(`Redirecionando para /${mainAccount.providerAccountId}/dashboard`);
          return NextResponse.redirect(new URL(`/${mainAccount.providerAccountId}/dashboard`, req.url));
        } else {
          // Usuário não tem conta do Instagram, redirecionar para a página de registro de rede social
          console.log('Nenhuma conta encontrada, redirecionando para /registro/redesocial');
          return NextResponse.redirect(new URL("/registro/redesocial", req.url));
        }
      } else {
        // Erro ao verificar contas, redirecionar para a página de registro
        console.log('Erro ao verificar contas, redirecionando para /registro/redesocial');
        return NextResponse.redirect(new URL("/registro/redesocial", req.url));
      }
    } catch (error) {
      console.error('Erro ao verificar contas do Instagram:', error);
      return NextResponse.redirect(new URL("/registro/redesocial", req.url));
    }
  }

  // Verifica se a rota é admin e se o usuário possui a role "ADMIN"
  if (isAdminRoute && (!isLoggedIn || userRole !== "ADMIN")) {
    return NextResponse.redirect(new URL("/denied", req.url));
  }

  // =============================
  // NOVA VERIFICAÇÃO: Rotas que exigem assinatura ativa
  // =============================
  // Verifica se estamos em uma rota de dashboard de conta
  const accountIdPattern = /^\/([^\/]+)\/dashboard/;
  const match = nextUrl.pathname.match(accountIdPattern);

  // Verifica se estamos em uma rota de dashboard de conta
  if (match && match[1]) {
    // Verifica se é uma subrota do dashboard (não apenas a rota principal)
    // A rota principal é exatamente /{accountId}/dashboard ou /{accountId}/dashboard/
    const isSubRoute = !/^\/[^\/]+\/dashboard\/?$/.test(nextUrl.pathname);

    if (isSubRoute) {
      // Constrói a URL para a API de assinatura
      const subscriptionApiUrl = new URL("/api/user/subscription", req.url).toString();
      // Repasse os cookies da requisição original para a chamada fetch
      const cookie = req.headers.get("cookie") || "";
      const response = await fetch(subscriptionApiUrl, {
        headers: { cookie },
        cache: "no-store",
      });
      const json = await response.json();
      const subscription = json.subscription;
      console.log("Middleware - Subscription info:", subscription);
      if (!subscription || subscription.status !== "ACTIVE") {
        console.log("Acesso restrito: Usuário não possui assinatura ativa.");
        return NextResponse.redirect(new URL("/assine-agora", req.url));
      }
    }
  }
  // =============================
  // Fim da verificação de assinatura ativa
  // =============================

  console.log(`Middleware: ${req.nextUrl.pathname}`);
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|docs|auth/login|denied).*)",
  ],
};
