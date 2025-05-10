import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET - Lista todos os leads ou filtra por parâmetros
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const usuarioId = url.searchParams.get("usuarioId");
    const searchTerm = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Construir a cláusula where baseada nos parâmetros
    const where: any = {};
    
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }
    
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { nomeReal: { contains: searchTerm, mode: "insensitive" } },
        { phoneNumber: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Buscar os leads e a contagem total
    const [leads, total] = await Promise.all([
      prisma.leadChatwit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          usuario: true,
          arquivos: {
            select: {
              id: true,
              fileType: true,
              dataUrl: true,
              pdfConvertido: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.leadChatwit.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API Leads] Erro ao listar leads:", error);
    return NextResponse.json(
      { error: "Erro interno ao listar leads" },
      { status: 500 }
    );
  }
}

/**
 * POST - Atualiza os dados de um lead
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { id, nomeReal, email, anotacoes, concluido, fezRecurso, datasRecurso, textoDOEspelho, espelhoCorrecao } = await request.json();
    
    // Valide os dados recebidos
    if (!id) {
      return NextResponse.json(
        { error: "ID do lead é obrigatório" },
        { status: 400 }
      );
    }

    // Atualize o lead
    const lead = await prisma.leadChatwit.update({
      where: { id },
      data: {
        ...(nomeReal !== undefined && { nomeReal }),
        ...(email !== undefined && { email }),
        ...(anotacoes !== undefined && { anotacoes }),
        ...(concluido !== undefined && { concluido }),
        ...(fezRecurso !== undefined && { fezRecurso }),
        ...(datasRecurso !== undefined && { datasRecurso }),
        ...(textoDOEspelho !== undefined && { textoDOEspelho }),
        ...(espelhoCorrecao !== undefined && { espelhoCorrecao }),
      },
    });

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error("[API Leads] Erro ao atualizar lead:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar lead" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove um lead e todos os seus arquivos
 */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do lead é obrigatório" },
        { status: 400 }
      );
    }

    // Remova os arquivos do lead
    await prisma.arquivoLeadChatwit.deleteMany({
      where: { leadId: id },
    });

    // Remova o lead
    await prisma.leadChatwit.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Lead removido com sucesso",
    });
  } catch (error) {
    console.error("[API Leads] Erro ao remover lead:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover lead" },
      { status: 500 }
    );
  }
} 