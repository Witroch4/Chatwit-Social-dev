import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { v4 as uuidv4 } from "uuid";

// Forçar o uso do runtime NodeJS (em vez do Edge)
export const runtime = "nodejs";

type PatchAction = "rename" | "duplicate" | "move" | "delete" | "updateAll";

interface PatchBody {
  action: PatchAction;
  newName?: string;
  folderId?: string | null; // Permite null
  data?: any; // Para o updateAll: { [campo]: valor }
}

export async function GET(request: Request, context: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    const { params } = context;
    const { id: automacaoId } = params;

    const automacao = await prisma.automacao.findUnique({
      where: { id: automacaoId },
    });

    if (!automacao || automacao.userId !== session.user.id) {
      return NextResponse.json({ error: "Automação não encontrada ou sem permissão." }, { status: 404 });
    }

    return NextResponse.json(automacao, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/automacao/[id]] Erro:", error);
    return NextResponse.json({ error: "Erro ao buscar automação." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    const { params } = context;
    const { id: automacaoId } = params;
    const body = (await request.json()) as PatchBody;

    // Carrega a automação
    const automacao = await prisma.automacao.findUnique({
      where: { id: automacaoId },
    });
    if (!automacao || automacao.userId !== session.user.id) {
      return NextResponse.json({ error: "Automação não encontrada ou sem permissão." }, { status: 404 });
    }

    // Se for o updateAll, podemos querer atualizar vários campos de uma vez
    if (body.action === "updateAll" && body.data && typeof body.data === "object") {
      // 1) Converter "selectedOptionPalavra" -> "anyword"
      if ("selectedOptionPalavra" in body.data) {
        body.data.anyword = body.data.selectedOptionPalavra === "qualquer";
        if (!body.data.anyword && (!body.data.palavrasChave || body.data.palavrasChave.trim() === "")) {
          return NextResponse.json(
            { error: "Palavras-chave são obrigatórias quando não é selecionado 'qualquer'." },
            { status: 400 }
          );
        }
        delete body.data.selectedOptionPalavra;
      }

      // 2) Se quiser trocar de conta, via "providerAccountId"
      if ("providerAccountId" in body.data && body.data.providerAccountId) {
        const providerAccountId = body.data.providerAccountId as string;

        // Buscar a nova conta do usuário
        const newAccount = await prisma.account.findFirst({
          where: {
            userId: session.user.id,
            provider: "instagram",
            providerAccountId,
          },
        });
        if (!newAccount) {
          return NextResponse.json(
            { error: "Nova conta Instagram não encontrada ou não pertence ao usuário." },
            { status: 404 }
          );
        }

        // No update, passaremos "accountId" = newAccount.id
        body.data.accountId = newAccount.id;

        // Remover o providerAccountId do "data"
        delete body.data.providerAccountId;
      }
    }

    switch (body.action) {
      case "rename": {
        if (!body.newName) {
          return NextResponse.json({ error: "Informe newName para renomear." }, { status: 400 });
        }
        const renamed = await prisma.automacao.update({
          where: { id: automacaoId },
          data: { fraseBoasVindas: body.newName },
        });
        return NextResponse.json(renamed, { status: 200 });
      }

      case "duplicate": {
        const duplicated = await prisma.automacao.create({
          data: {
            userId: automacao.userId,
            accountId: automacao.accountId,
            folderId: automacao.folderId,
            selectedMediaId: automacao.selectedMediaId,
            anyMediaSelected: automacao.anyMediaSelected,
            anyword: automacao.anyword,
            palavrasChave: automacao.palavrasChave,
            fraseBoasVindas: (automacao.fraseBoasVindas || "") + " (Cópia)",
            quickReplyTexto: automacao.quickReplyTexto,
            mensagemEtapa3: automacao.mensagemEtapa3,
            linkEtapa3: automacao.linkEtapa3,
            legendaBotaoEtapa3: automacao.legendaBotaoEtapa3,
            responderPublico: automacao.responderPublico,
            pedirEmailPro: automacao.pedirEmailPro,
            emailPrompt: automacao.emailPrompt,
            pedirParaSeguirPro: automacao.pedirParaSeguirPro,
            followPrompt: automacao.followPrompt,
            contatoSemClique: automacao.contatoSemClique,
            noClickPrompt: automacao.noClickPrompt,
            publicReply: automacao.publicReply,
            live: automacao.live,
            buttonPayload: `WIT-EQ:${uuidv4()}`,
          },
        });
        return NextResponse.json(duplicated, { status: 201 });
      }

      case "move": {
        if (body.folderId === undefined) {
          return NextResponse.json({ error: "Informe folderId para mover a automação." }, { status: 400 });
        }
        const moved = await prisma.automacao.update({
          where: { id: automacaoId },
          data: { folderId: body.folderId },
        });
        return NextResponse.json(moved, { status: 200 });
      }

      case "updateAll": {
        if (!body.data || typeof body.data !== "object") {
          return NextResponse.json(
            { error: "Nenhum campo para atualizar. body.data ausente ou inválido." },
            { status: 400 }
          );
        }

        const updated = await prisma.automacao.update({
          where: { id: automacaoId },
          data: body.data,
        });
        return NextResponse.json(updated, { status: 200 });
      }

      default:
        return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[PATCH /api/automacao/[id]] Erro:", error);
    return NextResponse.json({ error: "Erro ao modificar automação." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    const { params } = context;
    const { id: automacaoId } = params;

    const automacao = await prisma.automacao.findUnique({
      where: { id: automacaoId },
    });
    if (!automacao || automacao.userId !== session.user.id) {
      return NextResponse.json({ error: "Automação não encontrada ou sem permissão." }, { status: 404 });
    }

    await prisma.automacao.delete({ where: { id: automacaoId } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[DELETE /api/automacao/[id]] Erro:", error);
    return NextResponse.json({ error: "Erro ao deletar automação." }, { status: 500 });
  }
}
