"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"

import { ChevronDown, Edit, Copy, FolderPlus, Trash } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface Automacao {
  id: string
  fraseBoasVindas: string | null
  updatedAt: string
  folderId: string | null
}

interface Pasta {
  id: string
  name: string
  userId: string
}

interface MenuAcoesProps {
  automacao: Automacao
  fetchData: () => void
  pastas: Pasta[]
  providerAccountId: string
}

export default function MenuAcoesAutomacao({
  automacao,
  fetchData,
  pastas,
  providerAccountId,
}: MenuAcoesProps) {
  // Estado do dropdown
  const [menuOpen, setMenuOpen] = useState(false)

  // Estados dos diálogos (fora do menu)
  const [openRename, setOpenRename] = useState(false)
  const [openDuplicate, setOpenDuplicate] = useState(false)
  const [openMove, setOpenMove] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)

  // Inputs / Seleções
  const [renameValue, setRenameValue] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  // Handlers de abertura dos diálogos
  function handleOpenRename() {
    setMenuOpen(false) // Fecha o menu
    setRenameValue(automacao.fraseBoasVindas || "")
    setOpenRename(true) // Abre o diálogo
  }

  function handleOpenDuplicate() {
    setMenuOpen(false)
    setOpenDuplicate(true)
  }

  function handleOpenMove() {
    setMenuOpen(false)
    setOpenMove(true)
  }

  function handleOpenDelete() {
    setMenuOpen(false)
    setOpenDelete(true)
  }

  // Funções de API
  async function handleRename() {
    try {
      const res = await fetch(`/api/automacao/${automacao.id}?providerAccountId=${providerAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          newName: renameValue,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao renomear automação")
      }
      setRenameValue("")
      setOpenRename(false)
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/automacao/${automacao.id}/duplicate?providerAccountId=${providerAccountId}`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao duplicar automação")
      }
      setOpenDuplicate(false)
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  async function handleMove() {
    if (!selectedFolderId) return

    // Determina o folderId com base na seleção
    const folderId = selectedFolderId === "root" ? null : selectedFolderId

    try {
      const res = await fetch(`/api/automacao/${automacao.id}?providerAccountId=${providerAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          folderId: folderId,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao mover automação")
      }
      setSelectedFolderId(null)
      setOpenMove(false)
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/automacao/${automacao.id}?providerAccountId=${providerAccountId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao excluir automação")
      }
      setOpenDelete(false)
      fetchData()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <>
      {/* DropdownMenu CONTROLADO */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="p-1">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              handleOpenRename()
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              handleOpenDuplicate()
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              handleOpenMove()
            }}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Mover para
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onSelect={(e) => {
              e.preventDefault()
              handleOpenDelete()
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            Apagar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DIÁLOGOS FORA DO MENU */}

      {/* RENOMEAR */}
      <Dialog open={openRename} onOpenChange={setOpenRename}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renomear automação</DialogTitle>
            <DialogDescription>Informe um novo nome.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nomeAutomacao" className="text-right">
                Novo Nome
              </Label>
              <Input
                id="nomeAutomacao"
                className="col-span-3"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRename(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename}>Renomear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DUPLICAR */}
      <Dialog open={openDuplicate} onOpenChange={setOpenDuplicate}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Duplicar automação</DialogTitle>
            <DialogDescription>Tem certeza?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDuplicate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicate}>Duplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MOVER PARA */}
      <Dialog open={openMove} onOpenChange={setOpenMove}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mover automação</DialogTitle>
            <DialogDescription>Selecione a pasta de destino ou mova para a raiz.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Pasta:</Label>
            <Select onValueChange={(val) => setSelectedFolderId(val)}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Selecione uma pasta ou Raiz" />
              </SelectTrigger>
              <SelectContent>
                {/* Opção para mover para a Raiz */}
                <SelectItem key="root" value="root">
                  Raiz
                </SelectItem>
                {pastas.length > 0 && <DropdownMenuSeparator />}
                {/* Lista de pastas existentes */}
                {pastas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMove(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMove} disabled={!selectedFolderId}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APAGAR */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Apagar automação</DialogTitle>
            <DialogDescription>
              Isso não poderá ser desfeito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
