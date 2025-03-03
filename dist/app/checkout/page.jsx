"use strict";
// app/checkout/page.tsx
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CheckoutPage;
const react_1 = __importStar(require("react"));
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const stripe_js_1 = require("@stripe/stripe-js");
const react_stripe_js_1 = require("@stripe/react-stripe-js");
// Inicializa o Stripe com a chave publicável
const stripePromise = (0, stripe_js_1.loadStripe)(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
function CheckoutPage() {
    const { data: session, status } = (0, react_2.useSession)();
    const router = (0, navigation_1.useRouter)();
    // Enquanto o session estiver carregando, mostramos uma mensagem simples
    if (status === "loading") {
        return <p>Carregando...</p>;
    }
    // Se não houver sessão, redireciona ou exibe mensagem
    if (!session) {
        return <p>Você precisa estar autenticado para acessar o checkout.</p>;
    }
    // Usa o user.id se existir, senão utiliza o user.email
    const userId = session.user.id || session.user.email;
    // Função para buscar o clientSecret da Checkout Session via API
    const fetchClientSecret = (0, react_1.useCallback)(() => {
        return fetch("/api/checkout-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        })
            .then((res) => {
            if (!res.ok) {
                throw new Error("Falha ao obter o clientSecret");
            }
            return res.json();
        })
            .then((data) => data.clientSecret);
    }, [userId]);
    const checkoutOptions = { fetchClientSecret };
    return (<div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center mb-6">
          Checkout - Assinatura Mensal
        </h1>
        <react_stripe_js_1.EmbeddedCheckoutProvider stripe={stripePromise} options={checkoutOptions}>
          <react_stripe_js_1.EmbeddedCheckout />
        </react_stripe_js_1.EmbeddedCheckoutProvider>
      </div>
    </div>);
}
