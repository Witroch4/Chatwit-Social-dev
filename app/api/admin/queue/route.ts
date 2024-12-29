// app/api/admin/queue/route.ts

import { NextResponse } from "next/server"
import { createBullBoard } from "bull-board"
import { BullAdapter } from "bull-board/BullAdapter"
import { agendamentoQueue } from "@/lib/queue"
import { getToken } from "@auth/core/jwt" // ou "next-auth/jwt", dependendo de onde você importa
import { parse } from "cookie"

const { router } = createBullBoard([
  new BullAdapter(agendamentoQueue),
  // Adicione outras filas Bull se houver
])

export async function GET(request: Request) {
  console.log("Recebendo requisição GET para /admin/queue")

  // 1) Extrair o valor dos cookies do objeto Request
  const cookieHeader = request.headers.get("cookie") ?? ""
  const cookiesObj = parse(cookieHeader)

  // Se você usa "authjs.session-token" em dev sem HTTPS,
  // ou "__Secure-authjs.session-token" se HTTPS (secure).
  // Se ainda usar NextAuth 4 clássico, pode ser "next-auth.session-token".
  // Ajuste conforme necessário:
  let cookieName = cookiesObj["authjs.session-token"]
    ? "authjs.session-token"
    : "__Secure-authjs.session-token"

  // Exemplo se você ainda tiver next-auth.session-token:
  // let cookieName = cookiesObj["next-auth.session-token"]
  //   ? "next-auth.session-token"
  //   : "__Secure-next-auth.session-token"

  // 2) Tenta ler o valor do token no cookie
  let tokenValue = cookiesObj[cookieName]

  // 3) Também checa se há um header Authorization: Bearer ...
  const authorization = request.headers.get("authorization")
  if (!tokenValue && authorization?.startsWith("Bearer ")) {
    tokenValue = decodeURIComponent(authorization.split(" ")[1])
  }

  // Se não encontrou nenhum token => 403 ou 401
  if (!tokenValue) {
    console.warn("Acesso negado: Não existe token no cookie ou no header.")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  // 4) Ler o secret do .env
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    console.error("AUTH_SECRET não está definido.")
    return NextResponse.json({ error: "Configuração de autenticação inválida." }, { status: 500 })
  }

  // 5) Decodificar o token, usando a mesma função do Auth.js
  // Se estiver usando a lib oficial, é "import { getToken } from '@auth/core/jwt'"
  // Se estiver usando NextAuth < 5, seria "import { getToken } from 'next-auth/jwt'"
  // Aqui assumimos @auth/core/jwt, igual ao seu GET /api/auth/get-token
  const token = await getToken({
    req: {
      headers: {
        cookie: cookieHeader,
        authorization: authorization ?? "",
      },
    },
    secret,
    cookieName,
    raw: false,
  })

  console.log("Token extraído do cookie/header:", token)

  // 6) Verificar se o token realmente foi decodificado e se role === "ADMIN"
  if (!token || token.role !== "ADMIN") {
    console.warn("###### Acesso negado: Usuário não é administrador ou não está autenticado.")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  // 7) Se chegou aqui, o usuário é ADMIN
  console.log("Usuário é admin. Retornando Bull Board.")
  // O 'router()' do Bull Board espera um objeto Request válido, então
  // simulamos com new Request("http://fake.url") ou retornamos router(request).
  return router(new Request("http://fake.url"))
}
