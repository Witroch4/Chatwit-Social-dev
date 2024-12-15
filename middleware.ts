// middleware.ts

import { auth } from "@/auth"; // Importa a função auth do arquivo de configuração centralizado
import { NextResponse } from "next/server";
import { configRoutes } from "./config/routes";
import { createRouteMatchers } from "./lib/route";

export default auth(async (req) => {
  const { isPublicRoute, isProtectedRoute, isApiRoute, isAuthRoute } = createRouteMatchers(configRoutes, req);
  const { nextUrl } = req;

  // Obtém a sessão do usuário
  const session = await auth(req);
  const isLoggedIn = !!session;

  console.log(`Public: ${isPublicRoute}`);
  console.log(`Protected: ${isProtectedRoute}`);
  console.log(`Api: ${isApiRoute}`);
  console.log(`Auth: ${isAuthRoute}`);

  // Redireciona para a página de login se tentar acessar uma rota protegida sem estar autenticado
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Redireciona usuários logados da home para o dashboard
  if (isLoggedIn && nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  console.log(`Middleware: ${req.nextUrl.pathname}`);

  // Retorna a resposta padrão se nenhuma condição de redirecionamento for atendida
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|docs|auth/login).*)", // Removido auth/instagram/callback
  ],
};
