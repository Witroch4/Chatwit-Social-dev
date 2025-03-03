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
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const button_1 = require("@/components/ui/button");
const EditAgendamentoDialog_1 = __importDefault(require("./EditAgendamentoDialog"));
const axios_1 = __importDefault(require("axios"));
const use_toast_1 = require("@/hooks/use-toast");
const AgendamentoItem = ({ agendamento, onExcluir, refetch, userID }) => {
    const { toast } = (0, use_toast_1.useToast)();
    const [isEditOpen, setIsEditOpen] = (0, react_1.useState)(false);
    // Função para deletar agendamento
    const handleExcluir = async () => {
        var _a, _b;
        if (!agendamento.id) {
            toast({
                title: "Erro",
                description: "ID do agendamento não fornecido.",
                variant: "destructive",
            });
            return;
        }
        try {
            const response = await axios_1.default.delete(`/api/agendar/delete/${agendamento.id}`, {
                headers: {
                    "user-id": userID,
                },
            });
            if (response.status === 200) {
                toast({
                    title: "Agendamento Excluído",
                    description: "Seu agendamento foi excluído com sucesso.",
                });
                refetch();
            }
            else {
                toast({
                    title: "Erro ao Excluir",
                    description: "Ocorreu um erro ao excluir o agendamento.",
                    variant: "destructive",
                });
            }
        }
        catch (error) {
            console.error("Erro ao excluir agendamento:", error);
            toast({
                title: "Erro ao Excluir",
                description: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || "Ocorreu um erro ao excluir o agendamento.",
                variant: "destructive",
            });
        }
    };
    return (<li className="p-4 border rounded-md shadow-sm">
      <p className="text-lg font-medium">
        {(0, date_fns_1.format)(new Date(agendamento.Data), "PPP", { locale: locale_1.ptBR })} às{" "}
        {(0, date_fns_1.format)(new Date(agendamento.Data), "HH:mm")}
      </p>
      <p className="text-gray-600">{agendamento.Descrição}</p>
      <div className="mt-2 flex space-x-2">
        <button_1.Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          Editar
        </button_1.Button>
        <button_1.Button variant="destructive" size="sm" onClick={handleExcluir}>
          Excluir
        </button_1.Button>
      </div>
      {isEditOpen && (<EditAgendamentoDialog_1.default agendamento={agendamento} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} refetch={refetch}/>)}
    </li>);
};
exports.default = AgendamentoItem;
