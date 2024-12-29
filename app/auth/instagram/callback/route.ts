// app/auth/instagram/callback/route.ts

import { NextResponse } from 'next/server';
import { auth, update } from "@/auth"; // Importa as funções auth e update do arquivo auth.ts
import { prisma } from "@/lib/db"; // Ajuste conforme sua configuração do prisma

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('Código não fornecido na query string.');
      return new NextResponse('Código não fornecido', { status: 400 });
    }

    console.log(`Código recebido: ${code}`);

    const clientId = process.env.INSTAGRAM_CLIENT_ID!;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;

    // 1. Trocar code por token de curto prazo
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao obter token curto prazo:', errorText);
      return new NextResponse('Erro ao obter token curto prazo', { status: 500 });
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      user_id: string;
      permissions: string[];
    };

    console.log(`Token curto prazo obtido: ${tokenData.access_token}`);
    console.log(`User ID recebido: ${tokenData.user_id} (Tipo: ${typeof tokenData.user_id})`);

    const shortLivedToken = tokenData.access_token;

    // 2. Trocar o token curto por um de longo prazo (60 dias)
    const longTokenUrl = new URL('https://graph.instagram.com/access_token');
    longTokenUrl.search = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: clientSecret,
      access_token: shortLivedToken,
    }).toString();

    const longTokenFetch = await fetch(longTokenUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!longTokenFetch.ok) {
      const errorText = await longTokenFetch.text();
      console.error('Erro ao obter token longo prazo:', errorText);
      return new NextResponse('Erro ao obter token longo prazo', { status: 500 });
    }

    const longTokenData = await longTokenFetch.json() as {
      access_token: string;
      token_type: string;
      expires_in: number; // em segundos
    };

    console.log(`Token longo prazo obtido: ${longTokenData.access_token}, expira em: ${longTokenData.expires_in} segundos`);

    const finalToken = longTokenData.access_token;
    const expiresInSeconds = longTokenData.expires_in;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    // 3. Obter a sessão do usuário logado usando auth()
    const session = await auth(); // Chamada correta sem parâmetros
    console.log('Sessão recebida:', session); // Log adicional

    if (!session || !session.user) {
      console.error('Sessão não encontrada ou usuário não autenticado.');
      return new NextResponse('Usuário não autenticado na plataforma', { status: 401 });
    }

    console.log(`Sessão obtida para usuário ID: ${session.user.id}`);

    const userId = session.user.id;

    // 4. Armazenar o token do Instagram no banco:
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "instagram",
      }
    });

    if (existingAccount) {
      // Atualizar a conta existente
      await prisma.account.update({
        where: {
          id: existingAccount.id,
        },
        data: {
          access_token: finalToken,
          expires_at: expiresAt,
          token_type: longTokenData.token_type,
          scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
        }
      });
      console.log(`Token do Instagram atualizado para usuário ID: ${userId}`);
    } else {
      // Criar uma nova conta Instagram
      await prisma.account.create({
        data: {
          userId: userId,
          type: "oauth",
          provider: "instagram",
          providerAccountId: String(tokenData.user_id), // Converte para String
          access_token: finalToken,
          expires_at: expiresAt,
          token_type: longTokenData.token_type,
          scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
        }
      });
      console.log(`Token do Instagram armazenado para usuário ID: ${userId}`);
    }

    // 5. Atualizar o token JWT com os dados do Instagram
    // Para disparar o callback 'jwt' com trigger 'update', precisamos passar os novos dados
    // Uma maneira comum é atualizar a sessão do usuário

    // Primeiro, atualizar os dados na sessão
    // No NextAuth, o objeto de sessão é derivado do JWT, então precisamos garantir que o JWT reflita as mudanças
    // Para isso, chamamos a função `update` exportada por NextAuth para reprocessar o JWT

    // Aqui, você pode definir quais campos deseja atualizar no token
    await update({
      trigger: 'update', // Define o gatilho como 'update' para que o callback JWT saiba que deve atualizar o token
      user: {
        instagramAccessToken: finalToken,
        instagramExpiresAt: expiresAt,
      }
    });

    console.log('JWT atualizado com os dados do Instagram.');

    // 6. Redireciona o usuário de volta ao dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error) {
    console.error('Erro no callback do Instagram:', error);
    return new NextResponse('Erro interno no servidor', { status: 500 });
  }
}
