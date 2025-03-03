"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
// app/api/checkout-sessions/route.ts
const stripe_1 = __importDefault(require("stripe"));
const server_1 = require("next/server");
const auth_1 = require("@/auth");
// Função auxiliar para criar a instância do Stripe somente quando necessário
function getStripeInstance() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
    }
    return new stripe_1.default(secretKey, { apiVersion: "2025-01-27.acacia" });
}
async function POST(request) {
    var _a;
    try {
        // Instancia o Stripe só no momento da requisição
        const stripe = getStripeInstance();
        // Obtém a sessão do usuário usando NextAuth
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized or missing user id" }, { status: 401 });
        }
        const userId = session.user.id;
        // Cria a sessão do Checkout com a metadata dentro de subscription_data
        const stripeSession = await stripe.checkout.sessions.create({
            ui_mode: "embedded",
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID || "price_1QoCnpEKzzlTPseQKVlbztRv",
                    quantity: 1,
                },
            ],
            mode: "subscription",
            subscription_data: {
                metadata: { userId },
            },
            return_url: `${request.headers.get("origin")}/payment-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        });
        return server_1.NextResponse.json({ clientSecret: stripeSession.client_secret });
    }
    catch (err) {
        console.error("Erro ao criar sessão de checkout:", err.message);
        return server_1.NextResponse.json(err.message, { status: err.statusCode || 500 });
    }
}
async function GET(request) {
    var _a;
    try {
        const stripe = getStripeInstance();
        const { searchParams } = new URL(request.url);
        const session_id = searchParams.get("session_id");
        if (!session_id) {
            return server_1.NextResponse.json({ error: "Missing session_id" }, { status: 400 });
        }
        const session = await stripe.checkout.sessions.retrieve(session_id);
        return server_1.NextResponse.json({
            status: session.status,
            customer_email: (_a = session.customer_details) === null || _a === void 0 ? void 0 : _a.email,
        });
    }
    catch (err) {
        console.error("Erro ao recuperar sessão de checkout:", err.message);
        return server_1.NextResponse.json(err.message, { status: err.statusCode || 500 });
    }
}
