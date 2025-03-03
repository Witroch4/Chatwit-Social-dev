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
exports.default = MenuAcoesAutomacao;
const react_1 = __importStar(require("react"));
const button_1 = require("@/components/ui/button");
const dropdown_menu_1 = require("@/components/ui/dropdown-menu");
const dialog_1 = require("@/components/ui/dialog");
const select_1 = require("@/components/ui/select");
const lucide_react_1 = require("lucide-react");
const label_1 = require("@/components/ui/label");
const input_1 = require("@/components/ui/input");
function MenuAcoesAutomacao({ automacao, fetchData, pastas, }) {
    // Estado do dropdown
    const [menuOpen, setMenuOpen] = (0, react_1.useState)(false);
    // Estados dos diálogos (fora do menu)
    const [openRename, setOpenRename] = (0, react_1.useState)(false);
    const [openDuplicate, setOpenDuplicate] = (0, react_1.useState)(false);
    const [openMove, setOpenMove] = (0, react_1.useState)(false);
    const [openDelete, setOpenDelete] = (0, react_1.useState)(false);
    // Inputs / Seleções
    const [renameValue, setRenameValue] = (0, react_1.useState)("");
    const [selectedFolderId, setSelectedFolderId] = (0, react_1.useState)(null);
    // Handlers de abertura dos diálogos
    function handleOpenRename() {
        setMenuOpen(false); // Fecha o menu
        setRenameValue(automacao.fraseBoasVindas || "");
        setOpenRename(true); // Abre o diálogo
    }
    function handleOpenDuplicate() {
        setMenuOpen(false);
        setOpenDuplicate(true);
    }
    function handleOpenMove() {
        setMenuOpen(false);
        setOpenMove(true);
    }
    function handleOpenDelete() {
        setMenuOpen(false);
        setOpenDelete(true);
    }
    // Funções de API
    async function handleRename() {
        try {
            const res = await fetch(`/api/automacao/${automacao.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "rename",
                    newName: renameValue,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Falha ao renomear automação");
            }
            setRenameValue("");
            setOpenRename(false);
            fetchData();
        }
        catch (e) {
            console.error(e.message);
        }
    }
    async function handleDuplicate() {
        try {
            const res = await fetch(`/api/automacao/${automacao.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "duplicate" }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Falha ao duplicar automação");
            }
            setOpenDuplicate(false);
            fetchData();
        }
        catch (e) {
            console.error(e.message);
        }
    }
    async function handleMove() {
        if (!selectedFolderId)
            return;
        // Determina o folderId com base na seleção
        const folderId = selectedFolderId === "root" ? null : selectedFolderId;
        try {
            const res = await fetch(`/api/automacao/${automacao.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "move", folderId: folderId }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Falha ao mover automação");
            }
            setSelectedFolderId(null);
            setOpenMove(false);
            fetchData();
        }
        catch (e) {
            console.error(e.message);
        }
    }
    async function handleDelete() {
        try {
            const res = await fetch(`/api/automacao/${automacao.id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Falha ao deletar automação");
            }
            setOpenDelete(false);
            fetchData();
        }
        catch (e) {
            console.error(e.message);
        }
    }
    return (<>
      {/* DropdownMenu CONTROLADO */}
      <dropdown_menu_1.DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <dropdown_menu_1.DropdownMenuTrigger asChild>
          <button_1.Button variant="outline" size="icon" className="p-1">
            <lucide_react_1.ChevronDown className="h-4 w-4"/>
          </button_1.Button>
        </dropdown_menu_1.DropdownMenuTrigger>

        <dropdown_menu_1.DropdownMenuContent align="end" className="w-44">
          <dropdown_menu_1.DropdownMenuItem onSelect={(e) => {
            e.preventDefault();
            handleOpenRename();
        }}>
            <lucide_react_1.Edit className="mr-2 h-4 w-4"/>
            Renomear
          </dropdown_menu_1.DropdownMenuItem>
          <dropdown_menu_1.DropdownMenuItem onSelect={(e) => {
            e.preventDefault();
            handleOpenDuplicate();
        }}>
            <lucide_react_1.Copy className="mr-2 h-4 w-4"/>
            Duplicar
          </dropdown_menu_1.DropdownMenuItem>
          <dropdown_menu_1.DropdownMenuItem onSelect={(e) => {
            e.preventDefault();
            handleOpenMove();
        }}>
            <lucide_react_1.FolderPlus className="mr-2 h-4 w-4"/>
            Mover para
          </dropdown_menu_1.DropdownMenuItem>
          <dropdown_menu_1.DropdownMenuSeparator />
          <dropdown_menu_1.DropdownMenuItem className="text-red-600" onSelect={(e) => {
            e.preventDefault();
            handleOpenDelete();
        }}>
            <lucide_react_1.Trash className="mr-2 h-4 w-4"/>
            Apagar
          </dropdown_menu_1.DropdownMenuItem>
        </dropdown_menu_1.DropdownMenuContent>
      </dropdown_menu_1.DropdownMenu>

      {/* DIÁLOGOS FORA DO MENU */}

      {/* RENOMEAR */}
      <dialog_1.Dialog open={openRename} onOpenChange={setOpenRename}>
        <dialog_1.DialogContent className="sm:max-w-[425px]">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Renomear automação</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>Informe um novo nome.</dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label_1.Label htmlFor="nomeAutomacao" className="text-right">
                Novo Nome
              </label_1.Label>
              <input_1.Input id="nomeAutomacao" className="col-span-3" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}/>
            </div>
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setOpenRename(false)}>
              Cancelar
            </button_1.Button>
            <button_1.Button onClick={handleRename}>Renomear</button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* DUPLICAR */}
      <dialog_1.Dialog open={openDuplicate} onOpenChange={setOpenDuplicate}>
        <dialog_1.DialogContent className="sm:max-w-[425px]">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Duplicar automação</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>Tem certeza?</dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setOpenDuplicate(false)}>
              Cancelar
            </button_1.Button>
            <button_1.Button onClick={handleDuplicate}>Duplicar</button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* MOVER PARA */}
      <dialog_1.Dialog open={openMove} onOpenChange={setOpenMove}>
        <dialog_1.DialogContent className="sm:max-w-[425px]">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Mover automação</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>Selecione a pasta de destino ou mova para a raiz.</dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="py-4">
            <label_1.Label>Pasta:</label_1.Label>
            <select_1.Select onValueChange={(val) => setSelectedFolderId(val)}>
              <select_1.SelectTrigger className="mt-2 w-full">
                <select_1.SelectValue placeholder="Selecione uma pasta ou Raiz"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {/* Opção para mover para a Raiz */}
                <select_1.SelectItem key="root" value="root">
                  Raiz
                </select_1.SelectItem>
                {pastas.length > 0 && <dropdown_menu_1.DropdownMenuSeparator />}
                {/* Lista de pastas existentes */}
                {pastas.map((p) => (<select_1.SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setOpenMove(false)}>
              Cancelar
            </button_1.Button>
            <button_1.Button onClick={handleMove} disabled={!selectedFolderId}>
              Confirmar
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* APAGAR */}
      <dialog_1.Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <dialog_1.DialogContent className="sm:max-w-[425px]">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Apagar automação</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Isso não poderá ser desfeito.
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setOpenDelete(false)}>
              Cancelar
            </button_1.Button>
            <button_1.Button variant="destructive" onClick={handleDelete}>
              Apagar
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </>);
}
