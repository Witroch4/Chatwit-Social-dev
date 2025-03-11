import { agendamentoQueue, IAgendamentoJobData } from "@/lib/queue/agendamento.queue";
import { prisma } from "@/lib/prisma";

/**
 * Agenda um job no BullMQ para um agendamento
 */
export async function scheduleAgendamentoBullMQ(data: {
  id: string | number;
  Data: string;
  userID: string;
  Diario?: boolean;
}) {
  try {
    const { id, Data, userID, Diario } = data;

    // Formata o ID do job para incluir o ID do agendamento
    const baserowId = `ag-job-${id}`;
    const jobId = `agendamento-${baserowId}`;

    // Calcula o delay até a data de agendamento
    const agendamentoDate = new Date(Data);
    const now = new Date();
    const delay = Math.max(0, agendamentoDate.getTime() - now.getTime());

    console.log(`[BullMQ] Agendando job para ${agendamentoDate.toISOString()} (delay: ${delay}ms)`);

    // Adiciona o job à fila
    const job = await agendamentoQueue.add(
      jobId,
      {
        baserowId,
        Data,
        userID,
        Diario,
      },
      {
        delay,
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    console.log(`[BullMQ] Job agendado com sucesso: ${job.id}`);
    return job;
  } catch (error) {
    console.error("[BullMQ] Erro ao agendar job:", error);
    throw error;
  }
}

/**
 * Cancela um job no BullMQ para um agendamento
 */
export async function cancelAgendamentoBullMQ(agendamentoId: string | number) {
  try {
    const jobId = `agendamento-ag-job-${agendamentoId}`;
    const job = await agendamentoQueue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`[BullMQ] Job cancelado com sucesso: ${jobId}`);
      return true;
    } else {
      console.log(`[BullMQ] Job não encontrado para cancelamento: ${jobId}`);
      return false;
    }
  } catch (error) {
    console.error("[BullMQ] Erro ao cancelar job:", error);
    throw error;
  }
}

/**
 * Processa agendamentos pendentes
 * Esta função é chamada periodicamente para verificar agendamentos que estão próximos de vencer
 */
export async function processarAgendamentosPendentes() {
  try {
    console.log("[BullMQ] Processando agendamentos pendentes...");

    // Busca agendamentos que estão próximos de vencer (próximas 24 horas)
    const now = new Date();
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 1);

    const agendamentosPendentes = await prisma.agendamento.findMany({
      where: {
        Data: {
          gte: now,
          lt: nextDay,
        },
      },
    });

    console.log(`[BullMQ] Encontrados ${agendamentosPendentes.length} agendamentos pendentes.`);

    // Agenda jobs para cada agendamento pendente
    for (const agendamento of agendamentosPendentes) {
      // Verifica se já existe um job para este agendamento
      const jobId = `agendamento-ag-job-${agendamento.id}`;
      const existingJob = await agendamentoQueue.getJob(jobId);

      if (!existingJob) {
        // Se não existir, agenda um novo job
        await scheduleAgendamentoBullMQ({
          id: agendamento.id,
          Data: agendamento.Data.toISOString(),
          userID: agendamento.userId,
          Diario: agendamento.Diario,
        });

        console.log(`[BullMQ] Agendamento pendente agendado: ${agendamento.id}`);
      }
    }

    return agendamentosPendentes.length;
  } catch (error) {
    console.error("[BullMQ] Erro ao processar agendamentos pendentes:", error);
    throw error;
  }
}

