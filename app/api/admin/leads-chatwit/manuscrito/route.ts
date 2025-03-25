import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const { leadId, texto } = await request.json();

    if (!leadId || !texto) {
      return NextResponse.json(
        { error: "Lead ID e texto são obrigatórios" },
        { status: 400 }
      );
    }

    const lead = await prisma.leadChatwit.update({
      where: { id: leadId },
      data: {
        provaManuscrita: texto,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Manuscrito atualizado com sucesso",
      lead,
    });
  } catch (error: any) {
    console.error("[API] Erro ao atualizar manuscrito:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao atualizar manuscrito" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const leadId = url.searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID é obrigatório" },
        { status: 400 }
      );
    }

    const lead = await prisma.leadChatwit.update({
      where: { id: leadId },
      data: {
        provaManuscrita: null,
        manuscritoProcessado: false
      },
    });

    return NextResponse.json({
      success: true,
      message: "Manuscrito excluído com sucesso",
      lead,
    });
  } catch (error: any) {
    console.error("[API] Erro ao excluir manuscrito:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao excluir manuscrito" },
      { status: 500 }
    );
  }
} 