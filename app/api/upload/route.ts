// app/api/upload/route.ts

import { NextResponse } from 'next/server';
import { uploadToMinIO } from '@/lib/minio';
import sharp from 'sharp';

// Função para corrigir a URL do MinIO
function correctMinioUrl(url: string): string {
  // Substitui objstore.witdev.com.br por objstoreapi.witdev.com.br
  return url.replace('objstore.witdev.com.br', 'objstoreapi.witdev.com.br');
}

export async function POST(request: Request) {
  try {
    // Extrair o FormData da request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('Nenhum arquivo enviado');
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Converter o arquivo para um buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const mimeType = file.type;

    console.log(`[Upload] Processando arquivo: ${fileName}, tipo: ${mimeType}`);

    // Verifica se é uma imagem para gerar thumbnail
    let thumbnailResult = null;

    if (mimeType.startsWith('image/')) {
      try {
        // Gera thumbnail com 50px de largura (deixar sempre em 50 nao mexer)
        const thumbnailBuffer = await sharp(buffer)
          .resize(50, null, { fit: 'inside' })
          .toBuffer();

        // Nome do arquivo thumbnail
        const thumbnailName = `thumb_${fileName}`;

        // Upload da thumbnail para o MinIO
        thumbnailResult = await uploadToMinIO(
          thumbnailBuffer,
          thumbnailName,
          mimeType
        );

        // Corrige a URL da thumbnail
        const correctedThumbnailUrl = correctMinioUrl(thumbnailResult.url);
        console.log(`[Upload] Thumbnail gerada e enviada: ${correctedThumbnailUrl}`);
      } catch (thumbError) {
        console.error('Erro ao gerar thumbnail:', thumbError);
        // Continua com o upload da imagem original mesmo se falhar a thumbnail
      }
    }

    // Upload do arquivo original para o MinIO
    const uploadResult = await uploadToMinIO(buffer, fileName, mimeType);

    // Corrige a URL do arquivo original
    const correctedUrl = correctMinioUrl(uploadResult.url);
    console.log(`[Upload] Arquivo enviado: ${correctedUrl}`);

    return NextResponse.json(
      {
        fileName,
        url: correctedUrl,
        mime_type: uploadResult.mime_type,
        is_image: mimeType.startsWith('image/'),
        thumbnail_url: thumbnailResult ? correctMinioUrl(thumbnailResult.url) : null,
        size: buffer.length,
        uploaded_at: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao fazer upload:', error.message);
    return NextResponse.json(
      {
        message: 'Erro ao fazer upload do arquivo.',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
