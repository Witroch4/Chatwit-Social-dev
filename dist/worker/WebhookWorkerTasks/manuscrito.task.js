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
                manuscritoProcessado: true
            },
        });
        console.log(`[BullMQ] Lead atualizado com sucesso:`, leadAtualizado.id);
        return { success: true, message: 'Manuscrito processado com sucesso' };
    }
    catch (error) {
        console.error(`[BullMQ] Erro ao processar manuscrito: ${error.message}`);
        throw error;
    }
}
