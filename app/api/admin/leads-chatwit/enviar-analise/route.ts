import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handler da rota POST para enviar lead para análise de prova.
 */
export async function POST(req: Request) {
  try {
    console.log("[Enviar Análise] Recebendo requisição POST");
    const body = await req.json();
    console.log("[Enviar Análise] Dados recebidos:", body);

    const { leadId, sourceId } = body;

    if (!leadId) {
      console.error("[Enviar Análise] leadId não fornecido");
      return NextResponse.json(
        { error: "leadId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar dados do lead no banco
    const lead = await prisma.leadChatwit.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        arquivos: true,
        pdfUnificado: true,
        leadUrl: true,
        sourceId: true,
        concluido: true,
        fezRecurso: true
      }
    });

    if (!lead) {
      console.error("[Enviar Análise] Lead não encontrado:", leadId);
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    // Preparar payload para o sistema externo
    const payload = {
      leadID: lead.id,
      nome: lead.name || "Lead sem nome",
      telefone: lead.phoneNumber,
      arquivos: lead.arquivos?.map((a: any) => ({
        id: a.id,
        url: a.dataUrl,
        tipo: a.fileType,
        nome: a.fileType
      })) || [],
      arquivos_pdf: lead.pdfUnificado ? [{
        id: lead.id,
        url: lead.pdfUnificado,
        nome: "PDF Unificado"
      }] : [],
      metadata: {
        leadUrl: lead.leadUrl,
        sourceId: lead.sourceId || sourceId,
        concluido: lead.concluido,
        fezRecurso: lead.fezRecurso
      }
    };

    // Enviar para o sistema externo
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error("URL da API não configurada no ambiente");
    }

    const response = await fetch(`${apiUrl}/api/leads/analise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao enviar análise");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Enviar Análise] Erro ao enviar solicitação:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
