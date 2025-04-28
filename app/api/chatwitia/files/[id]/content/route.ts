// app/api/chatwitia/files/[id]/content/route.ts
import { NextResponse } from 'next/server';
import { openaiService } from '@/services/openai';
import { auth } from '@/auth';

// Aumentar o tamanho máximo de resposta para 30MB
export const config = {
  api: {
    responseLimit: '30mb',
  },
};

// GET /api/chatwitia/files/[id]/content - Get file content
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticação opcional com Auth.js v5
    const session = await auth();
    
    const fileId = params.id;
    if (!fileId) {
      return NextResponse.json({ error: 'No file ID provided' }, { status: 400 });
    }

    console.log(`API: Recuperando conteúdo do arquivo ID: ${fileId}`);
    const response = await openaiService.retrieveFileContent(fileId);
    
    console.log(`API: Conteúdo do arquivo recuperado com sucesso`);
    
    // Se for um blob, retornamos como stream para lidar com arquivos grandes
    if (response instanceof Blob) {
      const contentType = response.type || 'application/octet-stream';
      
      // Para imagens, PDFs e outros arquivos binários
      const arrayBuffer = await response.arrayBuffer();
      const headers = {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="file-${fileId}${getExtensionByMime(contentType)}"`,
      };
      
      return new NextResponse(arrayBuffer, { headers });
    }
    
    // Para conteúdo JSON ou outro formato de texto
    return NextResponse.json(response);
  } catch (error) {
    console.error('API: Erro ao recuperar conteúdo do arquivo:', error);
    
    // Extrair mensagem detalhada
    let errorMessage = 'Erro ao recuperar conteúdo do arquivo';
    let details = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      details = error.stack || '';
      
      // Verificar se é erro de arquivo não encontrado
      if (errorMessage.includes('No such file') || errorMessage.includes('404')) {
        return NextResponse.json(
          { error: 'Arquivo não encontrado', details },
          { status: 404 }
        );
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      details = JSON.stringify(error);
    }
    
    return NextResponse.json(
      { error: errorMessage, details },
      { status: 500 }
    );
  }
}

// Função auxiliar para obter extensão de arquivo com base no MIME type
function getExtensionByMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'text/csv': '.csv',
    'text/plain': '.txt',
    'application/json': '.json',
  };
  
  return mimeMap[mimeType] || '';
} 