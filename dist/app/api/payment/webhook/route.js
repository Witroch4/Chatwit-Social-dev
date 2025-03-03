"use strict";
// app/api/payment/webhook/route.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("@/lib/prisma"); // Certifique-se de que essa importação esteja correta
// Usa uma chave dummy se STRIPE_SECRET_KEY não estiver definida
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "dummy_stripe_secret";
if (stripeSecretKey === "dummy_stripe_secret") {
    console.warn("WARNING: Using dummy Stripe secret key. Make sure to set STRIPE_SECRET_KEY in production!");
}
const stripe = new stripe_1.default(stripeSecretKey, {
    apiVersion: "2025-01-27.acacia",
});
// Altere o runtime para "nodejs" para evitar problemas com APIs do Node.js no Edge Runtime
exports.config = {
    runtime: "nodejs",
};
async function POST(request) {
    var _a, _b, _c, _d, _e;
    // Obtém o corpo bruto da requisição
    const rawBody = await request.text();
    const sig = request.headers.get("stripe-signature");
    // Verifica se a variável de ambiente do webhook está definida
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
        return server_1.NextResponse.json({ error: "Missing Stripe webhook secret" }, { status: 500 });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error("Erro no webhook ao construir o evento:", err.message);
        return server_1.NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    console.log("Evento recebido:", event.type);
    console.log("Dados do evento:", JSON.stringify(event.data.object));
    try {
        switch (event.type) {
            case "customer.subscription.created": {
                const subscription = event.data.object;
                console.log("Evento customer.subscription.created recebido para subscription id:", subscription.id);
                console.log("Metadata da assinatura:", subscription.metadata);
                const userId = (_a = subscription.metadata) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    console.error("customer.subscription.created: userId not found in metadata para subscription:", subscription.id);
                    break;
                }
                console.log("Criando ou atualizando assinatura para userId:", userId);
                await prisma_1.prisma.subscription.upsert({
                    where: { stripeSubscriptionId: subscription.id },
                    update: {
                        status: mapStripeStatus(subscription.status),
                        startDate: new Date(subscription.start_date * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                    },
                    create: {
                        userId,
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer,
                        status: mapStripeStatus(subscription.status),
                        startDate: new Date(subscription.start_date * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                    },
                });
                console.log("Assinatura criada/atualizada com sucesso para subscription:", subscription.id);
                break;
            }
            case "customer.subscription.updated": {
                const subscription = event.data.object;
                console.log("Evento customer.subscription.updated recebido para subscription id:", subscription.id);
                console.log("Metadata da assinatura:", subscription.metadata);
                const userId = (_b = subscription.metadata) === null || _b === void 0 ? void 0 : _b.userId;
                if (!userId) {
                    console.error("customer.subscription.updated: userId not found in metadata para subscription:", subscription.id);
                    break;
                }
                console.log("Atualizando assinatura para userId:", userId);
                await prisma_1.prisma.subscription.upsert({
                    where: { stripeSubscriptionId: subscription.id },
                    update: {
                        status: mapStripeStatus(subscription.status),
                        startDate: new Date(subscription.start_date * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                    },
                    create: {
                        userId,
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer,
                        status: mapStripeStatus(subscription.status),
                        startDate: new Date(subscription.start_date * 1000),
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                    },
                });
                console.log("Assinatura atualizada com sucesso para subscription:", subscription.id);
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                console.log("Evento customer.subscription.deleted recebido para subscription id:", subscription.id);
                console.log("Metadata da assinatura:", subscription.metadata);
                const userId = (_c = subscription.metadata) === null || _c === void 0 ? void 0 : _c.userId;
                if (!userId) {
                    console.error("customer.subscription.deleted: userId not found in metadata para subscription:", subscription.id);
                    break;
                }
                await prisma_1.prisma.subscription.update({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        status: "CANCELED",
                        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : new Date(),
                    },
                });
                console.log("Assinatura marcada como CANCELED com sucesso para subscription:", subscription.id);
                break;
            }
            case "invoice.paid": {
                const invoice = event.data.object;
                console.log("Evento invoice.paid recebido para invoice id:", invoice.id);
                if (!invoice.subscription) {
                    console.error("invoice.paid: Nenhuma assinatura encontrada na fatura:", invoice.id);
                    break;
                }
                const stripeSubscriptionId = typeof invoice.subscription === "string"
                    ? invoice.subscription
                    : invoice.subscription.id;
                const periodEnd = (_e = (_d = invoice.lines.data[0]) === null || _d === void 0 ? void 0 : _d.period) === null || _e === void 0 ? void 0 : _e.end;
                if (periodEnd) {
                    console.log("Atualizando currentPeriodEnd para subscription:", stripeSubscriptionId);
                    await prisma_1.prisma.subscription.update({
                        where: { stripeSubscriptionId },
                        data: {
                            currentPeriodEnd: new Date(periodEnd * 1000),
                            status: "ACTIVE",
                        },
                    });
                    console.log("Subscription atualizada para ACTIVE com sucesso para subscription:", stripeSubscriptionId);
                }
                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object;
                console.log("Evento invoice.payment_failed recebido para invoice id:", invoice.id);
                if (!invoice.subscription) {
                    console.error("invoice.payment_failed: Nenhuma assinatura encontrada na fatura:", invoice.id);
                    break;
                }
                const stripeSubscriptionId = typeof invoice.subscription === "string"
                    ? invoice.subscription
                    : invoice.subscription.id;
                console.log("Atualizando subscription para PAST_DUE para subscription:", stripeSubscriptionId);
                await prisma_1.prisma.subscription.update({
                    where: { stripeSubscriptionId },
                    data: { status: "PAST_DUE" },
                });
                console.log("Subscription atualizada para PAST_DUE com sucesso para subscription:", stripeSubscriptionId);
                break;
            }
            default:
                console.log(`Evento não tratado: ${event.type}`);
        }
    }
    catch (error) {
        console.error("Erro ao processar o evento:", error);
        return server_1.NextResponse.json({ error: "Erro ao processar o evento" }, { status: 500 });
    }
    return server_1.NextResponse.json({ received: true });
}
function mapStripeStatus(status) {
    switch (status) {
        case "trialing":
        case "active":
            return "ACTIVE";
        case "past_due":
            return "PAST_DUE";
        case "canceled":
            return "CANCELED";
        case "unpaid":
            return "UNPAID";
        case "incomplete":
            return "INCOMPLETE";
        case "incomplete_expired":
            return "INCOMPLETE_EXPIRED";
        case "paused":
            return "CANCELED";
        default:
            return "UNPAID";
    }
}
