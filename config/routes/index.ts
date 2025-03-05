// config/routes/index.ts

import type { ConfigRoutes } from "@/types/routes";

export const configRoutes: ConfigRoutes = {
  publicRoutes: [
    "/",
    "/auth/login",
    "/auth/register",
    "/auth/change-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/example/web-site-builder/campaign-hot-page",
    "/auth/users",
    "/denied", // Adicionado para evitar que o middleware processe esta rota
  ],
  authRoutes: ["/api/auth/signin"],
  apiRoutes: ["/api/protected-api"],
  protectedRoutes: [
    "/auth/settings",
    "/example/multi-step-form/campaign",
    "/dashboard",
    "/dashboard/*",
    "/registro/redesocial",
    "/registro/redesocial/*",
    // Rotas dinâmicas para contas do Instagram
    "/:accountid/dashboard",
    "/:accountid/dashboard/*",
    // "/example/web-site-builder/campaign-hot-page",
  ],
  adminRoutes: [
    "/admin",
    "/admin/*", // Inclui todas as subrotas de /admin
  ],
};
