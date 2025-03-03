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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NovaAutomacaoDialog;
const react_1 = __importStar(require("react"));
const button_1 = require("@/components/ui/button");
const dialog_1 = require("@/components/ui/dialog");
const utils_1 = require("@/lib/utils");
const navigation_1 = require("next/navigation");
function NovaAutomacaoDialog() {
    const [open, setOpen] = (0, react_1.useState)(false);
    const router = (0, navigation_1.useRouter)();
    // Exemplo: Se for criar uma automação “Eu Quero...”
    function handleCardAutomacaoEuQuero() {
        // Redireciona para a página de criação/edição
        router.push("/dashboard/automacao/guiado-facil");
        setOpen(false);
    }
    return (<dialog_1.Dialog open={open} onOpenChange={setOpen}>
      <dialog_1.DialogTrigger asChild>
        <button_1.Button>+ Nova Automação</button_1.Button>
      </dialog_1.DialogTrigger>
      <dialog_1.DialogContent className={(0, utils_1.cn)("sm:max-w-[800px]", "max-h-[80vh] overflow-y-auto", "mx-auto")}>
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Modelos prontos</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Recomendados &mdash; Principais modelos para impulsionar o seu Instagram
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Exemplo de Card habilitado */}
            <div onClick={handleCardAutomacaoEuQuero} className="border border-gray-300 rounded-lg p-3 cursor-pointer hover:border-blue-400">
              <h3 className="font-bold text-sm md:text-base mb-1">
                Automação Eu Quero - Enviar links automaticamente por DM
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Envie um link sempre que alguém comentar em uma publicação ou reel
              </p>
              <div className="text-xs md:text-sm flex items-center justify-between mt-3">
                <span className="font-semibold">Automação Rápida</span>
                <span className="px-2 py-1 text-xs bg-pink-500 text-white rounded-full">
                  POPULAR
                </span>
              </div>
            </div>

            {/* Cards de exemplo “Em desenvolvimento” */}
            <CardEmDesenvolvimento titulo="Gere leads dos stories" descricao="Use ofertas por tempo limitado nos Stories para converter leads" rodape="Fluxo Canva"/>
            <CardEmDesenvolvimento titulo="Use IA para automatizar interações" descricao="Utilize a IA para coletar dados dos seguidores..." rodape="Fluxo Canva + IA"/>
            {/* ... outros cards que desejar ... */}
          </div>
        </div>

        <dialog_1.DialogFooter>
          <button_1.Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </button_1.Button>
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
/* ------------------------------------------------------------------
   CARD "Em Desenvolvimento" (exemplo)
------------------------------------------------------------------ */
function CardEmDesenvolvimento({ titulo, descricao, rodape, }) {
    return (<div className="relative border border-gray-300 rounded-lg p-3 opacity-50 cursor-not-allowed">
      <div className="absolute top-2 -right-10 transform rotate-45 bg-red-600 text-white text-xs font-bold px-6 py-1">
        Em Desenvolvimento
      </div>
      <h3 className="font-bold text-sm md:text-base mb-1">{titulo}</h3>
      <p className="text-xs md:text-sm text-muted-foreground">{descricao}</p>
      <div className="text-xs md:text-sm flex items-center justify-between mt-3">
        <span>{rodape}</span>
      </div>
    </div>);
}
