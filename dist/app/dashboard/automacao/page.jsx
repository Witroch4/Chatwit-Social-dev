"use strict";
// app/dashboard/automacao/page.tsx
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
exports.default = AutomacaoPage;
const react_1 = __importStar(require("react"));
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const separator_1 = require("@/components/ui/separator");
const dotlottie_react_1 = require("@lottiefiles/dotlottie-react");
const PastasEAutomacoes_1 = __importDefault(require("./componentes/PastasEAutomacoes"));
const NovaAutomacaoDialog_1 = __importDefault(require("./componentes/NovaAutomacaoDialog"));
const button_1 = require("@/components/ui/button"); // Import necessário para o botão "Nova Pasta"
const dialog_1 = require("@/components/ui/dialog");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
function AutomacaoPage() {
    var _a;
    const { data: session, status } = (0, react_2.useSession)();
    const router = (0, navigation_1.useRouter)();
    // Estados de Pastas/Automações
    const [pastas, setPastas] = (0, react_1.useState)([]);
    const [automacoes, setAutomacoes] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Estados para o diálogo "Nova Pasta"
    const [openNovaPasta, setOpenNovaPasta] = (0, react_1.useState)(false);
    const [novaPastaName, setNovaPastaName] = (0, react_1.useState)("");
    // Carrega dados ao montar
    (0, react_1.useEffect)(() => {
        var _a;
        if (status === "loading")
            return;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return;
        fetchData();
    }, [session, status]);
    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const [resPastas, resAutomacoes] = await Promise.all([
                fetch("/api/pasta"),
                fetch("/api/automacao"),
            ]);
            if (!resPastas.ok) {
                const err1 = await resPastas.json();
                throw new Error(err1.error || "Falha ao carregar pastas");
            }
            if (!resAutomacoes.ok) {
                const err2 = await resAutomacoes.json();
                throw new Error(err2.error || "Falha ao carregar automações");
            }
            const dataPastas = await resPastas.json();
            const dataAutomacoes = await resAutomacoes.json();
            setPastas(dataPastas);
            setAutomacoes(dataAutomacoes);
        }
        catch (e) {
            setError(e.message);
            console.error("Erro:", e);
        }
        finally {
            setLoading(false);
        }
    }
    // Função para criar nova pasta
    async function handleCriarNovaPasta() {
        if (!novaPastaName.trim())
            return;
        try {
            const res = await fetch("/api/pasta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: novaPastaName.trim() }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Falha ao criar pasta");
            }
            setNovaPastaName("");
            setOpenNovaPasta(false);
            fetchData();
        }
        catch (e) {
            console.error(e.message);
        }
    }
    // Verificações de sessão
    if (status === "loading") {
        return <div className="p-4">Carregando sessão...</div>;
    }
    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
        return <div className="p-4">Você não está autenticado.</div>;
    }
    return (<div className="p-4">
      <h1 className="text-2xl font-bold">Automatização</h1>
      <separator_1.Separator className="my-3"/>

      <h2 className="text-xl font-semibold mb-4">Minhas Automações</h2>

      {/* Contêiner Flexível para os Botões "Nova Automação" e "Nova Pasta" */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Botão + Diálogo de Nova Automação */}
        <NovaAutomacaoDialog_1.default />

        {/* Botão + Diálogo de Nova Pasta */}
        <dialog_1.Dialog open={openNovaPasta} onOpenChange={setOpenNovaPasta}>
          <dialog_1.DialogTrigger asChild>
            <button_1.Button variant="outline">+ Nova Pasta</button_1.Button>
          </dialog_1.DialogTrigger>
          <dialog_1.DialogContent className="sm:max-w-[425px]">
            <dialog_1.DialogHeader>
              <dialog_1.DialogTitle>Criar nova pasta</dialog_1.DialogTitle>
              <dialog_1.DialogDescription>
                Digite o nome da pasta para organizar suas automações.
              </dialog_1.DialogDescription>
            </dialog_1.DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label_1.Label htmlFor="nomePasta" className="text-right">
                  Nome
                </label_1.Label>
                <input_1.Input id="nomePasta" placeholder="Minha nova pasta" className="col-span-3" value={novaPastaName} onChange={(e) => setNovaPastaName(e.target.value)}/>
              </div>
            </div>
            <dialog_1.DialogFooter>
              <button_1.Button variant="outline" onClick={() => setOpenNovaPasta(false)}>
                Cancelar
              </button_1.Button>
              <button_1.Button onClick={handleCriarNovaPasta}>Criar</button_1.Button>
            </dialog_1.DialogFooter>
          </dialog_1.DialogContent>
        </dialog_1.Dialog>
      </div>

      {/* Exibe loading ou erro, senão, exibe as Pastas + Automações */}
      {loading && (<div className="flex justify-center items-center">
          <dotlottie_react_1.DotLottieReact src="/animations/loading.lottie" autoplay loop style={{ width: 150, height: 150 }} aria-label="Carregando automações"/>
        </div>)}

      {error && <div className="text-red-500">Erro: {error}</div>}

      {!loading && !error && (<PastasEAutomacoes_1.default pastas={pastas} automacoes={automacoes} fetchData={fetchData}/>)}
    </div>);
}
