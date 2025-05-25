import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { uploadToMinIO } from '@/lib/minio';

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { 
      imageData, // Base64 string
      prompt,
      revisedPrompt,
      sessionId,
      model = 'gpt-image-1'
    } = await req.json();

    if (!imageData || !prompt) {
      return NextResponse.json(
        { error: 'Dados da imagem obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`Salvando imagem gerada: "${prompt.substring(0, 50)}..."`);

    // Converter base64 para buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Upload para MinIO
    const uploadResult = await uploadToMinIO(
      imageBuffer,
      `generated-image-${Date.now()}.png`,
      'image/png',
      true // Gerar thumbnail
    );

    console.log(`Imagem enviada para MinIO: ${uploadResult.url}`);

    // Salvar no banco de dados
    const savedImage = await db.generatedImage.create({
      data: {
        userId: session.user.id,
        sessionId: sessionId || null,
        prompt: prompt,
        revisedPrompt: revisedPrompt || null,
        model: model,
        imageUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnail_url || null,
        mimeType: uploadResult.mime_type,
        createdAt: new Date()
      }
    });

    console.log(`Imagem salva no banco de dados: ${savedImage.id}`);

    return NextResponse.json({
      success: true,
      image: {
        id: savedImage.id,
        imageUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnail_url,
        prompt: savedImage.prompt,
        revisedPrompt: savedImage.revisedPrompt,
        createdAt: savedImage.createdAt
      }
    });
  } catch (error: any) {
    console.error('Erro ao salvar imagem gerada:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao salvar imagem',
        details: error.message || 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

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
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Buscar imagens do usuário
    const whereClause: any = {
      userId: session.user.id
    };

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const images = await db.generatedImage.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        prompt: true,
        revisedPrompt: true,
        model: true,
        imageUrl: true,
        thumbnailUrl: true,
        createdAt: true,
        sessionId: true
      }
    });

    const total = await db.generatedImage.count({
      where: whereClause
    });

    return NextResponse.json({
      success: true,
      images,
      total,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Erro ao buscar imagens geradas:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar imagens',
        details: error.message || 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 