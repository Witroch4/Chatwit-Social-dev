// app/api/automacao/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { v4 as uuidv4 } from "uuid"

type PatchAction = "rename" | "duplicate" | "move" | "delete" | "updateAll"

interface PatchBody {
  action: PatchAction
  newName?: string
  folderId?: string
  data?: any  // Para o updateAll: { [campo]: valor }
}

// ======================== GET ========================
// Retorna os dados de uma automação pelo ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const automacaoId = params.id
    const automacao = await prisma.automacao.findUnique({
      where: { id: automacaoId },
    })

    if (!automacao || automacao.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Automação não encontrada ou sem permissão." },
        { status: 404 }
      )
    }

    return NextResponse.json(automacao, { status: 200 })
  } catch (error: any) {
    console.error("[GET /api/automacao/[id]] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar automação." },
      { status: 500 }
    )
  }
}

// ======================== PATCH ========================
// Executa diversas ações em uma automação: rename, duplicate, move, updateAll
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const automacaoId = params.id
    const body = (await request.json()) as PatchBody

    // Carrega automação
    const automacao = await prisma.automacao.findUnique({
      where: { id: automacaoId },
    })
    if (!automacao || automacao.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Automação não encontrada ou sem permissão." },
        { status: 404 }
      )
    }

    switch (body.action) {
      // 1. Renomear
      case "rename": {
        if (!body.newName) {
          return NextResponse.json(
            { error: "Informe newName para renomear." },
            { status: 400 }
          )
        }
        const renamed = await prisma.automacao.update({
          where: { id: automacaoId },
          data: {
            // Se quiser um campo "title", use-o aqui.
            // Por enquanto, usamos "fraseBoasVindas" para ilustrar.
            fraseBoasVindas: body.newName,
          },
        })
        return NextResponse.json(renamed, { status: 200 })
      }

      // 2. Duplicar
      case "duplicate": {
        // Duplique a automação
        const duplicated = await prisma.automacao.create({
          data: {
            userId: automacao.userId,
            folderId: automacao.folderId,
            selectedMediaId: automacao.selectedMediaId,
            anyMediaSelected: automacao.anyMediaSelected,
            selectedOptionPalavra: automacao.selectedOptionPalavra,
            palavrasChave: automacao.palavrasChave,
            fraseBoasVindas: (automacao.fraseBoasVindas || "") + " (Cópia)",
            quickReplyTexto: automacao.quickReplyTexto,
            mensagemEtapa3: automacao.mensagemEtapa3,
            linkEtapa3: automacao.linkEtapa3,
            legendaBotaoEtapa3: automacao.legendaBotaoEtapa3,
            responderPublico: automacao.responderPublico,
            pedirEmailPro: automacao.pedirEmailPro,
            pedirParaSeguirPro: automacao.pedirParaSeguirPro,
            contatoSemClique: automacao.contatoSemClique,
            buttonPayload: `WIT-EQ:${uuidv4()}`, // gera outro payload único
            publicReply: automacao.publicReply,
          },
        })
        return NextResponse.json(duplicated, { status: 201 })
      }

      // 3. Mover Pasta
      case "move": {
        if (!body.folderId) {
          return NextResponse.json(
            { error: "Informe folderId para mover a automação." },
            { status: 400 }
          )
        }
        const moved = await prisma.automacao.update({
          where: { id: automacaoId },
          data: {
            folderId: body.folderId,
          },
        })
        return NextResponse.json(moved, { status: 200 })
      }

      // 4. Atualizar Todos os Campos (updateAll)
      case "updateAll": {
        // body.data deve conter todos os campos que deseja atualizar
        if (!body.data || typeof body.data !== "object") {
          return NextResponse.json(
            { error: "Nenhum campo para atualizar. body.data ausente ou inválido." },
            { status: 400 }
          )
        }

        // Adapte se quiser filtrar campos específicos
        const updated = await prisma.automacao.update({
          where: { id: automacaoId },
          data: {
            selectedMediaId: body.data.selectedMediaId || null,
            anyMediaSelected: !!body.data.anyMediaSelected,
            selectedOptionPalavra:
              body.data.selectedOptionPalavra || automacao.selectedOptionPalavra,
            palavrasChave: body.data.palavrasChave || null,

            fraseBoasVindas: body.data.fraseBoasVindas || null,
            quickReplyTexto: body.data.quickReplyTexto || null,

            mensagemEtapa3: body.data.mensagemEtapa3 || null,
            linkEtapa3: body.data.linkEtapa3 || null,
            legendaBotaoEtapa3: body.data.legendaBotaoEtapa3 || null,

            responderPublico: !!body.data.responderPublico,
            pedirEmailPro: !!body.data.pedirEmailPro,
            pedirParaSeguirPro: !!body.data.pedirParaSeguirPro,
            contatoSemClique: !!body.data.contatoSemClique,

            publicReply: body.data.publicReply || null,
          },
        })

        return NextResponse.json(updated, { status: 200 })
      }

      default:
        return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[PATCH /api/automacao/[id]] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao modificar automação." },
      { status: 500 }
    )
  }
}

// ======================== DELETE ========================
// Remove a automação
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const automacaoId = params.id

    // Verifica se pertence ao usuário
    const automacao = await prisma.automacao.findUnique({
      where: { id: automacaoId },
    })
    if (!automacao || automacao.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Automação não encontrada ou sem permissão." },
        { status: 404 }
      )
    }

    await prisma.automacao.delete({ where: { id: automacaoId } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[DELETE /api/automacao/[id]] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao deletar automação." },
      { status: 500 }
    )
  }
}
