import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET para recuperar o token personalizado
export async function GET(request: Request): Promise<Response> {
  try {
    // Extrair parâmetros da URL
    const url = new URL(request.url);
    const leadId = url.searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'leadId obrigatório' }, { status: 400 });
    }

    // Buscar o lead no banco de dados
    const lead = await prisma.leadChatwit.findUnique({
      where: { id: leadId },
      select: { customAccessToken: true }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Retornar o token personalizado
    return NextResponse.json({ customAccessToken: lead.customAccessToken });
  } catch (error: any) {
    console.error('[customToken] Erro ao buscar token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST para salvar o token personalizado
export async function POST(request: Request): Promise<Response> {
  try {
    // Obter o payload
    const payload = await request.json();
    const { leadId, customAccessToken } = payload;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId obrigatório' }, { status: 400 });
    }

    // Verificar se o lead existe
    const lead = await prisma.leadChatwit.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Atualizar o token personalizado
    await prisma.leadChatwit.update({
      where: { id: leadId },
      data: { customAccessToken }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[customToken] Erro ao salvar token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 