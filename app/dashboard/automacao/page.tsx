// app/dashboard/automacao/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

import PastasEAutomacoes from "./componentes/PastasEAutomacoes"
import NovaAutomacaoDialog from "./componentes/NovaAutomacaoDialog"
import { Button } from "@/components/ui/button" // Import necessário para o botão "Nova Pasta"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Pasta {
  id: string
  name: string
  userId: string
}

interface Automacao {
  id: string
  fraseBoasVindas: string | null
  updatedAt: string
  folderId: string | null
}

export default function AutomacaoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Estados de Pastas/Automações
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para o diálogo "Nova Pasta"
  const [openNovaPasta, setOpenNovaPasta] = useState(false)
  const [novaPastaName, setNovaPastaName] = useState("")

  // Carrega dados ao montar
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

  // Função para criar nova pasta
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
      setNovaPastaName("")
      setOpenNovaPasta(false)
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  // Verificações de sessão
  if (status === "loading") {
    return <div className="p-4">Carregando sessão...</div>
  }

  if (!session?.user?.id) {
    return <div className="p-4">Você não está autenticado.</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Automatização</h1>
      <Separator className="my-3" />

      <h2 className="text-xl font-semibold mb-4">Minhas Automações</h2>

      {/* Contêiner Flexível para os Botões "Nova Automação" e "Nova Pasta" */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Botão + Diálogo de Nova Automação */}
        <NovaAutomacaoDialog />

        {/* Botão + Diálogo de Nova Pasta */}
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

      {/* Exibe loading ou erro, senão, exibe as Pastas + Automações */}
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

      {!loading && !error && (
        <PastasEAutomacoes
          pastas={pastas}
          automacoes={automacoes}
          fetchData={fetchData}
        />
      )}
    </div>
  )
}
