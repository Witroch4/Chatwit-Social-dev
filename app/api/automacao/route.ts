// app/api/automacao/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    const automacoes = await prisma.automacao.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(automacoes, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/automacao] Erro:", error);
    return NextResponse.json({ error: "Erro ao buscar automações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    // Extrai os dados enviados na requisição
    const body = await request.json();
    const {
      selectedMediaId,
      anyMediaSelected,
      // Removemos selectedOptionPalavra do payload e iremos definir "anyword" diretamente
      // selectedOptionPalavra,
      palavrasChave,
      fraseBoasVindas,
      quickReplyTexto,
      mensagemEtapa3,
      linkEtapa3,
      legendaBotaoEtapa3,
      responderPublico,
      pedirEmailPro,
      emailPrompt, // Texto para solicitação de email
      // Recursos PRO:
      pedirParaSeguirPro,
      followPrompt,  // Texto pré‑preenchido para pedir para seguir
      contatoSemClique,
      noClickPrompt, // Texto pré‑preenchido para caso não cliquem no link
      publicReply,
      folderId, // Opcional – para associar a uma pasta
      live = true,
      // O front ainda pode enviar selectedOptionPalavra para definir o gatilho:
      selectedOptionPalavra,
    } = body;

    // Calcular o campo "anyword": se a opção de palavra enviada for "qualquer", anyword será true
    const anyword = selectedOptionPalavra === "qualquer";

    // Gera um payload único para o botão
    function generateButtonPayload(): string {
      const randomSuffix = crypto.randomBytes(12).toString("hex");
      return "WIT-EQ:" + randomSuffix;
    }
    const buttonPayload = generateButtonPayload();

    // Cria a automação no BD usando o novo campo "anyword" (e removendo selectedOptionPalavra)
    const automacao = await prisma.automacao.create({
      data: {
        userId: session.user.id,
        selectedMediaId: selectedMediaId || null,
        anyMediaSelected: !!anyMediaSelected,
        anyword, // novo campo que substitui selectedOptionPalavra
        palavrasChave:
          selectedOptionPalavra === "especifica" ? palavrasChave || null : null,
        fraseBoasVindas: fraseBoasVindas || null,
        quickReplyTexto: quickReplyTexto || null,
        mensagemEtapa3: mensagemEtapa3 || null,
        linkEtapa3: linkEtapa3 || null,
        legendaBotaoEtapa3: legendaBotaoEtapa3 || null,
        responderPublico: !!responderPublico,
        pedirEmailPro: !!pedirEmailPro,
        emailPrompt: pedirEmailPro ? emailPrompt || null : null,
        // Recursos PRO:
        pedirParaSeguirPro: !!pedirParaSeguirPro,
        followPrompt: pedirParaSeguirPro ? followPrompt || null : null,
        contatoSemClique: !!contatoSemClique,
        noClickPrompt: contatoSemClique ? noClickPrompt || null : null,
        publicReply: publicReply || null,
        buttonPayload,
        folderId: folderId || null,
        live: live,
      },
    });

    return NextResponse.json(automacao, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/automacao] Erro:", error);
    return NextResponse.json({ error: error.message || "Erro ao salvar automação." }, { status: 500 });
  }
}
