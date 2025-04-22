// app/api/chatwitia/files/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { openaiService } from '@/services/openai';
import { auth } from '@/auth';
import { uploadFileWithAssistants } from '@/services/assistantsFileHandler';
import type { FilePurpose } from '@/services/openai';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/* =========================================================================
   POST /api/chatwitia/files
   =========================================================================*/
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const ct = req.headers.get('content-type') || '';
    
    /* -------------------- JSON → extração -------------------- */
    if (ct.includes('application/json')) {
      const { fileId, prompt = 'Extract the content from the PDF.' } = await req.json();
      if (!fileId) return NextResponse.json({ error: 'fileId missing' }, { status: 400 });
      const text = await openaiService.extractPdfWithAssistant(fileId, prompt);
      return NextResponse.json({ text, fileId });
    }

    /* ---------------- multipart upload ----------------------- */
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let purpose = (formData.get('purpose') as FilePurpose) || 'vision';
    const extract = formData.get('extract') === 'true';
    const prompt = (formData.get('prompt') as string) || 'Extract the content from the PDF.';
    const sessionId = formData.get('sessionId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const isPdf = file.type === 'application/pdf';
    if (purpose === 'vision' && isPdf) {
      // "vision" ainda não aceita PDF → segue docs e troca para user_data
      purpose = 'user_data';
    }

    if (isPdf && purpose === 'user_data' && file.size > 32 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF too large (32 MB max).' }, { status: 413 });
    }

    // Verificar se o arquivo já existe antes de fazer o upload
    // Hash do arquivo para identificação única (simples baseado no nome e tamanho)
    const fileIdentifier = `${file.name}-${file.size}`;
    
    // Tentar localizar na base de dados
    let existingFile = null;
    if (sessionId) {
      try {
        existingFile = await db.chatFile.findFirst({
          where: {
            sessionId: sessionId,
            filename: file.name,
            fileType: file.type,
          }
        });
      } catch (dbError) {
        console.error('Erro ao buscar arquivo existente:', dbError);
        // Continuar mesmo com erro no banco
      }
    }
    
    let uploaded;
    if (existingFile) {
      console.log(`Arquivo já existe no banco: ${existingFile.fileId} (${file.name})`);
      // Tentar obter o arquivo do OpenAI usando o método existente
      try {
        // Usando a API diretamente, já que o serviço pode não ter o método getFile
        const response = await fetch(`https://api.openai.com/v1/files/${existingFile.fileId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          uploaded = await response.json();
          console.log(`Arquivo encontrado na OpenAI: ${existingFile.fileId}`);
        }
      } catch (error) {
        console.error(`Erro ao buscar arquivo da OpenAI: ${existingFile.fileId}`, error);
        // Se falhar, vamos fazer o upload novamente
      }
    }
    
    // Se não encontrou um arquivo existente, faz o upload
    if (!uploaded) {
      console.log(`Fazendo upload de novo arquivo: ${file.name}`);
      uploaded = purpose === 'assistants'
        ? await uploadFileWithAssistants(file, purpose) // retrieval embedding
        : await openaiService.uploadFile(file, { purpose });
    }

    // Salvar referência do arquivo no banco de dados se houver um sessionId
    if (sessionId) {
      try {
        // Verificar se já existe para evitar duplicação
        const existingDbFile = await db.chatFile.findFirst({
          where: {
            sessionId: sessionId,
            fileId: uploaded.id
          }
        });

        if (!existingDbFile) {
          // Criar referência do arquivo no banco de dados
          await db.chatFile.create({
            data: {
              sessionId: sessionId,
              fileId: uploaded.id,
              filename: file.name,
              fileType: file.type,
              purpose: purpose
            }
          });
          console.log(`Referência do arquivo salva no banco: ${uploaded.id} (${file.name})`);
        } else {
          console.log(`Referência já existe no banco: ${uploaded.id} (${file.name})`);
        }
      } catch (dbError) {
        console.error('Erro ao salvar referência do arquivo:', dbError);
        // Continuar mesmo com erro no banco, já que o upload já foi feito
      }
    }

    // Extração opcional
    if (extract && isPdf) {
      try {
        const text = await openaiService.extractPdfWithAssistant(uploaded.id, prompt);
        return NextResponse.json({ ...uploaded, text });
      } catch (err: any) {
        return NextResponse.json({ error: err.message, file: uploaded }, { status: 500 });
      }
    }

    return NextResponse.json(uploaded);
  } catch (err: any) {
    console.error('files POST error', err);
    return NextResponse.json({ error: err.message || 'Upload error' }, { status: 500 });
  }
}

/* =========================================================================
   GET /api/chatwitia/files
   =========================================================================*/
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const purpose = url.searchParams.get('purpose') as FilePurpose | null;
    const sessionId = url.searchParams.get('sessionId');
    
    // Se tiver sessionId, buscar arquivos associados à sessão do banco
    if (sessionId) {
      try {
        const chatFiles = await db.chatFile.findMany({
          where: {
            sessionId: sessionId,
            ...(purpose ? { purpose: purpose } : {})
          }
        });
        
        // Se encontrou arquivos no banco, buscar detalhes de cada um na OpenAI
        if (chatFiles.length > 0) {
          const filesDetails = await Promise.all(
            chatFiles.map(async (dbFile) => {
              try {
                // Usar a API diretamente para buscar detalhes do arquivo
                const response = await fetch(`https://api.openai.com/v1/files/${dbFile.fileId}`, {
                  headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (response.ok) {
                  return await response.json();
                }
                return null;
              } catch (error) {
                console.error(`Erro ao buscar detalhes do arquivo ${dbFile.fileId}:`, error);
                return null;
              }
            })
          );
          
          // Filtrar arquivos que retornaram erro (null)
          const validFiles = filesDetails.filter(Boolean);
          return NextResponse.json({ data: validFiles });
        }
      } catch (dbError) {
        console.error('Erro ao buscar arquivos do banco:', dbError);
        // Continuar para buscar da OpenAI se falhar no banco
      }
    }
    
    // Se não tem sessionId ou não encontrou arquivos, buscar todos da OpenAI
    const list = await openaiService.listFiles(purpose || undefined);
    return NextResponse.json(list);
  } catch (err: any) {
    console.error('files GET error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
