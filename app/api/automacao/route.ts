import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { v4 as uuidv4 } from "uuid";

// Opcional: caso esteja usando APIs do Node (ex.: bcrypt), forçar runtime nodejs:
// export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    // Pegamos o providerAccountId via query string
    const { searchParams } = new URL(req.url);
    const providerAccountId = searchParams.get("providerAccountId");

    // Precisamos montar um 'where' que garanta userId
    // e, se houver providerAccountId, filtrar pela 'Account' local
    let whereClause: any = {
      userId: session.user.id,
    };

    if (providerAccountId) {
      // 1) Buscar a conta para esse providerAccountId + userId
      const account = await prisma.account.findFirst({
        where: {
          providerAccountId: providerAccountId,
          userId: session.user.id,
          provider: "instagram",
        },
        select: {
          id: true,
          providerAccountId: true,
        },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Conta não encontrada ou não pertence ao usuário." },
          { status: 404 }
        );
      }

      // 2) Agora filtramos as automacoes por 'accountId' = account.id
      whereClause.accountId = account.id;
    }

    // Buscar automacoes com esses filtros
    const automacoes = await prisma.automacao.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        account: {
          select: {
            providerAccountId: true, // se quiser expor no JSON
          },
        },
      },
    });

    // Se você quer retornar o providerAccountId junto no JSON principal:
    const automacoesMapeadas = automacoes.map((automacao) => ({
      ...automacao,
      providerAccountId: automacao.account?.providerAccountId || null,
    }));

    return NextResponse.json(automacoesMapeadas, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/automacao] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar automações." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    // 1) Extrair providerAccountId da query string
    const searchParams = new URL(request.url).searchParams;
    const providerAccountId = searchParams.get("providerAccountId");

    if (!providerAccountId) {
      return NextResponse.json(
        { error: "ID da conta (providerAccountId) não fornecido." },
        { status: 400 }
      );
    }

    // 2) Buscar no banco a 'Account' cujo ID interno será usado
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "instagram",
        providerAccountId: providerAccountId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada ou não pertence ao usuário." },
        { status: 404 }
      );
    }

    // 3) Ler o body e fazer validações
    const body = await request.json();
    const anyword = Boolean(body.anyword);
    if (!anyword && (!body.palavrasChave || body.palavrasChave.trim() === "")) {
      return NextResponse.json(
        { error: "Palavras-chave são obrigatórias quando não é selecionado 'qualquer'." },
        { status: 400 }
      );
    }

    // 4) Criar a automação, passando 'account.id' como 'accountId'
    const automacao = await prisma.automacao.create({
      data: {
        userId: session.user.id,

        // Aqui vem a chave primária de 'Account', não o providerAccountId
        accountId: account.id,

        selectedMediaId: body.selectedMediaId || null,
        anyMediaSelected: Boolean(body.anyMediaSelected),
        anyword: anyword,
        palavrasChave: anyword ? null : body.palavrasChave,
        fraseBoasVindas: body.fraseBoasVindas || null,
        quickReplyTexto: body.quickReplyTexto || null,
        mensagemEtapa3: body.mensagemEtapa3 || null,
        linkEtapa3: body.linkEtapa3 || null,
        legendaBotaoEtapa3: body.legendaBotaoEtapa3 || null,
        responderPublico: Boolean(body.responderPublico),
        pedirEmailPro: Boolean(body.pedirEmailPro),
        emailPrompt: body.emailPrompt || null,
        pedirParaSeguirPro: Boolean(body.pedirParaSeguirPro),
        followPrompt: body.followPrompt || null,
        contatoSemClique: Boolean(body.contatoSemClique),
        noClickPrompt: body.noClickPrompt || null,
        publicReply: body.publicReply || null,
        live: Boolean(body.live),
        buttonPayload: `WIT-EQ:${uuidv4()}`,
      },
    });

    return NextResponse.json(automacao, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/automacao] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao criar automação: " + error.message },
      { status: 500 }
    );
  }
}
