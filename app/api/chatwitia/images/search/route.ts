import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('imageUrl');
    const sessionId = searchParams.get('sessionId');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL da imagem é obrigatória' },
        { status: 400 }
      );
    }

    console.log(`🔍 Buscando imagem por URL: ${imageUrl.substring(0, 100)}...`);
    console.log(`📋 SessionId: ${sessionId || 'não fornecido'}`);

    // Buscar imagem no banco de dados
    const whereClause: any = {
      userId: session.user.id,
      imageUrl: imageUrl
    };

    // Se sessionId foi fornecido, incluir na busca
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const image = await db.generatedImage.findFirst({
      where: whereClause,
      select: {
        id: true,
        responseId: true,
        previousResponseId: true,
        prompt: true,
        revisedPrompt: true,
        model: true,
        imageUrl: true,
        thumbnailUrl: true,
        createdAt: true,
        sessionId: true
      },
      orderBy: {
        createdAt: 'desc' // Pegar a mais recente se houver duplicatas
      }
    });

    if (!image) {
      console.log(`❌ Imagem não encontrada no banco de dados`);
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      );
    }

    console.log(`✅ Imagem encontrada: ${image.id}, responseId: ${image.responseId || 'nenhum'}`);

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        responseId: image.responseId,
        previousResponseId: image.previousResponseId,
        prompt: image.prompt,
        revisedPrompt: image.revisedPrompt,
        model: image.model,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        createdAt: image.createdAt,
        sessionId: image.sessionId
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar imagem:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar imagem',
        details: error.message || 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 