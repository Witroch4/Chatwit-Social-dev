// app/api/automacao/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Caminho correto
import { auth } from "@/auth";         // Caminho correto

export async function POST(request: Request) {
  try {
    // 1) Obter sessão do usuário
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    // 2) Ler o corpo
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
    } = await request.json();

    // 3) Criar registro
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
      },
    });

    // 4) Responder com sucesso
    return NextResponse.json(automacao, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/automacao] Erro:", error);
    return NextResponse.json({ error: error.message || "Erro ao salvar automação." }, { status: 500 });
  }
}
