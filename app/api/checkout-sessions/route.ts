// app/api/checkout-sessions/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Certifique-se de que seu arquivo auth.ts exporta { auth, ... }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(request: Request) {
  try {
    // Obtém a sessão do usuário usando NextAuth (NextAuth v5)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized or missing user id" },
        { status: 401 }
      );
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

    return NextResponse.json({ clientSecret: stripeSession.client_secret });
  } catch (err: any) {
    console.error("Erro ao criar sessão de checkout:", err.message);
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
