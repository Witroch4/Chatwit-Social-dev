import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET - Retorna estatísticas dos leads do Chatwit
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Contar todos os leads
    const totalLeads = await prisma.leadChatwit.count();

    // Contar todos os usuários com leads
    const totalUsuarios = await prisma.usuarioChatwit.count();
    
    // Contar todos os arquivos
    const totalArquivos = await prisma.arquivoLeadChatwit.count();
    
    // Contar leads pendentes (não concluídos)
    const pendentes = await prisma.leadChatwit.count({
      where: { concluido: false }
    });

    // Estatísticas mensais para gráficos
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimosDoisMeses = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      return { 
        mes: date.toLocaleDateString('pt-BR', { month: 'long' }),
        ano: date.getFullYear(),
        mesNumero: date.getMonth() + 1,
        primeiroDia: new Date(date.getFullYear(), date.getMonth(), 1),
        ultimoDia: new Date(date.getFullYear(), date.getMonth() + 1, 0)
      };
    });

    // Dados para gráfico de leads por mês
    const dadosLeadsPorMes = await Promise.all(
      ultimosDoisMeses.map(async (mesInfo) => {
        const leadsCount = await prisma.leadChatwit.count({
          where: {
            createdAt: {
              gte: mesInfo.primeiroDia,
              lte: mesInfo.ultimoDia
            }
          }
        });
        
        const leadsConcluidos = await prisma.leadChatwit.count({
          where: {
            createdAt: {
              gte: mesInfo.primeiroDia,
              lte: mesInfo.ultimoDia
            },
            concluido: true
          }
        });

        return {
          month: mesInfo.mes,
          leadsTotal: leadsCount,
          leadsConcluidos: leadsConcluidos
        };
      })
    );

    // Dados para gráfico de leads por canal
    // Abordagem corrigida: Buscar leads com informações de usuário e agrupar manualmente
    const leadsComUsuarios = await prisma.leadChatwit.findMany({
      include: {
        usuario: {
          select: {
            channel: true
          }
        }
      }
    });

    // Agrupamento manual por canal
    const canalAgrupamento: Record<string, number> = {};
    leadsComUsuarios.forEach(lead => {
      const canal = lead.usuario?.channel || 'Desconhecido';
      canalAgrupamento[canal] = (canalAgrupamento[canal] || 0) + 1;
    });

    // Converter para o formato esperado pelo gráfico
    const leadsPorCanal = Object.entries(canalAgrupamento).map(([channel, leads]) => ({
      channel,
      leads
    })).sort((a, b) => b.leads - a.leads); // Ordenar do maior para o menor

    // Retornar todos os dados
    return NextResponse.json({
      stats: {
        totalLeads,
        totalUsuarios,
        totalArquivos,
        pendentes
      },
      charts: {
        leadsPorMes: dadosLeadsPorMes.reverse(),
        leadsPorCanal
      }
    });
  } catch (error) {
    console.error("[API Stats] Erro ao buscar estatísticas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar estatísticas" },
      { status: 500 }
    );
  }
} 