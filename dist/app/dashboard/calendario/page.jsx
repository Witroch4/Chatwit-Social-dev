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
const calendar_1 = require("@/components/ui/calendar");
const dialog_1 = require("@/components/ui/dialog");
const button_1 = require("@/components/ui/button");
const dotlottie_react_1 = require("@lottiefiles/dotlottie-react");
const useAgendamentos_1 = __importDefault(require("@/hooks/useAgendamentos"));
const use_toast_1 = require("@/hooks/use-toast");
const axios_1 = __importDefault(require("axios"));
const navigation_1 = require("next/navigation");
const CalendarioPage = () => {
    var _a;
    const { data: session, status } = (0, react_2.useSession)();
    const userID = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id;
    const { agendamentos, loading, error, refetch } = (0, useAgendamentos_1.default)(userID);
    const { toast } = (0, use_toast_1.useToast)();
    const router = (0, navigation_1.useRouter)();
    // Estado para o dia selecionado e para controlar o diálogo
    const [selectedDay, setSelectedDay] = (0, react_1.useState)(null);
    const [dialogOpen, setDialogOpen] = (0, react_1.useState)(false);
    // Filtra os agendamentos do dia selecionado
    const appointmentsForSelectedDay = selectedDay
        ? agendamentos.filter((ag) => (0, date_fns_1.isSameDay)(new Date(ag.Data), selectedDay))
        : [];
    // Cria um conjunto de strings (no formato "yyyy-MM-dd") para os dias que possuem agendamento
    const appointmentDays = new Set(agendamentos.map((ag) => (0, date_fns_1.format)(new Date(ag.Data), "yyyy-MM-dd")));
    // Quando o usuário seleciona um dia, atualiza o estado e abre o diálogo
    const handleDaySelect = (date) => {
        if (!date)
            return;
        setSelectedDay(date);
        setDialogOpen(true);
    };
    // Função para excluir um agendamento
    const handleDelete = async (agendamentoId) => {
        var _a, _b;
        try {
            const response = await axios_1.default.delete(`/api/agendar/${agendamentoId}`);
            if (response.status === 200) {
                toast({
                    title: "Agendamento Excluído",
                    description: "O agendamento foi excluído com sucesso.",
                });
                refetch();
            }
        }
        catch (err) {
            toast({
                title: "Erro ao Excluir",
                description: ((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) ||
                    "Ocorreu um erro ao excluir o agendamento.",
                variant: "destructive",
            });
        }
    };
    // Função para editar um agendamento (navega para a página de edição)
    const handleEdit = (agendamentoId) => {
        router.push(`/dashboard/agendamento/editar/${agendamentoId}`);
    };
    return (<main className="p-4 sm:p-10 space-y-4">
      <h1 className="text-2xl font-bold">Calendário de Agendamentos</h1>

      {loading && (<div className="flex justify-center items-center">
          <dotlottie_react_1.DotLottieReact src="/animations/loading.lottie" autoplay loop style={{ width: 150, height: 150 }} aria-label="Carregando agendamentos"/>
        </div>)}

      {error && <p className="text-red-500">{error}</p>}

      {!loading && (<calendar_1.Calendar mode="single" selected={selectedDay || undefined} onSelect={handleDaySelect} locale={locale_1.ptBR} 
        /*
          Utilizando os modificadores para marcar (ex.: sublinhar) os dias
          que possuem algum agendamento. Essa funcionalidade depende da implementação
          do seu componente Calendar (baseado em react-day-picker, por exemplo).
        */
        modifiers={{
                hasAppointments: (date) => appointmentDays.has((0, date_fns_1.format)(date, "yyyy-MM-dd")),
            }} modifiersClassNames={{
                hasAppointments: "underline",
            }}/>)}

      {/* Diálogo que exibe os agendamentos do dia selecionado */}
      <dialog_1.Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <dialog_1.DialogContent className="max-w-md">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>
              Agendamentos para{" "}
              {selectedDay ? (0, date_fns_1.format)(selectedDay, "dd/MM/yyyy") : ""}
            </dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              {appointmentsForSelectedDay.length > 0
            ? "Clique em editar ou excluir para gerenciar o agendamento."
            : "Nenhum agendamento para este dia."}
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="space-y-4 my-4">
            {appointmentsForSelectedDay.map((ag) => (<div key={ag.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-semibold">
                    {(0, date_fns_1.format)(new Date(ag.Data), "HH:mm:ss")}
                  </p>
                  <p className="text-sm text-muted-foreground">{ag.Descrição}</p>
                </div>
                <div className="flex gap-2">
                  <button_1.Button size="sm" onClick={() => handleEdit(ag.id)}>
                    Editar
                  </button_1.Button>
                  <button_1.Button size="sm" variant="destructive" onClick={() => handleDelete(ag.id)}>
                    Excluir
                  </button_1.Button>
                </div>
              </div>))}
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button onClick={() => setDialogOpen(false)}>Concluir</button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </main>);
};
exports.default = CalendarioPage;
