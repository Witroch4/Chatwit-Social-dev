import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET - Lista todos os usuários do Chatwit
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Construir a cláusula where baseada nos parâmetros
    const where: any = {};
    
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { availableName: { contains: searchTerm, mode: "insensitive" } },
        { accountName: { contains: searchTerm, mode: "insensitive" } },
        { channel: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Buscar os usuários e a contagem total
    const [usuarios, total] = await Promise.all([
      prisma.usuarioChatwit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          // Contar o número de leads por usuário
          _count: {
            select: {
              leads: true,
            },
          },
        },
      }),
      prisma.usuarioChatwit.count({ where }),
    ]);

    // Formatar os dados para a resposta
    const formattedUsuarios = usuarios.map(usuario => ({
      ...usuario,
      leadsCount: usuario._count.leads,
      _count: undefined, // Remove o campo _count
    }));

    return NextResponse.json({
      usuarios: formattedUsuarios,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API Usuarios] Erro ao listar usuários:", error);
    return NextResponse.json(
      { error: "Erro interno ao listar usuários" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove um usuário e todos os seus leads
 */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do usuário é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar todos os leads do usuário
    const leads = await prisma.leadChatwit.findMany({
      where: { usuarioId: id },
      select: { id: true },
    });

    // Remover os arquivos de todos os leads do usuário
    if (leads.length > 0) {
      const leadIds = leads.map(lead => lead.id);
      await prisma.arquivoLeadChatwit.deleteMany({
        where: { leadId: { in: leadIds } },
      });
    }

    // Remover todos os leads do usuário
    await prisma.leadChatwit.deleteMany({
      where: { usuarioId: id },
    });

    // Remover o usuário
    await prisma.usuarioChatwit.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Usuário e todos os seus leads removidos com sucesso",
    });
  } catch (error) {
    console.error("[API Usuarios] Erro ao remover usuário:", error);
    return NextResponse.json(
      { error: "Erro interno ao remover usuário" },
      { status: 500 }
    );
  }
} 