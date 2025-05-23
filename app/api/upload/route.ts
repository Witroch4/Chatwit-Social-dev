// app/api/upload/route.ts

import { NextResponse } from 'next/server';
import { uploadToMinIO, correctMinioUrl } from '@/lib/minio';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import type { UploadPurpose } from '@/app/components/ChatInputForm';
import { randomUUID } from 'crypto';

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
    const purpose = (formData.get('purpose') as UploadPurpose) || 'user_data';
    const sessionId = formData.get('sessionId') as string || null;
    console.log(`#########ERA PRA SER SESSAO ID: ${sessionId}`);

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
    
    // Verificar se é PDF pela extensão ou mimetype
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    
    // Ajustar o purpose para PDFs se necessário
    const finalPurpose = isPdf && purpose === 'vision' ? 'user_data' : purpose;

    console.log(`[Upload] Processando arquivo: ${fileName}, tipo: ${mimeType}, purpose: ${finalPurpose}`);

    // Upload do arquivo original para o MinIO com thumbnail automática
    const uploadResult = await uploadToMinIO(buffer, fileName, mimeType, true);

    console.log(`[Upload] Arquivo enviado: ${uploadResult.url}`);
    
    if (uploadResult.thumbnail_url) {
      console.log(`[Upload] Thumbnail gerada e enviada: ${uploadResult.thumbnail_url}`);
    }

    // Gerar ID único para o arquivo
    const fileId = randomUUID().substring(0, 8);
    
    // Tentar criar o registro no ChatFile
    let dbFileId = null;
    try {
      if (sessionId) {
        console.log(`[Upload] Salvando arquivo no banco com sessionId=${sessionId}`);
        
        // Criar entrada no banco de dados com os nomes corretos de campos
        const chatFile = await db.chatFile.create({
          data: {
            id: fileId,
            sessionId: sessionId,
            filename: fileName,
            fileType: mimeType,
            purpose: finalPurpose,
            storageUrl: uploadResult.url,
            thumbnail_url: uploadResult.thumbnail_url,
            status: 'stored',
          }
        });
        
        dbFileId = chatFile.id;
        console.log(`[Upload] Arquivo salvo no banco: ${dbFileId}`);
      } else {
        console.log('[Upload] Nenhum sessionId fornecido, ignorando salvamento no banco');
      }
    } catch (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
      // Continuar mesmo com erro no banco - pelo menos temos o arquivo no MinIO
    }

    return NextResponse.json(
      {
        id: dbFileId || fileId,
        fileName,
        url: uploadResult.url,
        mime_type: uploadResult.mime_type,
        is_image: mimeType.startsWith('image/'),
        fileType: mimeType,
        purpose: finalPurpose,
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
