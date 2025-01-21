import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

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

      // <-- Novo campo
      publicReply,
    } = await request.json();

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

        // Salvando a string do JSON com as 3 frases
        publicReply: publicReply || null,
      },
    });

    return NextResponse.json(automacao, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/automacao] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao salvar automação." },
      { status: 500 }
    );
  }
}
