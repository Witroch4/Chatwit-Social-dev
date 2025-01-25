//app/auth/instagram/callback/route.ts
import { NextResponse } from 'next/server';
import { auth, update } from "@/auth"; // Funções de autenticação
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // 1. Obter 'code' da query
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) {
      console.error('Nenhum code fornecido na query string.');
      return new NextResponse('Faltando code', { status: 400 });
    }

    console.log(`Code recebido: ${code}`);

    // Variáveis de ambiente
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID!;
    const clientSecret = process.env.INSTAGRAM_APP_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!;

    // 2. Trocar code por token de curto prazo
    const tokenResp = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResp.ok) {
      const errorText = await tokenResp.text();
      console.error('Erro ao obter token curto prazo:', errorText);
      return new NextResponse('Erro token curto prazo', { status: 500 });
    }

    // Garantir que "user_id" seja string
    const tokenRespText = await tokenResp.text();
    const fixedRespText = tokenRespText.replace(
      /"user_id":\s*(\d+)/,
      '"user_id":"$1"'
    );

    const shortTokenData = JSON.parse(fixedRespText) as {
      access_token: string;
      user_id: string;
    };

    const shortLivedToken = shortTokenData.access_token;
    console.log('Token curto prazo:', shortLivedToken);
    console.log('User ID app-scoped:', shortTokenData.user_id);

    // 3. Trocar token curto por token longo
    const exchangeUrl = new URL('https://graph.instagram.com/access_token');
    exchangeUrl.search = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: clientSecret,
      access_token: shortLivedToken,
    }).toString();

    const longTokenResp = await fetch(exchangeUrl.toString());
    if (!longTokenResp.ok) {
      const errorText = await longTokenResp.text();
      console.error('Erro ao obter token longo prazo:', errorText);
      return new NextResponse('Erro token longo prazo', { status: 500 });
    }

    const longTokenData = await longTokenResp.json() as {
      access_token: string;
      token_type: string;
      expires_in: number; // em segundos
    };

    const finalToken = longTokenData.access_token;
    const expiresAt = Math.floor(Date.now() / 1000) + longTokenData.expires_in;

    console.log('Token longo prazo:', finalToken);

    // 4. Obter sessão do usuário logado
    const session = await auth();
    if (!session?.user) {
      console.error('Usuário não autenticado.');
      return new NextResponse('Usuário não autenticado', { status: 401 });
    }

    const userId = session.user.id;
    console.log(`Usuário logado (ID interno): ${userId}`);

    // 5. Obter user_id (a conta business = "1784...") via IG Graph
    //    https://graph.instagram.com/me?fields=id,username,media_count,account_type,user_id
    const meUrl = `https://graph.instagram.com/me?fields=id,username,media_count,account_type,user_id&access_token=${finalToken}`;
    const meResp = await fetch(meUrl);
    if (!meResp.ok) {
      const errorText = await meResp.text();
      console.error('Erro ao buscar /me:', errorText);
      // podemos continuar, mas não teremos o user_id
    }

    let igBusinessId: string | null = null;
    if (meResp.ok) {
      const meData = await meResp.json() as {
        id: string;
        username: string;
        account_type: string;
        user_id?: string; // o "1784..."
      };
      console.log('meData:', meData);

      if (meData.user_id) {
        igBusinessId = meData.user_id;
        console.log(`Conta BUSINESS ID (user_id) = ${igBusinessId}`);
      }
    }

    // 6. Criar/atualizar a conta "instagram" (app-scoped user ID)
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId,
        provider: "instagram",
      },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          providerAccountId: shortTokenData.user_id,
          access_token: finalToken,
          expires_at: expiresAt,
          token_type: longTokenData.token_type,
          scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
          // se quisermos salvar o "1784..." no mesmo registro, também podemos:
          igUserId: igBusinessId || undefined,
        },
      });
      console.log('Conta instagram atualizada.');
    } else {
      await prisma.account.create({
        data: {
          userId,
          provider: "instagram",
          type: "oauth",
          providerAccountId: shortTokenData.user_id, // ID app-scoped
          access_token: finalToken,
          expires_at: expiresAt,
          token_type: longTokenData.token_type,
          scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
          igUserId: igBusinessId || null,
        },
      });
      console.log('Conta instagram criada.');
    }

    // 7. Atualizar o token JWT (opcional)
    await update({
      trigger: 'update',
      user: {
        instagramAccessToken: finalToken,
        providerAccountId: shortTokenData.user_id,
      },
    });

    // 8. Redirecionar para /dashboard
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`);

  } catch (err) {
    console.error('Erro no callback do Instagram:', err);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
