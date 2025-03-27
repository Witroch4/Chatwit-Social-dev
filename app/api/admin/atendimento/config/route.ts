import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Função para obter as configurações ativas do WhatsApp
export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Obter configurações ativas do WhatsApp do banco de dados
    const config = await prisma.whatsAppConfig.findFirst({
      where: {
        userId: session.user.id,
        isActive: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    // Se não houver configuração no banco, usar valores do .env
    if (!config) {
      return NextResponse.json({
        success: true,
        config: {
          fbGraphApiBase: process.env.FB_GRAPH_API_BASE || 'https://graph.facebook.com/v18.0',
          whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ID || '',
          whatsappToken: process.env.WHATSAPP_TOKEN || ''
        },
        isEnvConfig: true
      });
    }
    
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        fbGraphApiBase: config.fbGraphApiBase,
        whatsappBusinessAccountId: config.whatsappBusinessAccountId,
        whatsappToken: config.whatsappToken,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      },
      isEnvConfig: false
    });
  } catch (error) {
    console.error('Erro ao obter configurações do WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro ao obter configurações do WhatsApp', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Função para salvar/atualizar configurações do WhatsApp
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { whatsappToken, whatsappBusinessAccountId, fbGraphApiBase } = await request.json();
    
    // Validação básica
    if (!whatsappToken || !whatsappBusinessAccountId || !fbGraphApiBase) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Desativar configurações anteriores
    await prisma.whatsAppConfig.updateMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      data: {
        isActive: false
      }
    });
    
    // Criar nova configuração
    const newConfig = await prisma.whatsAppConfig.create({
      data: {
        whatsappToken,
        whatsappBusinessAccountId,
        fbGraphApiBase,
        isActive: true,
        userId: session.user.id
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso',
      config: {
        id: newConfig.id,
        fbGraphApiBase: newConfig.fbGraphApiBase,
        whatsappBusinessAccountId: newConfig.whatsappBusinessAccountId,
        createdAt: newConfig.createdAt,
        updatedAt: newConfig.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao salvar configurações do WhatsApp:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configurações do WhatsApp', details: (error as Error).message },
      { status: 500 }
    );
  }
} 