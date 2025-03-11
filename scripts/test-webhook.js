/**
 * Script para testar o webhook da Stripe localmente
 *
 * Este script simula eventos da Stripe enviando requisições para o endpoint do webhook
 *
 * Uso:
 * node scripts/test-webhook.js
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

// Configuração
const WEBHOOK_URL = 'http://localhost:3000/api/payment/webhook';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

// Exemplo de evento de assinatura criada
const subscriptionCreatedEvent = {
  id: 'evt_test_subscription_created',
  object: 'event',
  api_version: '2025-01-27.acacia',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'sub_test_123456',
      object: 'subscription',
      application: null,
      application_fee_percent: null,
      automatic_tax: {
        enabled: false,
        liability: null
      },
      billing_cycle_anchor: Math.floor(Date.now() / 1000),
      billing_thresholds: null,
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      collection_method: 'charge_automatically',
      created: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      current_period_start: Math.floor(Date.now() / 1000),
      customer: 'cus_test_123456',
      days_until_due: null,
      default_payment_method: 'pm_test_123456',
      default_source: null,
      default_tax_rates: [],
      description: null,
      discount: null,
      ended_at: null,
      items: {
        object: 'list',
        data: [
          {
            id: 'si_test_123456',
            object: 'subscription_item',
            created: Math.floor(Date.now() / 1000),
            metadata: {},
            price: {
              id: 'price_test_123456',
              object: 'price',
              active: true,
              currency: 'brl',
              product: 'prod_test_123456',
              recurring: {
                interval: 'month',
                interval_count: 1,
              },
              unit_amount: 4790,
            },
            quantity: 1,
            subscription: 'sub_test_123456',
          }
        ],
        has_more: false,
        total_count: 1,
      },
      latest_invoice: 'in_test_123456',
      livemode: false,
      metadata: {
        userId: 'test_user_id_123456'
      },
      next_pending_invoice_item_invoice: null,
      pause_collection: null,
      payment_settings: {
        payment_method_options: null,
        payment_method_types: null,
        save_default_payment_method: 'off'
      },
      pending_invoice_item_interval: null,
      pending_setup_intent: null,
      pending_update: null,
      plan: {
        id: 'price_test_123456',
        object: 'plan',
        active: true,
        amount: 4790,
        currency: 'brl',
        interval: 'month',
        interval_count: 1,
        metadata: {},
        product: 'prod_test_123456',
      },
      quantity: 1,
      schedule: null,
      start_date: Math.floor(Date.now() / 1000),
      status: 'active',
      transfer_data: null,
      trial_end: null,
      trial_start: null
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test_123456',
    idempotency_key: 'test_idempotency_key'
  },
  type: 'customer.subscription.created'
};

// Exemplo de evento de assinatura atualizada
const subscriptionUpdatedEvent = {
  ...subscriptionCreatedEvent,
  id: 'evt_test_subscription_updated',
  type: 'customer.subscription.updated',
  data: {
    ...subscriptionCreatedEvent.data,
    previous_attributes: {
      status: 'incomplete'
    }
  }
};

// Exemplo de evento de assinatura cancelada
const subscriptionDeletedEvent = {
  ...subscriptionCreatedEvent,
  id: 'evt_test_subscription_deleted',
  type: 'customer.subscription.deleted',
  data: {
    object: {
      ...subscriptionCreatedEvent.data.object,
      status: 'canceled',
      canceled_at: Math.floor(Date.now() / 1000),
    }
  }
};

// Função para assinar o payload
function generateSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

// Função para enviar o evento para o webhook
async function sendWebhookEvent(event) {
  const payload = JSON.stringify(event);
  const signature = generateSignature(payload, WEBHOOK_SECRET);

  console.log(`Enviando evento ${event.type}...`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature
      },
      body: payload
    });

    const data = await response.json();
    console.log(`Resposta (${response.status}):`, data);
  } catch (error) {
    console.error('Erro ao enviar evento:', error);
  }
}

// Função principal
async function main() {
  console.log('Testando webhook da Stripe...');

  // Testar evento de assinatura criada
  await sendWebhookEvent(subscriptionCreatedEvent);

  // Testar evento de assinatura atualizada
  await sendWebhookEvent(subscriptionUpdatedEvent);

  // Testar evento de assinatura cancelada
  await sendWebhookEvent(subscriptionDeletedEvent);

  console.log('Testes concluídos!');
}

// Executar o script
main().catch(console.error);