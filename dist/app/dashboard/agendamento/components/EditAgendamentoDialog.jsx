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
const dialog_1 = require("@/components/ui/dialog");
const button_1 = require("@/components/ui/button");
const date_time_picker_1 = require("./date-time-picker");
const LegendaInput_1 = __importDefault(require("./LegendaInput"));
const FileUpload_1 = __importDefault(require("@/components/custom/FileUpload"));
const PostTypeSelector_1 = __importDefault(require("./PostTypeSelector"));
const axios_1 = __importDefault(require("axios"));
const use_toast_1 = require("@/hooks/use-toast");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const scroll_area_1 = require("@/components/ui/scroll-area");
const EditAgendamentoDialog = ({ agendamento, isOpen, onClose, refetch, }) => {
    const { toast } = (0, use_toast_1.useToast)();
    // Estado para data/hora – agendamento.Data vem como string
    const [date, setDate] = (0, react_1.useState)(new Date(agendamento.Data));
    // Função wrapper para setDate
    const handleDateChange = (newDate) => {
        if (newDate) {
            setDate(newDate);
        }
    };
    const [tipoPostagem, setTipoPostagem] = (0, react_1.useState)(getTipoPostagemFromAgendamento(agendamento));
    const [legenda, setLegenda] = (0, react_1.useState)(agendamento.Descrição);
    const [uploadedFiles, setUploadedFiles] = (0, react_1.useState)(agendamento.midia.map((m) => ({
        id: m.name,
        name: m.name,
        original_name: m.visible_name,
        progress: 100, // Mídias existentes já estão uploadadas
        url: m.url,
        thumbnails: m.thumbnails,
        mime_type: m.mime_type,
        is_image: m.is_image,
        image_width: m.image_width,
        image_height: m.image_height,
        uploaded_at: m.uploaded_at,
    })));
    const [uploading, setUploading] = (0, react_1.useState)(false);
    function getTipoPostagemFromAgendamento(agendamento) {
        const tipos = [];
        if (agendamento.Randomizar)
            tipos.push("Aleatório");
        if (agendamento.Diario)
            tipos.push("Diario");
        if (agendamento.PostNormal)
            tipos.push("Post Normal");
        if (agendamento.Reels)
            tipos.push("Reels");
        if (agendamento.Stories)
            tipos.push("Stories");
        return tipos;
    }
    const handleEditar = async () => {
        var _a, _b;
        if (!date) {
            toast({
                title: "Edição Incompleta",
                description: "Por favor, selecione data e hora para o agendamento.",
            });
            return;
        }
        setUploading(true);
        try {
            const midiaNames = uploadedFiles.map((file) => file.name).filter(Boolean);
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
            const isoDate = date.toISOString();
            const updatedRow = {
                Data: isoDate,
                Descrição: legenda,
                midia: uploadedFiles
                    .filter((file) => file.url)
                    .map((file) => ({
                    name: file.name,
                    // Adicione outros campos se necessário
                })),
                X: tipos.Aleatorio,
                Instagram: true,
                Stories: tipos.Stories,
                Reels: tipos.Reels,
                PostNormal: tipos["Post Normal"],
                Diario: tipos.Diario,
                Randomizar: tipos.Aleatorio,
                IGtoken: agendamento.IGtoken,
                userID: agendamento.userID,
            };
            const response = await axios_1.default.patch(`/api/agendar/update/${agendamento.id}`, updatedRow, {
                headers: { "Content-Type": "application/json" },
            });
            setUploading(false);
            if (response.status === 200) {
                toast({
                    title: "Agendamento Atualizado com Sucesso!",
                    description: `Data: ${(0, date_fns_1.format)(date, "PPP 'às' p", { locale: locale_1.ptBR })}`,
                });
                refetch();
                onClose();
            }
            else {
                toast({
                    title: "Erro ao Atualizar Agendamento",
                    description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
                    variant: "destructive",
                });
            }
        }
        catch (error) {
            setUploading(false);
            console.error("Erro ao atualizar o agendamento:", error);
            toast({
                title: "Erro ao Atualizar Agendamento",
                description: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || "Ocorreu um erro ao atualizar o agendamento.",
                variant: "destructive",
            });
        }
    };
    return (<dialog_1.Dialog open={isOpen} onOpenChange={onClose}>
      <dialog_1.DialogContent className="w-full sm:w-full max-w-lg sm:max-w-[600px] max-h-[calc(100vh-100px)] p-4 md:p-6">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Editar Agendamento</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Faça as alterações necessárias no agendamento.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>
        <scroll_area_1.ScrollArea className="max-h-[calc(100vh-250px)]">
          <div className="flex flex-col space-y-4 pr-4">
            {/* Use o wrapper handleDateChange */}
            <date_time_picker_1.DateTimePicker date={date} setDate={handleDateChange}/>
            <LegendaInput_1.default legenda={legenda} setLegenda={setLegenda}/>
            <FileUpload_1.default uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}/>
            <PostTypeSelector_1.default tipoPostagem={tipoPostagem} setTipoPostagem={setTipoPostagem}/>
          </div>
        </scroll_area_1.ScrollArea>
        <dialog_1.DialogFooter className="mt-4">
          <button_1.Button onClick={handleEditar} disabled={uploading}>
            {uploading ? "Concluindo..." : "Concluir"}
          </button_1.Button>
          <button_1.Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancelar
          </button_1.Button>
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
};
exports.default = EditAgendamentoDialog;
