import { Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { ILeadJobData } from '@/lib/queue/leads-chatwit.queue';

/**
 * Processa um job da fila "filaLeadsChatwit".
 */
export async function processLeadChatwitTask(job: Job<ILeadJobData>) {
  const { usuario, origemLead } = job.data.payload;

  // 1) Find or create/update do usuário
  let usuarioDb = await prisma.usuarioChatwit.findFirst({
    where: {
      userId:      Number(usuario.account.id),
      accountName: usuario.account.name
    }
  });

  if (usuarioDb) {
    usuarioDb = await prisma.usuarioChatwit.update({
      where: { id: usuarioDb.id },
      data: {
        channel:   usuario.channel,
        inboxId:   usuario.inbox?.id ?? undefined,
        inboxName: usuario.inbox?.name
      }
    });
  } else {
    usuarioDb = await prisma.usuarioChatwit.create({
      data: {
        userId:      Number(usuario.account.id),
        name:        usuario.account.name,
        accountId:   Number(usuario.account.id),
        accountName: usuario.account.name,
        channel:     usuario.channel,
        inboxId:     usuario.inbox?.id ?? undefined,
        inboxName:   usuario.inbox?.name
      }
    });
  }

  // 2) Upsert do lead usando sourceId agora marcado @unique
  const lead = await prisma.leadChatwit.upsert({
    where: { sourceId: origemLead.source_id },
    update: {
      thumbnail: origemLead.thumbnail,
      leadUrl:   origemLead.leadUrl
    },
    create: {
      usuarioId:   usuarioDb.id,
      sourceId:    origemLead.source_id,
      name:        origemLead.name || 'Lead sem nome',
      phoneNumber: origemLead.phone_number,
      thumbnail:   origemLead.thumbnail,
      leadUrl:     origemLead.leadUrl
    }
  });

  // 3) Criar anexos em lote, ignorando duplicatas
  if (origemLead.arquivos?.length) {
    await prisma.arquivoLeadChatwit.createMany({
      data: origemLead.arquivos.map(a => ({
        leadId:   lead.id,
        fileType: a.file_type,
        dataUrl:  a.data_url
      })),
      skipDuplicates: true
    });
  }

  return { leadId: lead.id };
}
