import { prisma } from "@/lib/prisma";
import { Agendamento, Midia } from "@prisma/client";
import { uploadToMinIO, uploadMultipleToMinIO } from "./minio";

/**
 * Interface para criação de um agendamento
 */
export interface CreateAgendamentoDTO {
  userId: string;
  accountId: string;
  Data: Date;
  Descricao?: string;
  Facebook?: boolean;
  Instagram?: boolean;
  Linkedin?: boolean;
  X?: boolean;
  Stories?: boolean;
  Reels?: boolean;
  PostNormal?: boolean;
  Diario?: boolean;
  Randomizar?: boolean;
  TratarComoUnicoPost?: boolean;
  TratarComoPostagensIndividuais?: boolean;
  midias: Array<{
    buffer: Buffer | ArrayBuffer;
    fileName: string;
    mimeType: string;
    url?: string; // URL opcional, caso o arquivo já tenha sido enviado
    thumbnail_url?: string; // URL da thumbnail, caso já tenha sido gerada
  }>;
}

/**
 * Interface para atualização de um agendamento
 */
export interface UpdateAgendamentoDTO {
  Data?: Date;
  Descricao?: string;
  Facebook?: boolean;
  Instagram?: boolean;
  Linkedin?: boolean;
  X?: boolean;
  Stories?: boolean;
  Reels?: boolean;
  PostNormal?: boolean;
  Diario?: boolean;
  Randomizar?: boolean;
  TratarComoUnicoPost?: boolean;
  TratarComoPostagensIndividuais?: boolean;
  midias?: Array<{
    id?: string;
    url: string;
    mime_type: string;
    thumbnail_url?: string;
  }>;
}

/**
 * Cria um novo agendamento
 */
export async function createAgendamento(data: CreateAgendamentoDTO): Promise<Agendamento> {
  console.log("[AgendamentoService] Criando agendamento:", data);

  try {
    // Processa as mídias (upload ou uso direto da URL)
    const midiasData = await Promise.all(
      data.midias.map(async (midia) => {
        // Se a URL já foi fornecida, usa-a diretamente
        if (midia.url) {
          // Garante que o mime_type nunca seja undefined
          const mimeType = midia.mimeType || inferMimeTypeFromUrl(midia.url);

          return {
            url: correctMinioUrl(midia.url),
            mime_type: mimeType,
            thumbnail_url: midia.thumbnail_url ? correctMinioUrl(midia.thumbnail_url) : null,
          };
        }

        // Caso contrário, faz upload para o MinIO
        const uploadedMidia = await uploadToMinIO(
          midia.buffer,
          midia.fileName,
          midia.mimeType
        );

        return {
          url: correctMinioUrl(uploadedMidia.url),
          mime_type: uploadedMidia.mime_type,
          thumbnail_url: null, // Não temos thumbnail para uploads diretos aqui
        };
      })
    );

    console.log("[AgendamentoService] Mídias processadas:", midiasData);

    // Cria o agendamento no Prisma
    const agendamento = await prisma.agendamento.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        Data: data.Data,
        Descricao: data.Descricao || "",
        Facebook: data.Facebook || false,
        Instagram: data.Instagram || false,
        Linkedin: data.Linkedin || false,
        X: data.X || false,
        Stories: data.Stories || false,
        Reels: data.Reels || false,
        PostNormal: data.PostNormal || false,
        Diario: data.Diario || false,
        Randomizar: data.Randomizar || false,
        TratarComoUnicoPost: data.TratarComoUnicoPost || false,
        TratarComoPostagensIndividuais: data.TratarComoPostagensIndividuais || false,
        midias: {
          create: midiasData.map(midia => ({
            url: midia.url,
            mime_type: midia.mime_type || "application/octet-stream", // Garante um valor padrão
            thumbnail_url: midia.thumbnail_url,
          })),
        },
      },
      include: {
        midias: true,
      },
    });

    console.log("[AgendamentoService] Agendamento criado com sucesso:", agendamento.id);
    return agendamento;
  } catch (error) {
    console.error("[AgendamentoService] Erro ao criar agendamento:", error);
    throw error;
  }
}

