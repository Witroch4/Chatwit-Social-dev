"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const auth_1 = require("@/auth"); // Funções de autenticação
const prisma_1 = require("@/lib/prisma");
async function GET(request) {
    try {
        // 1. Obter 'code' da query
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        if (!code) {
            console.error('Nenhum code fornecido na query string.');
            return new server_1.NextResponse('Faltando code', { status: 400 });
        }
        console.log(`Code recebido: ${code}`);
        // Variáveis de ambiente
        const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
        const clientSecret = process.env.INSTAGRAM_APP_SECRET;
        const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
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
            return new server_1.NextResponse('Erro token curto prazo', { status: 500 });
        }
        // Garantir que "user_id" seja string
        const tokenRespText = await tokenResp.text();
        const fixedRespText = tokenRespText.replace(/"user_id":\s*(\d+)/, '"user_id":"$1"');
        const shortTokenData = JSON.parse(fixedRespText);
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
            return new server_1.NextResponse('Erro token longo prazo', { status: 500 });
        }
        const longTokenData = await longTokenResp.json();
        const finalToken = longTokenData.access_token;
        const expiresAt = Math.floor(Date.now() / 1000) + longTokenData.expires_in;
        console.log('Token longo prazo:', finalToken);
        // 4. Obter sessão do usuário logado
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            console.error('Usuário não autenticado.');
            return new server_1.NextResponse('Usuário não autenticado', { status: 401 });
        }
        const userId = session.user.id;
        console.log(`Usuário logado (ID interno): ${userId}`);
        // 5. Obter user_id (a conta business = "1784...") via IG Graph
        const meUrl = `https://graph.instagram.com/me?fields=id,username,media_count,account_type,user_id&access_token=${finalToken}`;
        const meResp = await fetch(meUrl);
        if (!meResp.ok) {
            const errorText = await meResp.text();
            console.error('Erro ao buscar /me:', errorText);
            // Podemos continuar, mas não teremos o user_id
        }
        let igBusinessId = null;
        if (meResp.ok) {
            const meData = await meResp.json();
            console.log('meData:', meData);
            if (meData.user_id) {
                igBusinessId = meData.user_id;
                console.log(`Conta BUSINESS ID (user_id) = ${igBusinessId}`);
            }
        }
        // 6. Criar/atualizar a conta "instagram" (app-scoped user ID)
        const existingAccount = await prisma_1.prisma.account.findFirst({
            where: {
                userId,
                provider: "instagram",
            },
        });
        if (existingAccount) {
            await prisma_1.prisma.account.update({
                where: { id: existingAccount.id },
                data: {
                    providerAccountId: shortTokenData.user_id,
                    access_token: finalToken,
                    expires_at: expiresAt,
                    token_type: longTokenData.token_type,
                    scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
                    igUserId: igBusinessId || undefined,
                },
            });
            console.log('Conta instagram atualizada.');
        }
        else {
            await prisma_1.prisma.account.create({
                data: {
                    userId,
                    provider: "instagram",
                    type: "oauth",
                    providerAccountId: shortTokenData.user_id,
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
        await (0, auth_1.update)({
            user: {
                instagramAccessToken: finalToken,
                providerAccountId: shortTokenData.user_id,
            },
        });
        // 8. Redirecionar para /dashboard
        return server_1.NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`);
    }
    catch (err) {
        console.error('Erro no callback do Instagram:', err);
        return new server_1.NextResponse('Erro interno', { status: 500 });
    }
}
