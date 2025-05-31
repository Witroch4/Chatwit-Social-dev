import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: fileId } = await params;
    console.log(`🔗 Buscando URL do storage para: ${fileId}`);

    // Primeiro tentar nos ChatFiles
    let file = await db.chatFile.findFirst({
      where: {
        OR: [
          { id: fileId },
          { openaiFileId: fileId }
        ]
      }
    });

    // Se não encontrou, tentar nas GeneratedImages
    if (!file) {
      const image = await db.generatedImage.findFirst({
        where: {
          OR: [
            { id: fileId },
            { openaiFileId: fileId }
          ]
        }
      });

      if (image) {
        return NextResponse.json({ 
          storageUrl: image.imageUrl,
          thumbnailUrl: image.thumbnailUrl 
        });
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ 
      storageUrl: file.storageUrl,
      thumbnailUrl: file.thumbnail_url 
    });

  } catch (error) {
    console.error('Erro ao buscar URL do storage:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 