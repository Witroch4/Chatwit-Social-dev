import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Se já possuir uma instância global do Prisma, utilize-a; caso contrário, crie uma nova.
export const prisma: PrismaClient = (globalThis as any).prisma || new PrismaClient();

/**
 * Interfaces para os dados esperados no payload.
 */
interface Usuario {
  inbox: {
    id: number;
    name: string;
  };
  account: {
    id: number;
    name: string;
  };
  channel: string;
}

interface OrigemLead {
  source_id: string;
  name: string;
  phone_number: string;
  thumbnail: string;
  arquivos: Array<{ file_type: string; data_url: string }>;
  leadUrl: string;
}

interface WebhookPayload {
  usuario: Usuario;
  origemLead: OrigemLead;
}

/**
 * Handler da rota POST.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[Webhook Chatwit] Recebendo requisição");
    
    // Extrair dados do payload
    const payloadRaw = await request.json();
    console.log("[Webhook Chatwit] Payload recebido:", JSON.stringify(payloadRaw, null, 2));
    
    // Verificar se o payload é um array ou um objeto único
    let payload: WebhookPayload;
    if (Array.isArray(payloadRaw)) {
      payload = payloadRaw[0];
    } else {
      payload = payloadRaw as WebhookPayload;
    }
    
    // Extrair dados do usuário e do lead
    const { usuario, origemLead } = payload;
    
    // Validação básica
    if (!usuario?.account?.id || !origemLead?.source_id) {
      return NextResponse.json(
        { 
          error: "Dados incompletos recebidos",
          receivedData: payload 
        },
        { status: 400 }
      );
    }

    console.log("[Webhook Chatwit] Dados extraídos:", {
      usuarioData: usuario,
      leadData: origemLead
    });

    // 1. Verificar se o usuário já existe, senão cria
    let usuarioDb = await prisma.usuarioChatwit.findFirst({
      where: {
        userId: Number(usuario.account.id),
        accountName: usuario.account.name,
      },
    });

    if (!usuarioDb) {
      usuarioDb = await prisma.usuarioChatwit.create({
        data: {
          userId: Number(usuario.account.id),
          name: usuario.account.name,
          accountId: Number(usuario.account.id),
          accountName: usuario.account.name,
          channel: usuario.channel,
          inboxId: usuario.inbox?.id ? Number(usuario.inbox.id) : undefined,
          inboxName: usuario.inbox?.name,
        },
      });
      console.log("[Webhook Chatwit] Novo usuário criado:", usuarioDb.id);
    }

    // 2. Verificar se o lead já existe, senão cria
    let lead = await prisma.leadChatwit.findFirst({
      where: {
        usuarioId: usuarioDb.id,
        sourceId: origemLead.source_id,
      },
    });

    if (!lead) {
      lead = await prisma.leadChatwit.create({
        data: {
          usuarioId: usuarioDb.id,
          sourceId: origemLead.source_id,
          name: origemLead.name || "Lead sem nome",
          phoneNumber: origemLead.phone_number || null,
          thumbnail: origemLead.thumbnail || null,  // Salvar a URL da thumbnail
          leadUrl: origemLead.leadUrl,
        },
      });
      console.log("[Webhook Chatwit] Novo lead criado:", lead.id);
    } else if (!lead.thumbnail && origemLead.thumbnail) {
      // Atualizar o lead com a thumbnail, caso ele exista mas não tenha thumbnail
      lead = await prisma.leadChatwit.update({
        where: { id: lead.id },
        data: { thumbnail: origemLead.thumbnail }
      });
      console.log("[Webhook Chatwit] Thumbnail atualizada para o lead:", lead.id);
    }

    // 3. Processar anexos, se houver
    const arquivosIds = [];
    if (origemLead.arquivos && origemLead.arquivos.length > 0) {
      for (const arquivo of origemLead.arquivos) {
        const novoArquivo = await prisma.arquivoLeadChatwit.create({
          data: {
            leadId: lead.id,
            fileType: arquivo.file_type,
            dataUrl: arquivo.data_url,
          },
        });
        arquivosIds.push(novoArquivo.id);
        console.log(`[Webhook Chatwit] Novo arquivo adicionado para o lead ${lead.id}, tipo: ${arquivo.file_type}`);
      }
    }

    // Buscar o lead completo com todos os relacionamentos para retornar
    const leadCompleto = await prisma.leadChatwit.findUnique({
      where: { id: lead.id },
      include: {
        usuario: true,
        arquivos: true
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        leadId: lead.id, 
        usuarioId: usuarioDb.id,
        payload: payload, // Incluir o payload recebido
        leadData: leadCompleto, // Incluir os dados do lead
        arquivosIds: arquivosIds // IDs dos arquivos criados
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook Chatwit] Erro ao processar webhook:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook", errorDetails: error },
      { status: 500 }
    );
  }
}

/**
 * GET - Verifica se o webhook está funcionando
 */
export async function GET(request: Request): Promise<Response> {
  return NextResponse.json(
    { status: "Webhook do Chatwit funcionando corretamente" },
    { status: 200 }
  );
}
