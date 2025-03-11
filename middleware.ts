// middleware.ts
import { auth } from "@/auth"; // Importe o auth já configurado
import { NextResponse } from "next/server";
import { configRoutes } from "./config/routes/index";
import { createRouteMatchers } from "./lib/route";

export default auth(async (req) => {
  // Adaptando configRoutes para o formato esperado por createRouteMatchers
  const routeConfig = {
    public: configRoutes.publicRoutes,
    protected: configRoutes.protectedRoutes,
    api: configRoutes.apiRoutes,
    auth: configRoutes.authRoutes,
    admin: configRoutes.adminRoutes
  };

  const { isPublicRoute, isProtectedRoute, isApiRoute, isAuthRoute, isAdminRoute } =
    createRouteMatchers(routeConfig, req);
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
    try {
      if (!req.auth?.user?.id) {
        console.log('ID do usuário não disponível, redirecionando para /registro/redesocial');
        return NextResponse.redirect(new URL("/registro/redesocial?refresh=true", req.url));
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
          const mainAccount = accounts.find(account => account.isMain === true) || accounts[0];
          console.log(`Redirecionando para /${mainAccount.providerAccountId}/dashboard`);
          return NextResponse.redirect(new URL(`/${mainAccount.providerAccountId}/dashboard`, req.url));
        } else {
          console.log('Nenhuma conta encontrada, redirecionando para /registro/redesocial');
          return NextResponse.redirect(new URL("/registro/redesocial?refresh=true", req.url));
        }
      } else {
        console.log('Erro ao verificar contas, redirecionando para /registro/redesocial');
        return NextResponse.redirect(new URL("/registro/redesocial?refresh=true", req.url));
      }
    } catch (error) {
      console.error('Erro ao verificar contas do Instagram:', error);
      return NextResponse.redirect(new URL("/registro/redesocial?refresh=true", req.url));
    }
  }

  // Verifica se a rota é admin e se o usuário possui a role "ADMIN"
  if (isAdminRoute && (!isLoggedIn || userRole !== "ADMIN")) {
    return NextResponse.redirect(new URL("/denied", req.url));
  }

  // =============================
  // VERIFICAÇÃO DE ASSINATURA ATIVA
  // =============================
  const accountIdPattern = /^\/([^\/]+)\/dashboard/;
  const match = nextUrl.pathname.match(accountIdPattern);

  if (match && match[1]) {
    // Verifica se é uma subrota do dashboard (não apenas a rota principal)
    const isSubRoute = !/^\/[^\/]+\/dashboard\/?$/.test(nextUrl.pathname);

    if (isSubRoute) {
      const subscriptionCookie = req.cookies.get("subscription-active");
      const hasActiveSubscription = subscriptionCookie?.value === "true";

      console.log(`Verificando assinatura para rota ${nextUrl.pathname}`);
      console.log(`Cookie de assinatura: ${subscriptionCookie?.value}`);
      console.log(`Assinatura ativa: ${hasActiveSubscription}`);

      if (!hasActiveSubscription) {
        console.log("Acesso restrito: Usuário não possui assinatura ativa (verificação por cookie).");
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
    "/((?!api|_next/static|_next/image|favicon.ico|docs|auth/login|denied|animations).*)",
  ],
};

