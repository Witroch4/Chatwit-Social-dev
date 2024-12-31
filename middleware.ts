// middleware.ts
import { auth } from "@/auth"; // Importe o auth já configurado
import { NextResponse } from "next/server";
import { configRoutes } from "./config/routes";
import { createRouteMatchers } from "./lib/route";

export default auth(async (req) => {
  const { isPublicRoute, isProtectedRoute, isApiRoute, isAuthRoute, isAdminRoute } = createRouteMatchers(configRoutes, req);
  const { nextUrl } = req;

  // Obtenha a role do usuário do token
  const debug = req.auth?.user.role;
  const isLoggedIn = !!req.auth;
  console.log(`witrocha: ${debug}`);

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

  // Exemplo: Verificar se a rota é admin e se o usuário é admin
  if (isAdminRoute && (!isLoggedIn || debug !== "ADMIN")) {
    return NextResponse.redirect(new URL("/denied", req.url));
  }

  console.log(`Middleware: ${req.nextUrl.pathname}`);

  // Retorna a resposta padrão se nenhuma condição de redirecionamento for atendida
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|docs|auth/login|denied).*)"
  ],
};
