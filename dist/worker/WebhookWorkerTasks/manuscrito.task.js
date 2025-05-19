"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processManuscritoTask = processManuscritoTask;
const prisma_1 = require("../../lib/prisma");
async function processManuscritoTask(job) {
    console.log(`[BullMQ] Processando job de manuscrito: ${job.id}`);
    console.log(`[BullMQ] Dados do job:`, job.data);
    try {
        const { leadID, textoDAprova } = job.data;
        // Juntar os "output" em uma única string com separadores
        const conteudoUnificado = textoDAprova
            .map((item) => item.output)
            .join('\n\n---------------------------------\n\n');
        console.log(`[BullMQ] Atualizando lead ${leadID} com o manuscrito processado`);
        // Verificar se o lead existe
        const leadExistente = await prisma_1.prisma.leadChatwit.findUnique({
            where: { id: leadID },
        });
        if (!leadExistente) {
            throw new Error(`Lead não encontrado com ID: ${leadID}`);
        }
        // Atualizar o lead com o conteúdo do manuscrito
        const leadAtualizado = await prisma_1.prisma.leadChatwit.update({
            where: { id: leadID },
            data: {
                provaManuscrita: conteudoUnificado,
                manuscritoProcessado: true,
                aguardandoManuscrito: false
            },
        });
        // Notificar o frontend via SSE
        try {
            // Determinar a URL base do servidor
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            // Chamar a API interna para disparar o evento SSE
            const response = await fetch(`${baseUrl}/api/admin/leads-chatwit/trigger-sse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.INTERNAL_API_KEY || 'desenvolvimento', // Use uma chave de API para segurança
                },
                body: JSON.stringify({
                    leadId: leadID,
                    eventName: 'manuscrito_processado',
                    data: {
                        leadId: leadID,
                        manuscritoProcessado: true,
                        provaManuscrita: conteudoUnificado
                    }
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[BullMQ] Erro ao enviar evento SSE: ${errorText}`);
            }
            else {
                console.log(`[BullMQ] Evento SSE enviado com sucesso para o lead ${leadID}`);
            }
        }
        catch (error) {
            console.error(`[BullMQ] Erro ao enviar notificação SSE:`, error);
            // Não interromper o processamento se a notificação falhar
        }
        console.log(`[BullMQ] Lead atualizado com sucesso:`, leadAtualizado.id);
        return { success: true, message: 'Manuscrito processado com sucesso' };
    }
    catch (error) {
        console.error(`[BullMQ] Erro ao processar manuscrito: ${error.message}`);
        throw error;
    }
}
