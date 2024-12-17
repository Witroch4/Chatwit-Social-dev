// lib/route.ts
import type { ConfigRoutes } from "@/types/routes";
import type { NextRequest } from "next/server";

/**
 * Checks if the current path matches any of the routes in the provided set.
 * Supports exact matches and wildcard patterns (e.g., "/dashboard/*").
 * @param {Set<string>} routeSet - Set of routes to match against.
 * @param {string} pathName - The current request pathname.
 * @returns {boolean} - True if there's a match, false otherwise.
 */
const matchesRoute = (routeSet: Set<string>, pathName: string): boolean => {
  for (const route of routeSet) {
    if (route.endsWith("/*")) {
      const baseRoute = route.slice(0, -2); // Remove the '/*'
      if (pathName.startsWith(baseRoute + "/")) {
        return true;
      }
    } else if (route === pathName) {
      return true;
    }
  }
  return false;
};

/**
 * Creates route matchers based on the provided routes configuration and request object.
 * @param {ConfigRoutes} routes - The routes configuration object.
 * @param {NextRequest} req - The Next.js request object.
 * @returns {{
 *  isPublicRoute: boolean,
 *  isProtectedRoute: boolean,
 *  isAuthRoute: boolean,
 *  isApiRoute: boolean
 * }} An object indicating the type of the current route.
 */
export const createRouteMatchers = (routes: ConfigRoutes, req: NextRequest) => {
  const { publicRoutes, protectedRoutes, authRoutes, apiRoutes } = routes;
  const pathName = req.nextUrl.pathname;

  // Preprocess route collections into sets
  const publicRouteSet = new Set(publicRoutes);
  const protectedRouteSet = new Set(protectedRoutes);
  const authRouteSet = new Set(authRoutes);
  const apiRouteSet = new Set(apiRoutes);

  return {
    isPublicRoute: matchesRoute(publicRouteSet, pathName),
    isProtectedRoute: matchesRoute(protectedRouteSet, pathName),
    isAuthRoute: matchesRoute(authRouteSet, pathName),
    isApiRoute: matchesRoute(apiRouteSet, pathName),
  };
};