/**
 * Infere o tipo MIME a partir da URL ou extensão do arquivo
 */
function inferMimeTypeFromUrl(url: string): string {
  // Extrai a extensão do arquivo da URL
  const extension = url.split('.').pop()?.toLowerCase();

  // Mapeamento de extensões comuns para tipos MIME
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'pdf': 'application/pdf',
  };

  // Retorna o tipo MIME correspondente ou um tipo genérico
  return extension && mimeTypes[extension] ? mimeTypes[extension] : 'application/octet-stream';
}

/**
 * Busca um agendamento pelo ID
 */
export async function getAgendamentoById(id: string): Promise<Agendamento | null> {
  try {
    return await prisma.agendamento.findUnique({
      where: { id },
      include: {
        midias: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        account: {
          select: {
            id: true,
            providerAccountId: true,
            access_token: true,
            igUserId: true,
            igUsername: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[AgendamentoService] Erro ao buscar agendamento:", error);
    throw error;
  }
}

/**
 * Busca agendamentos por usuário
 */
export async function getAgendamentosByUser(userId: string): Promise<Agendamento[]> {
  try {
    return await prisma.agendamento.findMany({
      where: { userId },
      include: {
        midias: true,
        account: {
          select: {
            id: true,
            providerAccountId: true,
            igUserId: true,
            igUsername: true,
          },
        },
      },
      orderBy: {
        Data: 'asc',
      },
    });
  } catch (error) {
    console.error("[AgendamentoService] Erro ao buscar agendamentos do usuário:", error);
    throw error;
  }
}

/**
 * Busca agendamentos por conta
 */
export async function getAgendamentosByAccount(accountId: string): Promise<Agendamento[]> {
  try {
    return await prisma.agendamento.findMany({
      where: { accountId },
      include: {
        midias: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        Data: 'asc',
      },
    });
  } catch (error) {
    console.error("[AgendamentoService] Erro ao buscar agendamentos da conta:", error);
    throw error;
  }
}

/**
 * Atualiza um agendamento
 */
export async function updateAgendamento(id: string, data: UpdateAgendamentoDTO): Promise<Agendamento> {
  console.log("[AgendamentoService] Atualizando agendamento:", id, data);

  try {
    // Se houver novas mídias, primeiro exclui as antigas
    if (data.midias && data.midias.length > 0) {
      await prisma.midia.deleteMany({
        where: { agendamentoId: id },
      });

      // Prepara os dados para criar as novas mídias
      const midiaCreateData = {
        create: data.midias.map(midia => ({
          url: correctMinioUrl(midia.url),
          mime_type: midia.mime_type || inferMimeTypeFromUrl(midia.url),
          thumbnail_url: midia.thumbnail_url ? correctMinioUrl(midia.thumbnail_url) : null,
        })),
      };

      // Atualiza o agendamento com as novas mídias
      const agendamento = await prisma.agendamento.update({
        where: { id },
        data: {
          ...(data.Data !== undefined && { Data: data.Data }),
          ...(data.Descricao !== undefined && { Descricao: data.Descricao }),
          ...(data.Facebook !== undefined && { Facebook: data.Facebook }),
          ...(data.Instagram !== undefined && { Instagram: data.Instagram }),
          ...(data.Linkedin !== undefined && { Linkedin: data.Linkedin }),
          ...(data.X !== undefined && { X: data.X }),
          ...(data.Stories !== undefined && { Stories: data.Stories }),
          ...(data.Reels !== undefined && { Reels: data.Reels }),
          ...(data.PostNormal !== undefined && { PostNormal: data.PostNormal }),
          ...(data.Diario !== undefined && { Diario: data.Diario }),
          ...(data.Randomizar !== undefined && { Randomizar: data.Randomizar }),
          ...(data.TratarComoUnicoPost !== undefined && { TratarComoUnicoPost: data.TratarComoUnicoPost }),
          ...(data.TratarComoPostagensIndividuais !== undefined && { TratarComoPostagensIndividuais: data.TratarComoPostagensIndividuais }),
          midias: midiaCreateData,
        },
        include: {
          midias: true,
        },
      });

      console.log("[AgendamentoService] Agendamento atualizado com sucesso:", agendamento.id);
      return agendamento;
    } else {
      // Se não houver novas mídias, apenas atualiza os outros campos
      const agendamento = await prisma.agendamento.update({
        where: { id },
        data: {
          ...(data.Data !== undefined && { Data: data.Data }),
          ...(data.Descricao !== undefined && { Descricao: data.Descricao }),
          ...(data.Facebook !== undefined && { Facebook: data.Facebook }),
          ...(data.Instagram !== undefined && { Instagram: data.Instagram }),
          ...(data.Linkedin !== undefined && { Linkedin: data.Linkedin }),
          ...(data.X !== undefined && { X: data.X }),
          ...(data.Stories !== undefined && { Stories: data.Stories }),
          ...(data.Reels !== undefined && { Reels: data.Reels }),
          ...(data.PostNormal !== undefined && { PostNormal: data.PostNormal }),
          ...(data.Diario !== undefined && { Diario: data.Diario }),
          ...(data.Randomizar !== undefined && { Randomizar: data.Randomizar }),
          ...(data.TratarComoUnicoPost !== undefined && { TratarComoUnicoPost: data.TratarComoUnicoPost }),
          ...(data.TratarComoPostagensIndividuais !== undefined && { TratarComoPostagensIndividuais: data.TratarComoPostagensIndividuais }),
        },
        include: {
          midias: true,
        },
      });

      console.log("[AgendamentoService] Agendamento atualizado com sucesso:", agendamento.id);
      return agendamento;
    }
  } catch (error) {
    console.error("[AgendamentoService] Erro ao atualizar agendamento:", error);
    throw error;
  }
}

/**
 * Exclui um agendamento
 */
export async function deleteAgendamento(id: string): Promise<void> {
  try {
    await prisma.agendamento.delete({
      where: { id },
    });
    console.log("[AgendamentoService] Agendamento excluído com sucesso:", id);
  } catch (error) {
    console.error("[AgendamentoService] Erro ao excluir agendamento:", error);
    throw error;
  }
}

/**
 * Seleciona uma mídia para envio com base na lógica de contadores
 */
export async function selectMidiaForSending(agendamentoId: string): Promise<Midia | null> {
  try {
    // Busca o agendamento com suas mídias
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { midias: true },
    });

    if (!agendamento || agendamento.midias.length === 0) {
      console.log("[AgendamentoService] Agendamento não encontrado ou sem mídias:", agendamentoId);
      return null;
    }

    console.log(`[AgendamentoService] Agendamento ${agendamentoId} tem ${agendamento.midias.length} mídias. TratarComoPostagensIndividuais: ${agendamento.TratarComoPostagensIndividuais}, Randomizar: ${agendamento.Randomizar}`);

    let selectedMidia: Midia | null = null;

    // Se for para tratar como postagens individuais, seleciona com base no contador
    if (agendamento.TratarComoPostagensIndividuais) {
      // Determina o menor contador
      const minContador = Math.min(...agendamento.midias.map(m => m.contador));
      console.log(`[AgendamentoService] Menor contador encontrado: ${minContador}`);

      // Filtra as mídias com o menor contador
      const candidatas = agendamento.midias.filter(m => m.contador === minContador);
      console.log(`[AgendamentoService] ${candidatas.length} mídias candidatas com contador ${minContador}`);

      // Escolhe aleatoriamente uma das candidatas
      selectedMidia = candidatas[Math.floor(Math.random() * candidatas.length)];

      // Incrementa o contador da mídia selecionada
      if (selectedMidia) {
        await prisma.midia.update({
          where: { id: selectedMidia.id },
          data: { contador: { increment: 1 } },
        });

        console.log(`[AgendamentoService] Incrementado contador da mídia ${selectedMidia.id} para ${selectedMidia.contador + 1}`);

        // Atualiza o objeto com o novo valor do contador
        selectedMidia.contador += 1;
      }
    } else if (agendamento.Randomizar) {
      // Se for apenas para randomizar (sem tratar como postagens individuais),
      // seleciona uma mídia aleatoriamente sem incrementar contador
      selectedMidia = agendamento.midias[Math.floor(Math.random() * agendamento.midias.length)];
      console.log(`[AgendamentoService] Selecionada mídia aleatória ${selectedMidia?.id} (sem incrementar contador)`);
    } else {
      // Se não for para randomizar nem tratar como postagens individuais,
      // retorna a primeira mídia (o webhook tratará como um único post)
      selectedMidia = agendamento.midias[0];
      console.log(`[AgendamentoService] Selecionada primeira mídia ${selectedMidia?.id} (sem randomização)`);
    }

    console.log("[AgendamentoService] Mídia selecionada:", selectedMidia?.id);
    return selectedMidia;
  } catch (error) {
    console.error("[AgendamentoService] Erro ao selecionar mídia para envio:", error);
    throw error;
  }
}

/**
 * Função para corrigir a URL do MinIO
 */
function correctMinioUrl(url: string): string {
  // Substitui objstore.witdev.com.br por objstoreapi.witdev.com.br
  return url.replace('objstore.witdev.com.br', 'objstoreapi.witdev.com.br');
}

/**
 * Prepara os dados para envio ao webhook
 */
export async function prepareWebhookData(agendamentoId: string): Promise<any> {
  try {
    // Busca o agendamento com suas mídias
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        midias: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        account: {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            access_token: true,
            expires_at: true,
            igUserId: true,
            igUsername: true,
          },
        },
      },
    });

    if (!agendamento) {
      throw new Error(`Agendamento não encontrado: ${agendamentoId}`);
    }

    // Seleciona a mídia para envio
    const midia = await selectMidiaForSending(agendamentoId);
    if (!midia) {
      throw new Error(`Nenhuma mídia disponível para o agendamento: ${agendamentoId}`);
    }

    console.log(`[AgendamentoService] Preparando webhook para agendamento ${agendamentoId} com mídia ${midia.id}`);

    // Corrige a URL da mídia para usar o endpoint correto
    const correctedUrl = correctMinioUrl(midia.url);

    // Usa a conta associada diretamente ao agendamento
    const instagramAccount = agendamento.account;

    // Verifica se o token expirou
    const tokenExpired = instagramAccount.expires_at
      ? instagramAccount.expires_at * 1000 < Date.now()
      : false;

    // Prepara os dados para o webhook
    const webhookData = {
      id: agendamento.id,
      userId: agendamento.userId,
      userName: agendamento.user.name,
      userEmail: agendamento.user.email,
      descricao: agendamento.Descricao,
      data: agendamento.Data.toISOString(),
      midiaUrl: correctedUrl, // Usa a URL corrigida
      midiaMimeType: midia.mime_type,
      midiaThumbnailUrl: midia.thumbnail_url ? correctMinioUrl(midia.thumbnail_url) : null,
      instagram: agendamento.Instagram,
      facebook: agendamento.Facebook,
      linkedin: agendamento.Linkedin,
      x: agendamento.X,
      stories: agendamento.Stories,
      reels: agendamento.Reels,
      postNormal: agendamento.PostNormal,
      diario: agendamento.Diario,
      randomizar: agendamento.Randomizar,
      tratarComoPostagensIndividuais: agendamento.TratarComoPostagensIndividuais,
      tokenExpired,
      instagramAccountId: instagramAccount.providerAccountId,
      instagramAccessToken: instagramAccount.access_token,
      igUserId: instagramAccount.igUserId,
      igUsername: instagramAccount.igUsername,
    };

    console.log(`[AgendamentoService] Webhook preparado para agendamento ${agendamentoId}:`, {
      id: webhookData.id,
      midiaUrl: webhookData.midiaUrl,
      midiaMimeType: webhookData.midiaMimeType,
      stories: webhookData.stories,
      reels: webhookData.reels,
      postNormal: webhookData.postNormal,
    });

    return webhookData;
  } catch (error) {
    console.error("[AgendamentoService] Erro ao preparar dados para webhook:", error);
    throw error;
  }
}