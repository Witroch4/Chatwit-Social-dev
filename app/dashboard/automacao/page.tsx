"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { ChevronDown } from "lucide-react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

// DropdownMenu do shadcn/ui
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Tipagens (ajuste conforme seu schema do Prisma, se necessário)
interface Pasta {
  id: string
  name: string
  userId: string
}

interface Automacao {
  id: string
  fraseBoasVindas: string | null // Pode ser usado como "título" da automação
  updatedAt: string
  folderId: string | null
}

export default function AutomacaoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // =========================================================================
  // =========================== Estados de Pasta =============================
  // =========================================================================
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [openNovaPasta, setOpenNovaPasta] = useState(false)
  const [novaPastaName, setNovaPastaName] = useState("")

  // =========================================================================
  // ========================= Estados de Automação ===========================
  // =========================================================================
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Diálogo "+ Nova Automação"
  const [openNovaAutomacao, setOpenNovaAutomacao] = useState(false)

  // =========================================================================
  // ===================== Diálogo de "Renomear Automação" ===================
  // =========================================================================
  const [openRenameDialog, setOpenRenameDialog] = useState(false)
  const [renameInputValue, setRenameInputValue] = useState("")
  const [selectedAutoForRename, setSelectedAutoForRename] = useState<Automacao | null>(null)

  // =========================================================================
  // =============== Carrega Pastas e Automações ao montar ===================
  // =========================================================================
  useEffect(() => {
    if (status === "loading") return
    if (!session?.user?.id) return
    fetchData()
  }, [session, status])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [resPastas, resAutomacoes] = await Promise.all([
        fetch("/api/pasta"),
        fetch("/api/automacao"),
      ])

      if (!resPastas.ok) {
        const err1 = await resPastas.json()
        throw new Error(err1.error || "Falha ao carregar pastas")
      }
      if (!resAutomacoes.ok) {
        const err2 = await resAutomacoes.json()
        throw new Error(err2.error || "Falha ao carregar automações")
      }

      const dataPastas = await resPastas.json()
      const dataAutomacoes = await resAutomacoes.json()

      setPastas(dataPastas)
      setAutomacoes(dataAutomacoes)
    } catch (e: any) {
      setError(e.message)
      console.error("Erro:", e)
    } finally {
      setLoading(false)
    }
  }

  // =========================================================================
  // =========================== Ações de Pastas ==============================
  // =========================================================================
  async function handleCriarNovaPasta() {
    if (!novaPastaName.trim()) return
    try {
      const res = await fetch("/api/pasta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: novaPastaName.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao criar pasta")
      }
      // Se der certo, limpa o input e fecha o diálogo
      setNovaPastaName("")
      setOpenNovaPasta(false)
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  // =========================================================================
  // ========================= Ações de Automação =============================
  // =========================================================================

  // Abrir Dialog de Renomear Automação
  function handleOpenRenameDialog(auto: Automacao) {
    setSelectedAutoForRename(auto)
    setRenameInputValue(auto.fraseBoasVindas || "")
    setOpenRenameDialog(true)
  }

  // Confirmar Renomear Automação
  async function handleConfirmRename() {
    if (!selectedAutoForRename) return
    try {
      const res = await fetch(`/api/automacao/${selectedAutoForRename.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          newName: renameInputValue,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao renomear automação")
      }
      // Atualiza a lista e fecha o diálogo
      setOpenRenameDialog(false)
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  // Duplicar Automação
  async function handleDuplicateAutomacao(autoId: string) {
    const confirmDup = window.confirm("Deseja duplicar esta automação?")
    if (!confirmDup) return
    try {
      const res = await fetch(`/api/automacao/${autoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao duplicar automação")
      }
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  // Mover Automação para uma Pasta
  async function handleMoveAutomacao(autoId: string) {
    const pastaNames = pastas.map((p) => p.name).join("\n")
    const pastaEscolhida = window.prompt(
      "Selecione a pasta digitando o nome:\n\n" + pastaNames
    )
    if (!pastaEscolhida) return
    const folder = pastas.find((p) => p.name === pastaEscolhida)
    if (!folder) {
      window.alert("Pasta não encontrada")
      return
    }
    try {
      const res = await fetch(`/api/automacao/${autoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", folderId: folder.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao mover automação")
      }
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  // Deletar Automação
  async function handleDeleteAutomacao(autoId: string) {
    const confirmDel = window.confirm("Tem certeza que deseja apagar esta automação?")
    if (!confirmDel) return
    try {
      const res = await fetch(`/api/automacao/${autoId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao deletar automação")
      }
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  // Criar Automação Rápida (Card “Automação Eu Quero...”)
  function handleCardAutomacaoEuQuero() {
    // Vai para página "guiado-facil"
    router.push("/dashboard/automacao/guiado-facil")
    setOpenNovaAutomacao(false)
  }

  // Abrir página de edição de Automação existente
  function handleOpenAutomacao(autoId: string) {
    // Ex: "/dashboard/automacao/guiado-facil/cm6cjpdbh000bph24ptcktbtz"
    router.push(`/dashboard/automacao/guiado-facil/${autoId}`)
  }

  // =========================================================================
  // ================================ Render ==================================
  // =========================================================================
  // Tela de “carregando” sessão do next-auth
  if (status === "loading") {
    return <div className="p-4">Carregando sessão...</div>
  }

  // Se o usuário não está autenticado
  if (!session?.user?.id) {
    return <div className="p-4">Você não está autenticado.</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Automatização</h1>
      <Separator className="my-3" />

      <h2 className="text-xl font-semibold mb-2">Minhas Automações</h2>

      {/* --------------------------------------------------------------
          BARRA DE AÇÕES (Nova Automação, Nova Pasta)
      -------------------------------------------------------------- */}
      <div className="flex items-center gap-2 mb-6">
        {/* + Nova Automação */}
        <Dialog open={openNovaAutomacao} onOpenChange={setOpenNovaAutomacao}>
          <DialogTrigger asChild>
            <Button>+ Nova Automação</Button>
          </DialogTrigger>
          <DialogContent
            className={cn(
              "sm:max-w-[800px]",
              "max-h-[80vh] overflow-y-auto",
              "mx-auto"
            )}
          >
            <DialogHeader>
              <DialogTitle>Modelos prontos</DialogTitle>
              <DialogDescription>
                Recomendados &mdash; Principais modelos para impulsionar o seu Instagram
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card habilitado */}
                <div
                  onClick={handleCardAutomacaoEuQuero}
                  className="border border-gray-300 rounded-lg p-3 cursor-pointer hover:border-blue-400"
                >
                  <h3 className="font-bold text-sm md:text-base mb-1">
                    Automação Eu Quero - Enviar links automaticamente por DM a partir dos comentários
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

                {/* Exemplo de cartões em desenvolvimento */}
                <CardEmDesenvolvimento
                  titulo="Gere leads dos stories"
                  descricao="Use ofertas por tempo limitado nos Stories para converter leads"
                  rodape="Fluxo Canva"
                />
                <CardEmDesenvolvimento
                  titulo="Use IA para automatizar interações"
                  descricao="Utilize a IA para coletar as informações dos seus seguidores..."
                  rodape="Fluxo Canva    AI"
                />
                {/* ... adicione outros cards que quiser ... */}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNovaAutomacao(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* + Nova Pasta */}
        <Dialog open={openNovaPasta} onOpenChange={setOpenNovaPasta}>
          <DialogTrigger asChild>
            <Button variant="outline">+ Nova Pasta</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar nova pasta</DialogTitle>
              <DialogDescription>
                Digite o nome da pasta para organizar suas automações.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nomePasta" className="text-right">
                  Nome
                </Label>
                <Input
                  id="nomePasta"
                  placeholder="Minha nova pasta"
                  className="col-span-3"
                  value={novaPastaName}
                  onChange={(e) => setNovaPastaName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNovaPasta(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCriarNovaPasta}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* --------------------------------------------------------------
          LISTAGEM DE PASTAS
      -------------------------------------------------------------- */}
      <div className="mb-6 space-y-2">
        {pastas.map((pasta) => (
          <div key={pasta.id} className="flex items-center gap-2">
            <FolderIcon />
            <span>{pasta.name}</span>
          </div>
        ))}
      </div>

      {/* --------------------------------------------------------------
          LISTAGEM DE AUTOMAÇÕES
      -------------------------------------------------------------- */}
      {loading && (
        <div className="flex justify-center items-center">
          <DotLottieReact
            src="/animations/loading.lottie"
            autoplay
            loop
            style={{ width: 150, height: 150 }}
            aria-label="Carregando automações"
          />
        </div>
      )}

      {error && <div className="text-red-500">Erro: {error}</div>}

      {!loading && !error && automacoes.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Nenhuma automação cadastrada.
        </div>
      )}

      {!loading && !error && automacoes.length > 0 && (
        <div className="space-y-2">
          {automacoes.map((auto) => (
            <div
              key={auto.id}
              className="flex items-center justify-between px-4 py-3 border rounded"
            >
              {/* Clique no nome para abrir automação */}
              <div
                className="flex flex-col cursor-pointer"
                onClick={() => handleOpenAutomacao(auto.id)}
              >
                <span className="font-semibold">
                  {auto.fraseBoasVindas || "Automação Sem Título"}
                </span>
                <div className="text-xs text-muted-foreground">ID: {auto.id}</div>
              </div>

              {/* Menu Dropdown de ações */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="p-1">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40">
                  <DropdownMenuItem onClick={() => handleOpenRenameDialog(auto)}>
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateAutomacao(auto.id)}>
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMoveAutomacao(auto.id)}>
                    Mover para
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleDeleteAutomacao(auto.id)}
                  >
                    Apagar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------------
          DIALOG "RENOMEAR AUTOMAÇÃO"
      -------------------------------------------------------------- */}
      <Dialog open={openRenameDialog} onOpenChange={setOpenRenameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renomear automação</DialogTitle>
            <DialogDescription>
              Informe um novo nome para a automação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nomeAutomacao" className="text-right">
                Novo Nome
              </Label>
              <Input
                id="nomeAutomacao"
                className="col-span-3"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRenameDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmRename}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------
   CARD "Em Desenvolvimento"
------------------------------------------------------------------ */
function CardEmDesenvolvimento({
  titulo,
  descricao,
  rodape,
}: {
  titulo: string
  descricao: string
  rodape: string
}) {
  return (
    <div className="relative border border-gray-300 rounded-lg p-3 opacity-50 cursor-not-allowed">
      <div className="absolute top-2 -right-10 transform rotate-45 bg-red-600 text-white text-xs font-bold px-6 py-1">
        Em Desenvolvimento
      </div>
      <h3 className="font-bold text-sm md:text-base mb-1">{titulo}</h3>
      <p className="text-xs md:text-sm text-muted-foreground">{descricao}</p>
      <div className="text-xs md:text-sm flex items-center justify-between mt-3">
        <span>{rodape}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   ÍCONE DE PASTA
------------------------------------------------------------------ */
function FolderIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      className="text-gray-600"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75v-5.5c0-.828.672-1.5 1.5-1.5h6l2 2h8a1.5 1.5 0 011.5 1.5v3.5M2.25 12.75h19.5M2.25 12.75l1.5 7.5c.15.75.825 1.25 1.575 1.25h13.35c.75 0 1.425-.5 1.575-1.25l1.5-7.5"
      ></path>
    </svg>
  )
}
