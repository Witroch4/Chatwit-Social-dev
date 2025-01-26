// app/api/automacao/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import crypto from "crypto"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const automacoes = await prisma.automacao.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(automacoes, { status: 200 })
  } catch (error: any) {
    console.error("[GET /api/automacao] Erro:", error)
    return NextResponse.json({ error: "Erro ao buscar automações." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
    }

    const body = await request.json()
    const {
      selectedMediaId,
      anyMediaSelected,
      selectedOptionPalavra,
      palavrasChave,
      fraseBoasVindas,
      quickReplyTexto,
      mensagemEtapa3,
      linkEtapa3,
      legendaBotaoEtapa3,
      responderPublico,
      pedirEmailPro,
      pedirParaSeguirPro,
      contatoSemClique,
      publicReply,
      folderId, // Caso queira criar diretamente em uma pasta
    } = body

    // Gera um payload único
    function generateButtonPayload(): string {
      const randomSuffix = crypto.randomBytes(12).toString("hex")
      return "WIT-EQ:" + randomSuffix
    }
    const buttonPayload = generateButtonPayload()

    const automacao = await prisma.automacao.create({
      data: {
        userId: session.user.id,
        selectedMediaId: selectedMediaId || null,
        anyMediaSelected: !!anyMediaSelected,
        selectedOptionPalavra: selectedOptionPalavra || "qualquer",
        palavrasChave: palavrasChave || null,
        fraseBoasVindas: fraseBoasVindas || null,
        quickReplyTexto: quickReplyTexto || null,
        mensagemEtapa3: mensagemEtapa3 || null,
        linkEtapa3: linkEtapa3 || null,
        legendaBotaoEtapa3: legendaBotaoEtapa3 || null,
        responderPublico: !!responderPublico,
        pedirEmailPro: !!pedirEmailPro,
        pedirParaSeguirPro: !!pedirParaSeguirPro,
        contatoSemClique: !!contatoSemClique,
        publicReply: publicReply || null,
        buttonPayload,
        folderId: folderId || null,
      },
    })

    return NextResponse.json(automacao, { status: 201 })
  } catch (error: any) {
    console.error("[POST /api/automacao] Erro:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao salvar automação." },
      { status: 500 }
    )
  }
}
