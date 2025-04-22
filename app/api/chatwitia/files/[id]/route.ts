import { NextResponse } from 'next/server';
import { openaiService } from '@/services/openai';
import { auth } from '@/auth';

// GET /api/chatwitia/files/[id] - Get file details
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

    console.log(`API: Recuperando detalhes do arquivo ID: ${fileId}`);
    const response = await openaiService.retrieveFile(fileId);
    
    console.log(`API: Detalhes do arquivo recuperados com sucesso: ${response.filename || 'sem nome'}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API: Erro ao recuperar arquivo:', error);
    
    // Extrair mensagem detalhada
    let errorMessage = 'Erro ao recuperar arquivo';
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

// DELETE /api/chatwitia/files/[id] - Delete a file
export async function DELETE(
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

    console.log(`API: Excluindo arquivo com ID: ${fileId}`);
    const response = await openaiService.deleteFile(fileId);
    
    console.log(`API: Arquivo excluído com sucesso: ${fileId}`);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API: Erro ao excluir arquivo:', error);
    
    // Extrair mensagem detalhada
    let errorMessage = 'Erro ao excluir arquivo';
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