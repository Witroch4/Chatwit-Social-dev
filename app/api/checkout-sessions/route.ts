// app/api/checkout-sessions/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

// Instancia o Stripe usando a nova API version (exemplo para 2025)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(request: Request) {
  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          // Utilize o Price ID definido no .env ou o fornecido diretamente
          price: process.env.STRIPE_PRICE_ID || "price_1QoCnpEKzzlTPseQKVlbztRv",
          quantity: 1,
        },
      ],
      mode: "subscription",
      // A URL de retorno deve incluir o placeholder {CHECKOUT_SESSION_ID}
      return_url: `${request.headers.get("origin")}/payment-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err: any) {
    return NextResponse.json(err.message, { status: err.statusCode || 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get("session_id");

  if (!session_id) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    return NextResponse.json({
      status: session.status,
      customer_email: session.customer_details?.email,
    });
  } catch (err: any) {
    return NextResponse.json(err.message, { status: err.statusCode || 500 });
  }
}
