import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// API endpoint para verificar o status de um lead específico
// Isso é utilizado para verificar se o manuscrito foi processado
export async function GET(req: NextRequest) {
  try {
    // Verifica autenticação do usuário
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verifica se usuário é admin
    if (!user.roles || !user.roles.includes("admin")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Obtém o ID do lead da query string
    const url = new URL(req.url);
    const leadId = url.searchParams.get("id");

    if (!leadId) {
      return NextResponse.json({ error: "ID do lead não fornecido" }, { status: 400 });
    }

    // Busca o lead no banco de dados
    const lead = await db.leadChatwit.findUnique({
      where: {
        id: leadId,
      },
      select: {
        id: true,
        aguardandoManuscrito: true,
        manuscritoProcessado: true,
        provaManuscrita: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    // Retorna os dados do lead
    return NextResponse.json(lead);
  } catch (error) {
    console.error("Erro ao verificar status do lead:", error);
    return NextResponse.json(
      { error: "Erro ao verificar status do lead" },
      { status: 500 }
    );
  }
} 