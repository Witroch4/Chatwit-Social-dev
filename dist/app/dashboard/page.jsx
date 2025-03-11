"use strict";
// app/dashboard/page.tsx
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardHome;
const react_1 = __importStar(require("react"));
const react_2 = require("next-auth/react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const button_1 = require("../../components/ui/button");
const dialog_1 = require("../../components/ui/dialog");
const stripe_js_1 = require("@stripe/stripe-js");
const react_stripe_js_1 = require("@stripe/react-stripe-js");
function Card({ title, description, tag, popular, ia }) {
    return (<link_1.default href="#">
      <div className={`
          border border-transparent p-4 rounded-lg shadow-sm
          bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-100
          transition-colors duration-300
          hover:border-blue-500
        `}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {ia && (<span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-100 py-0.5 px-2 rounded-md">
              [IA]
            </span>)}
        </div>
        <p className="text-sm mb-3">{description}</p>
        <div className="flex items-center gap-2">
          {tag && (<span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-100 py-0.5 px-2 rounded-md">
              {tag}
            </span>)}
          {popular && (<span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-100 py-0.5 px-2 rounded-md">
              POPULAR
            </span>)}
        </div>
      </div>
    </link_1.default>);
}
// Configuração do Stripe
const stripePromise = (0, stripe_js_1.loadStripe)(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
function DashboardHome() {
    var _a, _b, _c;
    const { data: session } = (0, react_2.useSession)();
    const router = (0, navigation_1.useRouter)();
    const subscriptionSectionRef = (0, react_1.useRef)(null);
    const [checkoutDialogOpen, setCheckoutDialogOpen] = (0, react_1.useState)(false);
    const [isSubscribed, setIsSubscribed] = (0, react_1.useState)(false);
    // Estado para armazenar os dados completos da assinatura para debug
    const [subscriptionData, setSubscriptionData] = (0, react_1.useState)(null);
    // Busca os dados da assinatura do usuário
    (0, react_1.useEffect)(() => {
        fetch("/api/user/subscription")
            .then((res) => res.json())
            .then((data) => {
            // Salva os dados completos da assinatura para fins de debug
            setSubscriptionData(data.subscription);
            // O usuário é considerado assinante se houver uma assinatura e seu status for "ACTIVE"
            setIsSubscribed(data.subscription && data.subscription.status === "ACTIVE");
        })
            .catch((err) => {
            console.error("Erro ao buscar dados da assinatura:", err);
            setIsSubscribed(false);
        });
    }, []);
    // Handler para clique nos cards
    const handleCardClick = (0, react_1.useCallback)(() => {
        if (!isSubscribed && subscriptionSectionRef.current) {
            subscriptionSectionRef.current.scrollIntoView({ behavior: "smooth" });
        }
        else {
            // Se o usuário já estiver assinando, prossiga para a funcionalidade do card
            console.log("Usuário assinante – prosseguir com a ação do card");
        }
    }, [isSubscribed]);
    // Função para buscar o clientSecret da Checkout Session
    const fetchClientSecret = (0, react_1.useCallback)(() => {
        return fetch("/api/checkout-sessions", {
            method: "POST",
        })
            .then((res) => res.json())
            .then((data) => data.clientSecret);
    }, []);
    const checkoutOptions = { fetchClientSecret };
    // Obter primeiro nome do usuário (ou "Usuário" se não houver nome)
    const userName = (_c = (_b = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.split(" ")[0]) !== null && _c !== void 0 ? _c : "Usuário";
    return (<div className="space-y-8">
      {/* Seção Inicial */}
      <section className="pt-6">
        <h1 className="text-3xl font-bold mb-2">Olá, {userName}</h1>
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-100 px-2 py-0.5 rounded-md text-sm font-semibold">
            [IA]
          </span>
          <p className="text-lg">
            Deixe a IA cuidar da agitação do feriado. A IA trabalha, você comemora!
          </p>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Desconto de <strong>20% no valor</strong>
        </p>
      </section>

      {/* Seção com Cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          A IA ideal para otimizar e minimizar tarefas repetitivas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Use IA para automatizar interações" description="Reduza tarefas manuais repetitivas e aumente a produtividade."/>
          <Card title="Converter interações em leads quentes com IA" description="Identifique rapidamente oportunidades de negócio."/>
          <Card title="Converter interações em leads quentes com IA" description="Segmentação inteligente e automática para potenciais clientes."/>
        </div>
      </section>

      {/* Seção "Comece aqui" */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Comece aqui</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Enviar links automaticamente por DM a partir dos comentários" description="Envie um link sempre que alguém comentar em uma publicação ou reel." tag="Quick Automation" popular/>
          <Card title="Conheça nossos modelos" description="Templates prontos para interações de DM automáticas." tag="Quick Automation"/>
          <Card title="Gere leads dos stories" description="Use ofertas por tempo limitado nos Stories para converter leads." tag="Flow Builder"/>
        </div>
      </section>

      {/* Seção com um único card */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Use IA para automatizar interações" description="Colete informações dos seus seguidores ou defina respostas automáticas." tag="Flow Builder" ia/>
        </div>
      </section>

      {/* Seção de assinatura (exibida somente se o usuário NÃO tiver assinatura ativa) */}
      {!isSubscribed && (<section ref={subscriptionSectionRef}>
          <h2 className="text-xl font-semibold mb-4">Assine Agora</h2>
          <p className="mb-4">
            Assine agora e decole na automatização das redes sociais.
          </p>
          <button_1.Button variant="default" onClick={() => setCheckoutDialogOpen(true)}>
            Assine agora
          </button_1.Button>
        </section>)}

      {/* Diálogo com o Embedded Checkout */}
      <dialog_1.Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <dialog_1.DialogTrigger asChild/>
        <dialog_1.DialogContent className="max-w-lg">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Checkout - Assinatura Mensal</dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          <div id="checkout" className="min-h-[300px]">
            <react_stripe_js_1.EmbeddedCheckoutProvider stripe={stripePromise} options={checkoutOptions}>
              <react_stripe_js_1.EmbeddedCheckout />
            </react_stripe_js_1.EmbeddedCheckoutProvider>
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button onClick={() => setCheckoutDialogOpen(false)}>Concluir</button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/*
          =========================
          DEBUG: Informações da Assinatura do Usuário
          =========================
          Essa seção exibe todas as informações da assinatura salvas no banco de dados para fins didáticos.
          Após confirmar que os dados estão sendo exibidos corretamente, você pode removê-la.
        */}
      <section className="border-t border-gray-300 pt-4 mt-4">
        <h2 className="text-xl font-bold mb-2">DEBUG: Dados da Assinatura</h2>
        <pre className="text-sm bg-gray-100 p-4 rounded">
          {JSON.stringify(subscriptionData, null, 2)}
        </pre>
        {/* =========================
             Fim da seção DEBUG
             ========================= */}
      </section>
    </div>);
}
