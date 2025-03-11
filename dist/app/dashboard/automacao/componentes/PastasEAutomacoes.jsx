"use strict";
//app\dashboard\automacao\componentes\PastasEAutomacoes.tsx
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
exports.default = PastasEAutomacoes;
const react_1 = __importStar(require("react"));
const button_1 = require("../../../../components/ui/button");
const MenuAcoesAutomacao_1 = __importDefault(require("./MenuAcoesAutomacao"));
function PastasEAutomacoes({ pastas, automacoes, fetchData, }) {
    const [openNovaPasta, setOpenNovaPasta] = (0, react_1.useState)(false);
    const [novaPastaName, setNovaPastaName] = (0, react_1.useState)("");
    // Estado que indica qual pasta está aberta (ou null se estiver na raiz)
    const [currentFolderId, setCurrentFolderId] = (0, react_1.useState)(null);
    // Cria uma nova pasta
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
    // Ao clicar em uma pasta, entramos nela (mostrando somente as automações dessa pasta)
    function handleEnterFolder(folderId) {
        setCurrentFolderId(folderId);
    }
    // Se estiver dentro de uma pasta, este botão volta para a raiz
    function handleGoBackToRoot() {
        setCurrentFolderId(null);
    }
    // Abre automação existente
    function handleOpenAutomacao(autoId) {
        window.location.href = `/dashboard/automacao/guiado-facil/${autoId}`;
    }
    // -------------------------------------------------------------
    // Filtragem de automações baseada em currentFolderId
    // -------------------------------------------------------------
    const automacoesFiltradas = automacoes.filter((auto) => {
        // Se NÃO há pasta selecionada, mostra apenas automações sem folderId
        if (!currentFolderId) {
            return auto.folderId === null;
        }
        // Se há pasta selecionada, mostra as automações cujo folderId seja igual a currentFolderId
        return auto.folderId === currentFolderId;
    });
    // -------------------------------------------------------------
    // Renderização
    // -------------------------------------------------------------
    return (<div>
      {/* Botão "Nova Pasta" + Diálogo */}

      {/* Se estamos dentro de uma pasta, exibe o botão "Voltar" */}
      {currentFolderId && (<div className="mb-4">
          <button_1.Button variant="outline" onClick={handleGoBackToRoot}>
            ← Voltar para raiz
          </button_1.Button>
        </div>)}

      {/* LISTAGEM DE PASTAS (apenas se não houver pasta selecionada) */}
      {!currentFolderId && (<div className="mb-6 space-y-2">
          {pastas.map((pasta) => (<div key={pasta.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors p-2 rounded" onClick={() => handleEnterFolder(pasta.id)}>
              <FolderIcon />
              <span>{pasta.name}</span>
            </div>))}
        </div>)}

      {/* LISTAGEM DE AUTOMAÇÕES (filtradas) */}
      {automacoesFiltradas.length === 0 ? (<div className="text-sm text-muted-foreground">
          Nenhuma automação {currentFolderId ? "nesta pasta" : "na raiz"}.
        </div>) : (<div className="space-y-2">
          {automacoesFiltradas.map((auto) => (<div key={auto.id} className="flex items-center justify-between px-4 py-3 border rounded">
              <div className="flex flex-col cursor-pointer hover:bg-gray-100 transition-colors p-2 rounded" onClick={() => handleOpenAutomacao(auto.id)}>
                <span className="font-semibold">
                  {auto.fraseBoasVindas || "Automação Sem Título"}
                </span>
                <div className="text-xs text-muted-foreground">ID: {auto.id}</div>
              </div>

              {/* Menu de Ações (Renomear, Duplicar, Mover, Apagar) */}
              <MenuAcoesAutomacao_1.default automacao={auto} pastas={pastas} fetchData={fetchData}/>
            </div>))}
        </div>)}
    </div>);
}
/* ÍCONE DE PASTA */
function FolderIcon() {
    return (<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gray-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75v-5.5c0-.828.672-1.5 1.5-1.5h6l2 2h8a1.5 1.5 0 011.5 1.5v3.5M2.25 12.75h19.5M2.25 12.75l1.5 7.5c.15.75.825 1.25 1.575 1.25h13.35c.75 0 1.425-.5 1.575-1.25l1.5-7.5"></path>
    </svg>);
}
