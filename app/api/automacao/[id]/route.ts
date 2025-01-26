//app/api/automacao/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { v4 as uuidv4 } from "uuid"

type PatchAction = "rename" | "duplicate" | "move" | "delete" | "updateAll"

interface PatchBody {
  action: PatchAction
  newName?: string
  folderId?: string
  data?: any // Para o updateAll: { [campo]: valor }
}

// Exemplo de model "Automacao" no Prisma (ilustrativo):
// model Automacao {
//   id                    String   @id @default(uuid())
//   userId                String
//   folderId              String?
//   selectedMediaId       String?
//   anyMediaSelected      Boolean  @default(false)
//   selectedOptionPalavra String   @default("qualquer")
//   palavrasChave         String?
//   fraseBoasVindas       String?
//   quickReplyTexto       String?
//   mensagemEtapa3        String?
//   linkEtapa3            String?
//   legendaBotaoEtapa3    String?
//   responderPublico      Boolean  @default(false)
//   pedirEmailPro         Boolean  @default(false)
//   pedirParaSeguirPro    Boolean  @default(false)
//   contatoSemClique      Boolean  @default(false)
//   publicReply           String?
//   live                  Boolean  @default(true)
//   buttonPayload         String?
//   createdAt             DateTime @default(now())
//   updatedAt             DateTime @updatedAt
// }

// ======================== GET ========================
// Retorna os dados de uma automação pelo ID
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } // Agora 'params' é assíncrono
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    // Aguarda o params antes de usar
    const paramObj = await context.params
    const automacaoId = paramObj.id

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
  context: { params: Promise<{ id: string }> } // Ajuste para assíncrono
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    // Aguardar o params antes de usar
    const paramObj = await context.params
    const automacaoId = paramObj.id

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
            // Ajuste conforme o campo que de fato quer "renomear"
            // Por exemplo, se você tem um campo "title" ou "nomeAutomacao"
            fraseBoasVindas: body.newName,
          },
        })
        return NextResponse.json(renamed, { status: 200 })
      }

      // 2. Duplicar
      case "duplicate": {
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
            publicReply: automacao.publicReply,
            live: automacao.live,
            buttonPayload: `WIT-EQ:${uuidv4()}`,
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

        // Exemplo simples: atualiza só o que vier em data
        // Isso evita sobrescrever com null
        const updatedData: any = {}

        // Copiar as chaves presentes em body.data
        for (const key of Object.keys(body.data)) {
          updatedData[key] = body.data[key]
        }

        // Executa o update parcial
        const updated = await prisma.automacao.update({
          where: { id: automacaoId },
          data: updatedData,
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const paramObj = await context.params
    const automacaoId = paramObj.id

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
