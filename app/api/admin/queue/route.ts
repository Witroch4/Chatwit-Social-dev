// app/api/admin/queue/route.ts

import { NextResponse } from 'next/server';
import { parse } from 'cookie';
import { getToken } from '@auth/core/jwt';
import { createBullBoard } from '@bull-board/api';            // <--- Módulo @bull-board/api
import { BullMQAdapter } from '@bull-board'; // <--- Adaptador para BullMQ
import { agendamentoQueue } from '@/lib/queue/agendamento.queue';

const { router } = createBullBoard({
  queues: [
    new BullMQAdapter(agendamentoQueue),
    // Caso tenha mais filas: new BullMQAdapter(outraFila) ...
  ],
  // O bull-board precisa de um "serverAdapter" (Express, Fastify etc.)
  // Para Next.js "puro", não há adaptador oficial pronto, mas podemos usar
  // o 'router' interno do bull-board e adaptá-lo manualmente.
});

/**
 * Este GET tenta usar o `router` do bull-board e devolver um HTML.
 * Porém, bull-board não tem suporte nativo para Next "Request" e "Response".
 *
 * Você pode criar um mini-servidor Express (ou Fastify) rodando em paralelo
 * e expor a UI do bull-board. Ou tentar um 'hack' para converter Request->Express.
 */
export async function GET(request: Request) {
  // Autenticação bem parecida com o que você já fez:

  console.log("Recebendo requisição GET para /admin/queue");

  // 1) Extrair o valor do cookie
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookiesObj = parse(cookieHeader);

  // Se vc usa "authjs.session-token" ou "__Secure-authjs.session-token"...
  let cookieName = cookiesObj["authjs.session-token"]
    ? "authjs.session-token"
    : "__Secure-authjs.session-token";

  // Tentar pegar do header Authorization se não achou no cookie
  let tokenValue = cookiesObj[cookieName];
  const authorization = request.headers.get("authorization");
  if (!tokenValue && authorization?.startsWith("Bearer ")) {
    tokenValue = decodeURIComponent(authorization.split(" ")[1]);
  }

  if (!tokenValue) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Configuração de autenticação inválida." }, { status: 500 });
  }

  // Decodificar o token
  const token = await getToken({
    req: {
      headers: {
        cookie: cookieHeader,
        authorization: authorization ?? "",
      },
    } as any,
    secret,
    cookieName,
    raw: false,
  });

  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  // ==== Se chegou aqui, o user é ADMIN.
  // O bull-board espera lidar com Request/Response estilo Express ou Koa.
  // Sem um adaptador oficial para Next, você não vai conseguir retornar
  // a UI HTML facilmente. Precisaria "montar" o HTML manualmente ou usar
  // outro meio (por ex., rodar o bull-board numa porta separada).

  // Exemplo: Se você só quer JSON das filas, use a API programática do bull-board:
  // (Isso retorna um JSON com informações da fila.)
  const stats = await router.getStats();
  return NextResponse.json(stats, { status: 200 });
}
