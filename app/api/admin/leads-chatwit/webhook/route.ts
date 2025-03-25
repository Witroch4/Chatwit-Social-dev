import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addManuscritoJob } from '@/lib/queue/manuscrito.queue';

// Criando uma instância do Prisma fora do escopo da rota
const prisma = new PrismaClient();

/**
 * Handler da rota POST.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[Webhook] Recebendo requisição POST");
    
    // Obter o payload completo
    const webhookData = await request.json();
    console.log("[Webhook] Dados recebidos:", JSON.stringify(webhookData, null, 2));
    
    // Verificar se é um manuscrito processado
    if (webhookData.manuscrito && webhookData.textoDAprova) {
      console.log("[Webhook] Identificado payload de manuscrito processado");
      
      // Primeira tentativa: usar o leadID do payload
      let leadID = webhookData.leadID;
      
      // Segunda tentativa: buscar pelo telefone
      if (!leadID && webhookData.telefone) {
        console.log("[Webhook] Buscando lead por telefone");
        const lead = await prisma.leadChatwit.findFirst({
          where: {
            phoneNumber: webhookData.telefone
          }
        });
        
        if (lead) {
          leadID = lead.id;
          console.log("[Webhook] Lead encontrado pelo telefone:", leadID);
        } else {
          console.error("[Webhook] Lead não encontrado com o telefone fornecido");
          return NextResponse.json({
            success: false,
            message: "Lead não encontrado com o telefone fornecido",
          });
        }
      }
      
      if (!leadID) {
        console.error("[Webhook] Não foi possível identificar o lead");
        return NextResponse.json({
          success: false,
          message: "Não foi possível identificar o lead",
        });
      }
      
      // Adicionar à fila de processamento
      await addManuscritoJob({
        leadID: leadID,
        textoDAprova: webhookData.textoDAprova
      });
      
      // Atualizar o lead com o texto manuscrito
      const leadUpdate = await prisma.leadChatwit.update({
        where: {
          id: leadID
        },
        data: {
          provaManuscrita: webhookData.textoDAprova,
          manuscritoProcessado: true,
          aguardandoManuscrito: false,
          updatedAt: new Date()
        }
      });
      
      console.log("[Webhook] Manuscrito adicionado à fila de processamento");
      return NextResponse.json({
        success: true,
        message: "Manuscrito adicionado à fila de processamento",
      });
    }
    
    console.log("[Webhook] Payload não identificado como manuscrito");
    return NextResponse.json({
      success: false,
      message: "Payload não identificado como manuscrito",
    });

  } catch (error: any) {
    console.error("[Webhook] Erro ao processar webhook:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro interno ao processar webhook",
      },
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
