import { auth } from "@/auth";
import { NextResponse, NextRequest } from "next/server";

export const config = {
  runtime: 'nodejs',
};

// Definindo um tipo para o contexto (já que AppRouteHandlerFnContext não está exportado)
type RouteContext = {
  params?: Record<string, string | string[]>;
};

export const GET = auth(async (
  req: NextRequest,
  ctx: RouteContext = {} // usamos nosso tipo personalizado
): Promise<NextResponse> => {
  // Se precisar acessar parâmetros, converte para Promise (mesmo que não existam)
  const params = await Promise.resolve(ctx.params ?? {});

  // Como NextRequest não tem "auth" na tipagem padrão, fazemos uma asserção de tipo
  const reqWithAuth = req as NextRequest & { auth?: { user?: { id: string } } };

  if (reqWithAuth.auth) {
    return NextResponse.json({ message: "Usuário Autenticado" });
  }
  return NextResponse.json({ message: "Não Autenticado" }, { status: 401 });
}) as any;
