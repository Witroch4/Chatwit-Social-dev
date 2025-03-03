"use strict";
// lib/route.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouteMatchers = void 0;
/**
 * Verifica se o caminho atual corresponde a alguma das rotas fornecidas.
 * Suporta correspondências exatas e padrões curinga (e.g., "/dashboard/*").
 * @param {Set<string>} routeSet - Conjunto de rotas para comparar.
 * @param {string} pathName - O pathname atual da requisição.
 * @returns {boolean} - Verdadeiro se houver correspondência, falso caso contrário.
 */
const matchesRoute = (routeSet, pathName) => {
    for (const route of routeSet) {
        if (route.endsWith("/*")) {
            const baseRoute = route.slice(0, -2); // Remove o '/*'
            if (pathName.startsWith(baseRoute + "/")) {
                return true;
            }
        }
        else if (route === pathName) {
            return true;
        }
    }
    return false;
};
/**
 * Cria correspondentes de rotas com base na configuração fornecida e no objeto de requisição.
 * @param {ConfigRoutes} routes - Objeto de configuração das rotas.
 * @param {NextRequest} req - Objeto de requisição do Next.js.
 * @returns {{
 *  isPublicRoute: boolean,
 *  isProtectedRoute: boolean,
 *  isAuthRoute: boolean,
 *  isApiRoute: boolean,
 *  isAdminRoute: boolean
 * }} Objeto indicando o tipo da rota atual.
 */
const createRouteMatchers = (routes, req) => {
    const { publicRoutes, protectedRoutes, authRoutes, apiRoutes, adminRoutes } = routes;
    const pathName = req.nextUrl.pathname;
    const publicRouteSet = new Set(publicRoutes);
    const protectedRouteSet = new Set(protectedRoutes);
    const authRouteSet = new Set(authRoutes);
    const apiRouteSet = new Set(apiRoutes);
    const adminRouteSet = new Set(adminRoutes);
    return {
        isPublicRoute: matchesRoute(publicRouteSet, pathName),
        isProtectedRoute: matchesRoute(protectedRouteSet, pathName),
        isAuthRoute: matchesRoute(authRouteSet, pathName),
        isApiRoute: matchesRoute(apiRouteSet, pathName),
        isAdminRoute: matchesRoute(adminRouteSet, pathName), // Adicionado
    };
};
exports.createRouteMatchers = createRouteMatchers;
