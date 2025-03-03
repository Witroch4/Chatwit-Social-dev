"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// middleware.ts
const auth_1 = require("@/auth"); // Importe o auth já configurado
const server_1 = require("next/server");
const routes_1 = require("./config/routes");
const route_1 = require("./lib/route");
exports.default = (0, auth_1.auth)(async (req) => {
    var _a;
    const { isPublicRoute, isProtectedRoute, isApiRoute, isAuthRoute, isAdminRoute } = (0, route_1.createRouteMatchers)(routes_1.configRoutes, req);
    const { nextUrl } = req;
    // Obtenha a role do usuário do token
    const userRole = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.user.role;
    const isLoggedIn = !!req.auth;
    console.log(`User Role: ${userRole}`);
    console.log(`Public: ${isPublicRoute}`);
    console.log(`Protected: ${isProtectedRoute}`);
    console.log(`Api: ${isApiRoute}`);
    console.log(`Auth: ${isAuthRoute}`);
    console.log(`Admin: ${isAdminRoute}`);
    // Redireciona para a página de login se tentar acessar uma rota protegida sem estar autenticado
    if (isProtectedRoute && !isLoggedIn) {
        return server_1.NextResponse.redirect(new URL("/auth/login", req.url));
    }
    // Redireciona usuários logados da home para o dashboard
    if (isLoggedIn && nextUrl.pathname === "/") {
        return server_1.NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Verifica se a rota é admin e se o usuário possui a role "ADMIN"
    if (isAdminRoute && (!isLoggedIn || userRole !== "ADMIN")) {
        return server_1.NextResponse.redirect(new URL("/denied", req.url));
    }
    // =============================
    // NOVA VERIFICAÇÃO: Rotas que exigem assinatura ativa
    // =============================
    // Lista de rotas do dashboard que exigem assinatura ativa
    const subscriptionProtectedPaths = [
        "/dashboard/agendamento",
        "/dashboard/calendario", // sem acentos
        "/dashboard/automacao",
        "/dashboard/chatwit",
    ];
    if (subscriptionProtectedPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
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
            return server_1.NextResponse.redirect(new URL("/dashboard/assine-agora", req.url));
        }
    }
    // =============================
    // Fim da verificação de assinatura ativa
    // =============================
    console.log(`Middleware: ${req.nextUrl.pathname}`);
    return server_1.NextResponse.next();
});
exports.config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|docs|auth/login|denied).*)",
    ],
};
