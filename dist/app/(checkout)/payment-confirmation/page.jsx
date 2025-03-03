"use strict";
// app/(checkout)/payment-confirmation/page.tsx
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PaymentConfirmationPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const button_1 = require("@/components/ui/button");
function PaymentConfirmationPage() {
    const [status, setStatus] = (0, react_1.useState)(null);
    const [customerEmail, setCustomerEmail] = (0, react_1.useState)("");
    const router = (0, navigation_1.useRouter)();
    (0, react_1.useEffect)(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const sessionId = searchParams.get("session_id");
        if (sessionId) {
            console.log("Buscando sessão com session_id:", sessionId);
            fetch(`/api/checkout-sessions?session_id=${sessionId}`, {
                method: "GET",
            })
                .then(async (res) => {
                // Tenta ler o corpo da resposta como texto
                const text = await res.text();
                // Log para debug
                console.log("Resposta bruta da API:", text);
                // Se houver texto, tenta converter para JSON; caso contrário, retorna um objeto vazio
                return text ? JSON.parse(text) : {};
            })
                .then((data) => {
                console.log("Dados recebidos da API:", data);
                setStatus(data.status);
                setCustomerEmail(data.customer_email);
            })
                .catch((err) => {
                console.error("Erro ao buscar dados da sessão:", err);
            });
        }
    }, []);
    // Se o status for "open", redireciona para o Dashboard
    (0, react_1.useEffect)(() => {
        if (status === "open") {
            router.push("/dashboard");
        }
    }, [status, router]);
    if (status === "complete") {
        return (<div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Assinatura Confirmada!</h1>
        <p>
          Obrigado por se juntar à comunidade ChatWit, que mais cresce no Brasil.
        </p>
        <p>
          Um email de confirmação foi enviado para{" "}
          <span className="font-medium">{customerEmail}</span>.
        </p>
        <button_1.Button onClick={() => router.push("/dashboard")}>
          Ir para o Dashboard
        </button_1.Button>
      </div>);
    }
    return (<div className="text-center">
      <p>Carregando...</p>
    </div>);
}
