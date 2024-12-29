import { NextResponse } from "next/server"
import { parse } from "cookie"
import { getToken } from "@auth/core/jwt"  // <-- Import **nosso** arquivo "jwt.ts" (ou do @auth/core/jwt)
import { defaultCookies } from "./jwt/lib/utils/cookie" // Ajuste se precisar

/**
 * Exemplo de endpoint que retorna o conteúdo do JWT (ou o token bruto).
 * A lógica abaixo tenta ler o cookie de sessão, ou um "Bearer" token no header,
 * e decodifica usando o mesmo secret do Auth.js.
 */
export async function GET(request: Request) {
  try {
    // 1) Ler o `cookie` do próprio objeto Request
    const cookieHeader = request.headers.get("cookie") ?? ""
    const cookiesObj = parse(cookieHeader)

    // Pega o nome do cookie de sessão do Auth.js.
    // Normalmente: "authjs.session-token", ou "__Secure-authjs.session-token"
    // dependendo se é secure ou não. Vamos tentar descobrir dinamicamente:
    let cookieName = cookiesObj["authjs.session-token"]
      ? "authjs.session-token"
      : "__Secure-authjs.session-token"

    // Caso você use "next-auth.session-token", troque aqui:
    // let cookieName = cookiesObj["next-auth.session-token"]
    //   ? "next-auth.session-token"
    //   : "__Secure-next-auth.session-token"

    // 2) Tenta ler o valor do cookie
    let tokenValue = cookiesObj[cookieName]

    // Também checa header Authorization: Bearer ...
    const authorization = request.headers.get("authorization")
    if (!tokenValue && authorization?.startsWith("Bearer ")) {
      tokenValue = decodeURIComponent(authorization.split(" ")[1])
    }

    // Se ainda não há token => null
    if (!tokenValue) {
      return NextResponse.json({ token: null, payload: null }, { status: 200 })
    }

    // 3) Defina o secret que está em .env (o mesmo que Auth.js usa)
    const secret = process.env.AUTH_SECRET
    if (!secret) {
      // Se preferir, troque por process.env.NEXTAUTH_SECRET
      return NextResponse.json(
        { error: "AUTH_SECRET não definido no .env" },
        { status: 500 }
      )
    }

    // 4) Decodificar usando `getToken`.
    //   - Se você tiver um "jwt.ts" custom, importe dele.
    //   - Se estiver usando "import { getToken } from '@auth/core/jwt'"
    //     faça as devidas adaptações.
    const decoded = await getToken({
      // simula o req do Auth.js
      req: {
        headers: {
          cookie: cookieHeader,
          authorization: authorization ?? "",
        },
      },
      secret,
      // Ajuste `cookieName` se quiser forçar um nome específico
      cookieName,

      // Se `raw: true`, devolve o token bruto. Se `false`, devolve payload decodificado
      raw: false,
    })

    return NextResponse.json(
      {
        token: tokenValue,
        payload: decoded,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof MissingSecret) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.error("Erro ao obter token:", error)
    return NextResponse.json(
      { error: "Não foi possível decodificar o token" },
      { status: 500 }
    )
  }
}
