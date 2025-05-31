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

    // 🔧 NOVA LÓGICA: Extrair diferentes identificadores da URL
    let openaiFileId = null;
    let filename = null;
    
    // Se a URL contém file-XXX, extrair o openaiFileId
    const fileIdMatch = imageUrl.match(/file-([A-Za-z0-9]+)/);
    if (fileIdMatch) {
      openaiFileId = fileIdMatch[0]; // file-XXX completo
      console.log(`🔍 OpenAI File ID extraído: ${openaiFileId}`);
    }
    
    // Extrair filename se estiver na URL
    const filenameMatch = imageUrl.match(/([^\/]+\.(png|jpg|jpeg|gif|webp))(?:\?|$)/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
      console.log(`🔍 Filename extraído: ${filename}`);
    }

    // 🔧 BUSCA MÚLTIPLA: Criar condições OR para buscar por diferentes critérios
    const searchConditions = [];
    
    // 1. Busca pela URL exata
    searchConditions.push({ imageUrl: imageUrl });
    
    // 2. Se temos openaiFileId, buscar por ele
    if (openaiFileId) {
      searchConditions.push({ openaiFileId: openaiFileId });
    }
    
    // 3. Se temos filename, buscar por URLs que contenham o filename
    if (filename) {
      searchConditions.push({ 
        imageUrl: {
          contains: filename
        }
      });
    }

    // Buscar imagem no banco de dados com múltiplos critérios
    const baseWhere: any = {
      userId: session.user.id,
      OR: searchConditions
    };

    // Se sessionId foi fornecido, incluir na busca
    if (sessionId) {
      baseWhere.sessionId = sessionId;
    }

    console.log(`🔍 Buscando com ${searchConditions.length} critérios:`, {
      originalUrl: imageUrl,
      openaiFileId,
      filename,
      sessionId: sessionId || 'qualquer'
    });

    const image = await db.generatedImage.findFirst({
      where: baseWhere,
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
        sessionId: true,
        openaiFileId: true
      },
      orderBy: {
        createdAt: 'desc' // Pegar a mais recente se houver duplicatas
      }
    });

    if (!image) {
      console.log(`❌ Imagem não encontrada no banco de dados com nenhum dos critérios`);
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      );
    }

    console.log(`✅ Imagem encontrada: ${image.id}, responseId: ${image.responseId || 'nenhum'}, openaiFileId: ${image.openaiFileId || 'nenhum'}`);

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
        sessionId: image.sessionId,
        openaiFileId: image.openaiFileId
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