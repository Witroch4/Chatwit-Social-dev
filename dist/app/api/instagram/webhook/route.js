"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
// app/api/instagram/webhook/route.ts
//https://moving-eagle-bright.ngrok-free.app/api/instagram/webhook
const server_1 = require("next/server");
const instagram_webhook_queue_1 = require("@/lib/queue/instagram-webhook.queue");
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Token de verificação do webhook do Instagram.
 */
const VERIFY_TOKEN = process.env.IG_VERIFY_TOKEN || "EAAIaqbt2rHgBO92NRTO2oMot3I8VPQGkJdnIMGVekpa5ebrdpSHfhqPytX0uih1kXLD5EZB0yHUHV5jHa1hryqrZAt8vWpZBpZCMnaLzuqGCjlKfX3mNoUSYbcnClC45md4NF5ZBKrkyZCiYLNtyeg9UgHZA7s4gafEWZCxZC0P9k4MY4Wh0jSiKpFuwVQy9crIZCW";
/**
 * Secret da aplicação para verificar a assinatura do webhook.
 */
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || "";
/**
 * Handler para GET (verificação do webhook).
 */
async function GET(request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("[Instagram Webhook] Verificação bem-sucedida.");
        return new Response(challenge || "", { status: 200 });
    }
    else {
        console.warn("[Instagram Webhook] Falha na verificação do webhook.");
        return new server_1.NextResponse("Erro de verificação.", { status: 403 });
    }
}
/**
 * Handler para POST (recebimento de eventos).
 */
async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get("x-hub-signature-256") || "";
        // Verificar a assinatura do webhook
        if (!verifySignature(body, signature)) {
            console.warn("[Instagram Webhook] Assinatura inválida.");
            return new server_1.NextResponse("Assinatura inválida.", { status: 403 });
        }
        // Logar o corpo recebido em formato de texto (bruto)
        console.log("[Instagram Webhook] Recebendo webhook (raw body):", body);
        const jsonBody = JSON.parse(body);
        // Logar o conteúdo JSON do webhook
        console.log("[Instagram Webhook] Recebido POST com dados (JSON):", JSON.stringify(jsonBody, null, 2));
        // Adicionar o job na fila BullMQ (caso esteja usando)
        await instagram_webhook_queue_1.instagramWebhookQueue.add("instagram-event", jsonBody, {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
        });
        // Responder com 200 OK
        return server_1.NextResponse.json({ success: true }, { status: 200 });
    }
    catch (error) {
        console.error("[Instagram Webhook] Erro no POST:", error.message);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
/**
 * Função para verificar a assinatura do webhook.
 */
function verifySignature(body, signature) {
    if (!signature.startsWith("sha256=")) {
        return false;
    }
    const hash = crypto_1.default
        .createHmac("sha256", INSTAGRAM_APP_SECRET)
        .update(body)
        .digest("hex");
    return crypto_1.default.timingSafeEqual(Buffer.from(hash), Buffer.from(signature.slice(7)));
}
