import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Obter o código de autorização do corpo da requisição
    const body = await request.json().catch(() => ({}));
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Código de autorização não fornecido" },
        { status: 400 }
      );
    }

    // Definir as variáveis de ambiente
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = process.env.NEXTAUTH_URL + "/registro/redesocial/callback";

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "Configuração do Instagram incompleta" },
        { status: 500 }
      );
    }

    // Trocar o código de autorização por um token de acesso
    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("Erro ao obter token do Instagram:", errorData);
      return NextResponse.json(
        { error: "Falha ao obter token de acesso do Instagram" },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, user_id } = tokenData;

    if (!access_token || !user_id) {
      return NextResponse.json(
        { error: "Resposta de token inválida do Instagram" },
        { status: 400 }
      );
    }

    // Obter informações do usuário do Instagram
    const userResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`);

    if (!userResponse.ok) {
      console.error("Erro ao obter informações do usuário do Instagram");
      return NextResponse.json(
        { error: "Falha ao obter informações do usuário do Instagram" },
        { status: 400 }
      );
    }

    const userData = await userResponse.json();
    const { username } = userData;

    // Verificar se já existe uma conta com este providerAccountId
    const existingAccount = await prisma.account.findFirst({
      where: {
        provider: "instagram",
        providerAccountId: user_id,
        userId: session.user.id
      }
    });

    let account;

    if (existingAccount) {
      // Atualizar a conta existente
      account = await prisma.account.update({
        where: {
          id: existingAccount.id
        },
        data: {
          access_token: access_token,
          igUsername: username,
          igUserId: user_id
        }
      });
    } else {
      // Verificar se já existe alguma conta do Instagram para este usuário
      const existingAccounts = await prisma.account.findMany({
        where: {
          userId: session.user.id,
          provider: "instagram"
        }
      });

      // Criar uma nova conta
      account = await prisma.account.create({
        data: {
          userId: session.user.id,
          type: "oauth",
          provider: "instagram",
          providerAccountId: user_id,
          access_token: access_token,
          igUsername: username,
          igUserId: user_id,
          isMain: existingAccounts.length === 0 // Primeira conta será a principal
        }
      });
    }

    return NextResponse.json({
      success: true,
      username: username,
      accountId: account.id
    });
  } catch (error) {
    console.error("Erro ao conectar conta do Instagram:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao conectar a conta do Instagram" },
      { status: 500 }
    );
  }
}