"use strict";
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
const react_1 = __importStar(require("react"));
const react_2 = require("next-auth/react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const axios_1 = __importDefault(require("axios"));
const button_1 = require("../../../components/ui/button");
const drawer_1 = require("../../../components/ui/drawer");
const AgendamentoForm_1 = __importDefault(require("../../../app/dashboard/agendamento/components/AgendamentoForm"));
const AgendamentosList_1 = __importDefault(require("../../../app/dashboard/agendamento/components/AgendamentosList"));
const use_toast_1 = require("../../../hooks/use-toast");
const useAgendamentos_1 = __importDefault(require("../../../hooks/useAgendamentos"));
const navigation_1 = require("next/navigation");
const dotlottie_react_1 = require("@lottiefiles/dotlottie-react");
const AgendamentoDePostagens = () => {
    var _a, _b;
    const { data: session, status } = (0, react_2.useSession)();
    const router = (0, navigation_1.useRouter)();
    const userID = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id;
    const IGtoken = (_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.instagramAccessToken;
    // Estado combinado para data e hora
    const [dateTime, setDateTime] = (0, react_1.useState)(new Date());
    const [tipoPostagem, setTipoPostagem] = (0, react_1.useState)([]);
    const [uploading, setUploading] = (0, react_1.useState)(false);
    const [legenda, setLegenda] = (0, react_1.useState)("");
    const [uploadedFiles, setUploadedFiles] = (0, react_1.useState)([]);
    // Estados que controlam os Popovers do Drawer
    const [drawerOpen, setDrawerOpen] = (0, react_1.useState)(false);
    const { toast } = (0, use_toast_1.useToast)();
    // Hook para buscar agendamentos
    const { agendamentos, loading, error, refetch } = (0, useAgendamentos_1.default)(userID);
    // Função para lidar com o agendamento
    const handleAgendar = async () => {
        var _a, _b;
        if (!dateTime) {
            toast({
                title: "Agendamento Incompleto",
                description: "Por favor, selecione data e hora para agendar.",
            });
            return;
        }
        if (!userID) {
            toast({
                title: "Usuário Não Autenticado",
                description: "Por favor, faça login para agendar postagens.",
            });
            return;
        }
        if (!IGtoken) {
            toast({
                title: "Token do Instagram Não Disponível",
                description: "Não foi possível obter o token do Instagram.",
                variant: "destructive",
            });
            return;
        }
        setUploading(true);
        try {
            const midiaNames = uploadedFiles
                .map((file) => file.name)
                .filter(Boolean);
            if (midiaNames.length === 0) {
                toast({
                    title: "Mídia Não Enviada",
                    description: "Por favor, faça upload de pelo menos um arquivo de mídia.",
                    variant: "destructive",
                });
                setUploading(false);
                return;
            }
            const tipos = {
                "Post Normal": tipoPostagem.includes("Post Normal"),
                Reels: tipoPostagem.includes("Reels"),
                Stories: tipoPostagem.includes("Stories"),
                Diario: tipoPostagem.includes("Diario"),
                Aleatorio: tipoPostagem.includes("Aleatório"),
            };
            const isoDate = dateTime.toISOString();
            const newRow = {
                Data: isoDate,
                Descrição: legenda,
                Facebook: false,
                midia: midiaNames.map((name) => ({ name })),
                Instagram: true,
                Stories: tipos.Stories,
                Reels: tipos.Reels,
                PostNormal: tipos["Post Normal"],
                Diario: tipos.Diario,
                Randomizar: tipos.Aleatorio,
                IGtoken: IGtoken,
                userID: userID,
            };
            const response = await axios_1.default.post("/api/agendar", newRow, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            setUploading(false);
            if (response.status === 200 || response.status === 201) {
                toast({
                    title: "Agendamento Criado com Sucesso!",
                    description: `Data: ${(0, date_fns_1.format)(dateTime, "PPP", {
                        locale: locale_1.ptBR,
                    })} às ${(0, date_fns_1.format)(dateTime, "HH:mm:ss")}`,
                    action: (<button_1.Button variant="link" size="sm" onClick={() => {
                            router.refresh();
                        }}>
              Ver Agendamento
            </button_1.Button>),
                });
                // Limpar o formulário após o sucesso
                setDateTime(new Date()); // Reset para a data e hora atual
                setTipoPostagem([]);
                setLegenda("");
                setUploadedFiles([]);
                setDrawerOpen(false); // Fechar o Drawer após o agendamento
                refetch(); // Refazer a busca dos agendamentos
            }
            else {
                toast({
                    title: "Erro ao Agendar",
                    description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
                    variant: "destructive",
                });
            }
        }
        catch (error) {
            setUploading(false);
            console.error("Erro ao agendar a postagem:", error);
            toast({
                title: "Erro ao Agendar",
                description: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) ||
                    "Ocorreu um erro ao agendar a postagem.",
                variant: "destructive",
            });
        }
    };
    // Função que adapta o setter para aceitar SetStateAction completo
    const handleSetDateTime = (value) => {
        if (typeof value === "function") {
            setDateTime(value);
        }
        else if (value !== undefined) {
            setDateTime(value);
        }
    };
    // Redirecionamento ou alerta se não estiver autenticado
    (0, react_1.useEffect)(() => {
        if (status === "loading")
            return; // Não faça nada enquanto estiver carregando
        if (!session) {
            console.warn("Usuário não autenticado.");
            // Implementar redirecionamento se necessário
        }
    }, [session, status]);
    return (<main className="p-4 sm:p-10 space-y-4">
      <h1 className="text-2xl font-bold">Agendamento de Postagens</h1>

      <drawer_1.Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <drawer_1.DrawerTrigger asChild>
          <button_1.Button variant="outline">Novo Agendamento</button_1.Button>
        </drawer_1.DrawerTrigger>
        {/* Alteração: Trocar 'overflow-hidden' para 'overflow-visible' */}
        <drawer_1.DrawerContent className="fixed bottom-0 left-0 right-0 h-3/4 bg-white rounded-t-xl shadow-lg overflow-visible">
          <AgendamentoForm_1.default dateTime={dateTime} setDateTime={handleSetDateTime} tipoPostagem={tipoPostagem} setTipoPostagem={setTipoPostagem} legenda={legenda} setLegenda={setLegenda} uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} handleAgendar={handleAgendar} uploading={uploading} setDrawerOpen={setDrawerOpen}/>
        </drawer_1.DrawerContent>
      </drawer_1.Drawer>

      {/* Listagem de Agendamentos */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Seus Agendamentos</h2>
        {loading && (<div className="flex justify-center items-center">
            <dotlottie_react_1.DotLottieReact src="/animations/loading.lottie" // Referência via URL
         autoplay loop={true} style={{ width: 150, height: 150 }} aria-label="Carregando agendamentos"/>
          </div>)}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && agendamentos.length === 0 && (<p>Nenhum agendamento encontrado.</p>)}
        {!loading && agendamentos.length > 0 && (<AgendamentosList_1.default agendamentos={agendamentos} refetch={refetch} userID={userID || ""}/>)}
      </section>
    </main>);
};
exports.default = AgendamentoDePostagens;
