// app/api/upload/route.ts

import { NextResponse } from 'next/server';
import { uploadToMinIO, correctMinioUrl } from '@/lib/minio';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
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

    // Upload do arquivo original para o MinIO com thumbnail automática
    // A função uploadToMinIO vai gerar a thumbnail internamente
    const uploadResult = await uploadToMinIO(buffer, fileName, mimeType, true);

    // As URLs já estão corretas, pois a função uploadToMinIO agora garante que todas as URLs 
    // tenham o protocolo HTTPS e usem o endpoint correto.
    console.log(`[Upload] Arquivo enviado: ${uploadResult.url}`);
    
    if (uploadResult.thumbnail_url) {
      console.log(`[Upload] Thumbnail gerada e enviada: ${uploadResult.thumbnail_url}`);
    }

    return NextResponse.json(
      {
        fileName,
        url: uploadResult.url,
        mime_type: uploadResult.mime_type,
        is_image: mimeType.startsWith('image/'),
        thumbnail_url: uploadResult.thumbnail_url,
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

/**
 * API não permite GET
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Método não permitido' },
    { status: 405 }
  );
}
