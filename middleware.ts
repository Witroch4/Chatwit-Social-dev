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

  // Redireciona para a página de login se tentar acessar uma rota protegida sem estar autenticado
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Redireciona usuários logados da home para o dashboard
  if (isLoggedIn && nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Verifica se a rota é admin e se o usuário possui a role "ADMIN"
  if (isAdminRoute && (!isLoggedIn || userRole !== "ADMIN")) {
    return NextResponse.redirect(new URL("/denied", req.url));
  }

  // =============================
  // NOVA VERIFICAÇÃO: Rotas que exigem assinatura ativa
  // =============================
  // Lista de rotas do dashboard que exigem assinatura ativa
  const subscriptionProtectedPaths = [
    "/dashboard/agendamento",
    "/dashboard/calendario", // ajuste conforme sua URL (sem acentos)
    "/dashboard/automacao",
    "/dashboard/chatwit",
  ];

  if (
    subscriptionProtectedPaths.some((path) => req.nextUrl.pathname.startsWith(path))
  ) {
    // Constrói a URL para a API de assinatura
    const subscriptionApiUrl = new URL("/api/user/subscription", req.url).toString();
    // Realiza a requisição para obter as informações de assinatura
    const response = await fetch(subscriptionApiUrl, { cache: "no-store" });
    const json = await response.json();
    const subscription = json.subscription;
    console.log("Middleware - Subscription info:", subscription);
    if (!subscription || subscription.status !== "ACTIVE") {
      console.log("Acesso restrito: Usuário não possui assinatura ativa.");
      return NextResponse.redirect(new URL("/dashboard/assine-agora", req.url));
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
