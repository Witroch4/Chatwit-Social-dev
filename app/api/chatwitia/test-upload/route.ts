import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Aumentar o tamanho máximo de upload para 30MB
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '30mb',
  },
};

// POST /api/chatwitia/test-upload - Test file upload without OpenAI dependency
export async function POST(req: Request) {
  try {
    // Autenticação opcional com Auth.js v5
    const session = await auth();
    
    console.log('API TEST: Iniciando upload de teste...');
    
    // Extrair dados do formulário
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const purpose = formData.get('purpose') as string;

    if (!file) {
      console.log('API TEST: Erro - Nenhum arquivo fornecido');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!purpose) {
      console.log('API TEST: Aviso - Nenhum propósito especificado');
      // Continue sem purpose, mas log o aviso
    } else {
      console.log(`API TEST: Propósito especificado: ${purpose}`);
    }

    // Verificar tamanho do arquivo - limite de 25MB (mesmo limite do OpenAI)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB em bytes
    if (file.size > MAX_FILE_SIZE) {
      console.log(`API TEST: Erro - Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB (máximo: 25MB)`);
      return NextResponse.json(
        { 
          error: 'File too large', 
          message: `Maximum file size is 25MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
          code: 'file_too_large'
        }, 
        { status: 413 }
      );
    }

    // Logging detalhado
    console.log(`API TEST: Arquivo recebido - Nome: ${file.name}`);
    console.log(`API TEST: Arquivo recebido - Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`API TEST: Arquivo recebido - Tipo: ${file.type}`);
    console.log(`API TEST: Arquivo recebido - Propósito: ${purpose || 'não especificado'}`);
    
    // Simular processamento
    let buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
      const bufferSizeInMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`API TEST: Buffer criado - Tamanho: ${bufferSizeInMB}MB`);
    } catch (bufferError) {
      console.error('API TEST: Erro ao criar buffer do arquivo:', bufferError);
      return NextResponse.json(
        { 
          error: 'Error processing file', 
          message: 'Could not read file data',
          code: 'file_processing_error'
        }, 
        { status: 422 }
      );
    }
    
    // Verificar primeiros bytes para determinar o tipo de arquivo
    const signature = buffer.slice(0, Math.min(16, buffer.length)).toString('hex');
    console.log(`API TEST: Assinatura de arquivo: ${signature}`);
    
    // Verificar tipo de arquivo baseado na assinatura
    let fileType = 'Desconhecido';
    // PDF começa com '%PDF'
    if (signature.startsWith('255044462d')) {
      fileType = 'PDF';
    }
    // JPG começa com FFD8
    else if (signature.startsWith('ffd8')) {
      fileType = 'JPEG';
    }
    // PNG começa com 89504E47
    else if (signature.startsWith('89504e47')) {
      fileType = 'PNG';
    }
    // Texto simples ou JSON (verificação básica)
    else if (isTextFile(buffer)) {
      fileType = 'Text/JSON';
    }
    
    console.log(`API TEST: Tipo de arquivo identificado: ${fileType}`);
    
    // Verificar formatos aceitos (simulando os formatos OpenAI)
    const ACCEPTED_FORMATS = ['PDF', 'JPEG', 'PNG', 'Text/JSON'];
    if (!ACCEPTED_FORMATS.includes(fileType) && fileType !== 'Desconhecido') {
      console.log(`API TEST: Erro - Formato de arquivo não suportado: ${fileType}`);
      return NextResponse.json(
        { 
          error: 'Unsupported file type', 
          message: 'Only PDF, JPEG, PNG, and text files are supported',
          code: 'unsupported_file_type'
        }, 
        { status: 415 }
      );
    }
    
    // Simular atraso de processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Retornar resposta de teste bem-sucedida
    const mockResponse = {
      id: `test_file_${Date.now()}`,
      object: 'file',
      bytes: file.size,
      created_at: Math.floor(Date.now() / 1000),
      filename: file.name,
      purpose: purpose || 'unknown',
      status: 'uploaded',
      statusDetails: {
        receivedSize: file.size,
        bufferSize: buffer.length,
        fileType,
        signature: signature.substring(0, 20) + '...',
        purpose: purpose || 'unknown',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('API TEST: Upload de teste concluído com sucesso');
    
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('API TEST: Erro ao processar upload de teste:', error);
    
    // Logging detalhado do erro
    let errorDetails = 'Erro desconhecido';
    let statusCode = 500;
    let errorCode = 'unknown_error';
    
    if (error instanceof Error) {
      errorDetails = `${error.name}: ${error.message}`;
      console.error(`API TEST: Stack: ${error.stack}`);
      
      // Verificar erros específicos
      if (error.name === 'AbortError') {
        statusCode = 408;
        errorCode = 'request_timeout';
      } else if (error.message.includes('body stream already read')) {
        statusCode = 400;
        errorCode = 'invalid_request';
      }
    } else {
      errorDetails = String(error);
    }
    
    console.error('API TEST: Detalhes do erro:', errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Error processing test upload', 
        message: errorDetails,
        code: errorCode,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// Função auxiliar para verificar se um buffer contém texto
function isTextFile(buffer: Buffer): boolean {
  // Verificar os primeiros 512 bytes
  const sampleSize = Math.min(512, buffer.length);
  const sample = buffer.slice(0, sampleSize);
  
  // Verifica se há algum byte nulo ou caracteres de controle não comuns em texto
  let nullCount = 0;
  let controlCount = 0;
  
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    if (byte === 0) nullCount++;
    // Caracteres de controle exceto tab, newline, carriage return
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) controlCount++;
  }
  
  // Se mais de 5% dos bytes são nulos ou caracteres de controle, não é texto
  const nullPercentage = (nullCount / sample.length) * 100;
  const controlPercentage = (controlCount / sample.length) * 100;
  
  return nullPercentage < 5 && controlPercentage < 5;
} 