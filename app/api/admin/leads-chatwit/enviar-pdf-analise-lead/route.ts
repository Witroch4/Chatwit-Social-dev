// app/api/admin/leads-chatwit/enviar-pdf-analise-lead/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import FormData from 'form-data';
import axios from 'axios';

const CHATWOOT_ACCESS_TOKEN = process.env.CHATWITACESSTOKEN; // => UXDyxpWNGhTJCGXydACZPaCZ
const CHATWOOT_BASE_URL = process.env.CHATWIT_BASE_URL ?? 'https://chatwit.witdev.com.br';
console.log('CHATWOOT_ACCESS_TOKEN', CHATWOOT_ACCESS_TOKEN);
// ---- Utilidades -------------------------------------------------------------

/**
 * Extrai accountId e conversationId de uma URL do tipo
 * https://.../accounts/3/conversations/1199
 */
function extractIds(leadUrl: string) {
  const url = new URL(leadUrl);
  const [, , account, accountId, , conversationId] = url.pathname.split('/');
  if (account !== 'accounts' || !accountId || !conversationId) {
    throw new Error(`leadUrl fora do formato esperado: ${leadUrl}`);
  }
  return { accountId, conversationId };
}

/**
 * Faz download do arquivo remoto e devolve {buffer, mime, filename}
 */
async function downloadFile(fileUrl: string) {
  const res = await axios.get<ArrayBuffer>(fileUrl, { responseType: 'arraybuffer' });
  const contentType = res.headers['content-type'] ?? 'application/octet-stream';
  const filename    = decodeURIComponent(new URL(fileUrl).pathname.split('/').pop()!);
  return { buffer: Buffer.from(res.data), mime: contentType, filename };
}

// ---- Handler ----------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    // Extrair os parâmetros da URL
    const url = new URL(request.url);
    const sourceId = url.searchParams.get('sourceId');
    const message = url.searchParams.get('message') || 'Segue o documento em anexo.';
    // Extrair accessToken personalizado se fornecido via URL
    let accessToken = url.searchParams.get('accessToken') || null;

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId obrigatório' }, { status: 400 });
    }

    // 1) Busca o lead + arquivos
    const lead = await prisma.leadChatwit.findUnique({
      where: { sourceId },
      include: { arquivos: true }
    });
    
    if (!lead || !lead.leadUrl) {
      throw new Error('Lead não encontrado ou sem leadUrl');
    }
    
    // Se não tiver accessToken na URL, verifica se existe no banco de dados
    // Usamos any para contornar o erro de tipagem, já que estamos adicionando o campo customAccessToken
    const leadAny = lead as any;
    if (!accessToken && leadAny.customAccessToken) {
      accessToken = leadAny.customAccessToken;
      console.log('Usando token de acesso personalizado do banco de dados');
    }
    
    // Se ainda não tiver, usa o token padrão do ambiente
    if (!accessToken) {
      accessToken = CHATWOOT_ACCESS_TOKEN || null;
      console.log('Usando token de acesso padrão do ambiente');
    }

    // Verificar se tem token de acesso
    if (!accessToken) {
      return NextResponse.json({ error: 'Token de acesso não configurado' }, { status: 500 });
    }

    // 2) Seleciona a URL do PDF (prioriza analiseUrl → pdfUnificado → primeiro arquivo pdf)
    const pdfUrl =
      lead.analiseUrl ||
      lead.pdfUnificado ||
      lead.arquivos.find((a: { id: string; dataUrl: string; fileType: string }) => a.fileType === 'pdf')?.dataUrl;

    if (!pdfUrl) {
      throw new Error('Nenhum PDF disponível para este lead');
    }

    // 3) Extrai ids do Chatwoot
    const { accountId, conversationId } = extractIds(lead.leadUrl);

    // 4) Baixa o PDF
    const { buffer, mime, filename } = await downloadFile(pdfUrl);

    // 5) Monta multipart/form-data
    const form = new FormData();
    form.append('content', message);
    form.append('message_type', 'outgoing');
    form.append('attachments[]', buffer, { filename, contentType: mime });

    // 6) Envia para o Chatwoot
    const chatwootUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;

    const cwRes = await axios.post(chatwootUrl, form, {
      headers: {
        ...form.getHeaders(),
        api_access_token: accessToken
      },
      maxBodyLength: Infinity // garante upload de PDFs grandes
    });

    // 7) Atualizar o campo anotacoes do lead com a mensagem enviada
    // e salvar o accessToken se foi fornecido via URL e não é o mesmo do ambiente
    const updateData: any = { 
      anotacoes: message
    };
    
    // Se tiver um accessToken personalizado na URL que não é o do ambiente, salva no banco
    const urlAccessToken = url.searchParams.get('accessToken');
    if (urlAccessToken && urlAccessToken !== CHATWOOT_ACCESS_TOKEN) {
      updateData.customAccessToken = urlAccessToken;
    }
    
    await prisma.leadChatwit.update({
      where: { sourceId },
      data: updateData
    });

    return NextResponse.json({ ok: true, chatwoot: cwRes.data });
  } catch (err: any) {
    console.error('[sendPdfAttachment] erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
