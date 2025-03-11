"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

import PastasEAutomacoes from "./componentes/PastasEAutomacoes"
import NovaAutomacaoDialog from "./componentes/NovaAutomacaoDialog"

import { Button } from "@/components/ui/button"
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
  const params = useParams()
  const accountid = params?.accountid as string  // <-- Corrige o tipo do accountid

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

    // Se não tiver accountid na URL, pode exibir erro ou redirecionar
    if (!accountid) {
      setError("Nenhuma conta foi especificada na URL.")
      setLoading(false)
      return
    }

    // Caso contrário, buscar dados
    fetchData(accountid)
  }, [session, status, accountid])

  async function fetchData(accId: string) {
    setLoading(true)
    setError(null)

    try {
      // Busca as pastas normalmente (não está filtrado por conta, a não ser que queira)
      const resPastas = await fetch(`/api/pasta?providerAccountId=${accId}`)
      if (!resPastas.ok) {
        const err1 = await resPastas.json()
        throw new Error(err1.error || "Falha ao carregar pastas")
      }
      const dataPastas = await resPastas.json()

      // Busca as automações para a conta atual
      const resAutomacoes = await fetch(`/api/automacao?providerAccountId=${accId}`)
      if (!resAutomacoes.ok) {
        const err2 = await resAutomacoes.json()
        throw new Error(err2.error || "Falha ao carregar automações")
      }
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
      // Recarrega dados (pastas)
      if (accountid) {
        fetchData(accountid)
      }
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
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Automações</h1>
          <div className="flex gap-2">
            <Button onClick={() => setOpenNovaPasta(true)}>+ Nova Pasta</Button>
            <NovaAutomacaoDialog />
          </div>
        </div>

        <Separator className="my-4" />

        {loading && (
                      <div className="flex justify-center items-center">
                        <DotLottieReact
                          src="/animations/loading.lottie"
                          autoplay
                          loop={true}
                          style={{ width: 150, height: 150 }}
                          aria-label="Carregando agendamentos"
                        />
                      </div>
                    )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <PastasEAutomacoes
            pastas={pastas}
            automacoes={automacoes}
            providerAccountId={accountid}
            onCreated={() => fetchData(accountid)}
          />
        )}
      </div>
    </div>
  )
}
