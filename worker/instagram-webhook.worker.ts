// worker/instagram-webhook.worker.ts

import { Worker, Job } from "bullmq";
import axios from "axios";
import dotenv from "dotenv";
import { connection } from "@/lib/redis";
import {
  INSTAGRAM_WEBHOOK_QUEUE_NAME,
  IInstagramWebhookJobData,
} from "@/lib/queue/instagram-webhook.queue";
import { prisma } from "@/lib/prisma";
import { getInstagramUserToken } from "@/lib/instagram-auth";

dotenv.config();

/**
 * Base da Graph API para Instagram.
 * Se você quiser usar a do Instagram Graph (para mensagens),
 * normalmente é graph.facebook.com/v17.0
 */
const IG_GRAPH_API_BASE = process.env.IG_GRAPH_API_BASE || "https://graph.instagram.com/v21.0";

/**
 * Worker para processar a fila 'instagram-webhooks'.
 */
const instagramWebhookWorker = new Worker<IInstagramWebhookJobData>(
  INSTAGRAM_WEBHOOK_QUEUE_NAME,
  async (job: Job<IInstagramWebhookJobData>) => {
    try {
      console.log(
        `[InstagramWebhookWorker] Processando job: ${job.id}, data:`,
        JSON.stringify(job.data, null, 2)
      );

      const { object, entry } = job.data;

      if (object !== "instagram") {
        console.warn(`[InstagramWebhookWorker] Objeto não suportado: ${object}`);
        return;
      }

      // Processar cada entry
      for (const event of entry) {
        const igUserId = event.id; // ID da conta comercial ex.: "178414..."

        if (event.changes) {
          for (const change of event.changes) {
            const { field, value } = change;

            switch (field) {
              case "comments":
                // Lida com comentários em posts/reels
                await handleCommentChange(value, igUserId);
                break;

              default:
                console.warn(`[InstagramWebhookWorker] Campo não tratado: ${field}`);
            }
          }
        }

        // Se existirem eventos de "messaging", como DMs ou Quick Replies
        if (event.messaging) {
          for (const msgEvt of event.messaging) {
            await handleMessageEvent(msgEvt, igUserId);
          }
        }
      }

      console.log("[InstagramWebhookWorker] Evento(s) processado(s) com sucesso!");
    } catch (error: any) {
      console.error("[InstagramWebhookWorker] Erro ao processar evento:", error.message);
      throw error; // BullMQ re-tentará se houver falha
    }
  },
  { connection }
);

/**
 * Lida com comentários em posts/reels (field: "comments").
 * - Verifica se a mídia e a palavra-chave batem com a Automacao do usuário
 * - Se bater, faz:
 *   1) Resposta pública (opcional)
 *   2) Private Reply com a frase de boas-vindas
 *   3) Quick Reply (opcional), se automacao.quickReplyTexto não estiver vazio
 */
/**
 * Lida com comentários em posts/reels (field: "comments").
 */
async function handleCommentChange(value: any, igUserId: string) {
  try {
    const {
      id: comment_id,
      text: commentText = "",
      from,
      media,
    } = value;

    const media_id = media?.id;

    console.log(`[handleCommentChange] Recebido comentário. media_id=${media_id}, text=${commentText}`);

    // Evitar loop se "from.id" é o mesmo que "igUserId"
    if (from?.id === igUserId) {
      console.log("[handleCommentChange] Ignorando comentário pois foi feito pelo próprio igUserId.");
      return;
    }

    // 1) Encontrar token de acesso
    const accessToken = await getInstagramUserToken(igUserId);
    if (!accessToken) {
      console.warn(`[handleCommentChange] Token não encontrado p/ igUserId=${igUserId}`);
      return;
    }

    // 2) Buscar automação configurada para esse igUserId
    const automacao = await prisma.automacao.findFirst({
      where: {
        user: {
          accounts: {
            some: {
              provider: "instagram",
              igUserId: igUserId,
            },
          },
        },
      },
    });

    if (!automacao) {
      console.log(`[handleCommentChange] Nenhuma automação p/ igUserId=${igUserId}`);
      return;
    }

    // (Verificar mídia e palavra-chave, etc.)

    // --------------------------------------------------------------------
    // Exemplo: Responder publicamente (opcional)
    // --------------------------------------------------------------------
    if (automacao.responderPublico) {
      const publicReply = automacao.fraseBoasVindas || "Olá! Obrigado pelo seu comentário!";
      await replyPublicComment(comment_id, accessToken, publicReply);
    }

    // --------------------------------------------------------------------
    // 1) ENVIAR Private Reply com "texto grande"
    // --------------------------------------------------------------------
    // Aqui usamos 'automacao.fraseBoasVindas' como texto principal
    const fullText = automacao.fraseBoasVindas ||
      "Olá! Eu estou muito feliz que você está aqui. Obrigado pelo seu interesse!";

    await sendPrivateReply(igUserId, accessToken, comment_id, fullText);

    // --------------------------------------------------------------------
    // 2) DM com QuickReply "somente botão"
    // --------------------------------------------------------------------
    // Precisamos do autor do comentário
    const authorIgId = await getCommentAuthorId(comment_id, accessToken);
    if (!authorIgId) {
      console.log("[handleCommentChange] Não foi possível obter o authorIgId");
      return;
    }

    // Se tiver quickReplyTexto, iremos mandar APENAS o botão, sem repetir o fullText
    if (automacao.quickReplyTexto) {
      // Exemplo: texto curto ou vazio
      const minimalText = "Clique Aqui"; // pode ser "Clique no botão abaixo" ou deixar vazio

      await sendDMWithQuickReply({
        recipientId: authorIgId,
        accessToken,
        text: minimalText,           // text bem curto
        quickReplyLabel: automacao.quickReplyTexto, // o botão, ex: "Me envie o link"
      });
    }

    console.log("[handleCommentChange] Automação finalizada (PrivateReply + DM QuickReply)!");
  } catch (err) {
    console.error("[handleCommentChange] Erro:", err);
  }
}



/**
 * Lida com evento de "messages" (DM) - ex.: Quick Reply.
 * Se detectarmos que é uma quick_reply com payload "ME_ENVIE_O_LINK", enviamos a Etapa 3 (link).
 */
async function handleMessageEvent(msgEvt: any, igUserId: string) {
  try {
    const senderId = msgEvt.sender?.id;

    // Se "senderId" = "igUserId", estamos recebendo nossa própria mensagem
    if (senderId === igUserId) {
      console.log("[handleMessageEvent] Ignorando mensagem pois foi enviada pelo próprio igUserId.");
      return;
    }     // ID do usuário que enviou DM
    // const recipientId = msgEvt.recipient?.id; // ID da conta IG que recebeu a DM

    // Se for Quick Reply, virá algo como { message: { quick_reply: { payload: '...' } } }
    const quickReplyPayload = msgEvt.message?.quick_reply?.payload;

    if (!quickReplyPayload) {
      console.log("[handleMessageEvent] Mensagem sem quick_reply payload, ignorando...");
      return;
    }

    // Buscar a automação novamente
    const automacao = await prisma.automacao.findFirst({
      where: {
        user: {
          accounts: {
            some: {
              provider: "instagram",
              igUserId: igUserId,
            },
          },
        },
      },
    });
    if (!automacao) {
      console.log(`[handleMessageEvent] Nenhuma automação p/ igUserId=${igUserId}`);
      return;
    }

    // 1) Se for o payload "ME_ENVIE_O_LINK", enviamos a Etapa 3: DM com o link
    if (quickReplyPayload === "ME_ENVIE_O_LINK") {
      const accessToken = await getInstagramUserToken(igUserId);
      if (!accessToken) {
        console.warn(`[handleMessageEvent] Falta token p/ igUserId=${igUserId}`);
        return;
      }

      const finalText = automacao.mensagemEtapa3 ||
        "Aqui está o link que você pediu!";
      const finalUrl = automacao.linkEtapa3 ||
        "https://minha-loja.com.br";
      const finalTitle = automacao.legendaBotaoEtapa3 ||
        "Visite nosso site";

      // Enviar a DM com link
      await sendDirectMessage({
        accessToken,
        igUserId,
        recipientId: senderId,
        text: finalText,
        button: {
          url: finalUrl,
          title: finalTitle,
        },
      });

      console.log("[handleMessageEvent] Etapa 3 (link) enviada com sucesso!");
    }

    // Se você tiver outras payloads, trate aqui
    // ...
  } catch (err: any) {
    console.error("[handleMessageEvent] Erro:", err.message);
  }
}

/**
 * Resposta pública no comentário do IG
 */
async function replyPublicComment(commentId: string, accessToken: string, mensagem: string) {
  await axios.post(
    `${IG_GRAPH_API_BASE}/${commentId}/replies`,
    new URLSearchParams({
      message: mensagem,
      access_token: accessToken,
    }),
  );
  console.log(`[replyPublicComment] Resposta pública no commentId=${commentId} enviada.`);
}

/**
 * Private Reply a um comentário (Instagram Business)
 */
async function sendPrivateReply(
  igUserId: string,
  accessToken: string,
  commentId: string,
  text: string
) {
  await axios.post(
    `${IG_GRAPH_API_BASE}/${igUserId}/messages`,
    {
      recipient: { comment_id: commentId },
      message: { text },
    },
    {
      params: { access_token: accessToken },
    }
  );
  console.log(`[sendPrivateReply] PrivateReply enviado (commentId=${commentId}).`);
}

/**
 * Envia uma DM com QuickReply "textual".
 */
async function sendDMWithQuickReply({
  recipientId,
  accessToken,
  text,
  quickReplyLabel,
}: {
  recipientId: string;
  accessToken: string;
  text: string;
  quickReplyLabel: string;
}) {
  // O endpoint "me/messages" ou "{igBusinessId}/messages"
  // depende se o endpoint está configurado para mandar DMs.
  // Geralmente, se IG_GRAPH_API_BASE = "https://graph.facebook.com/v17.0",
  // e a conta é BUSINESS, use igBusinessId/messages
  await axios.post(
    `${IG_GRAPH_API_BASE}/me/messages`, // ou `${IG_GRAPH_API_BASE}/${igBusinessId}/messages`
    {
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: {
        text,
        quick_replies: [
          {
            content_type: "text",
            title: quickReplyLabel,
            payload: "ME_ENVIE_O_LINK",
          },
        ],
      },
    },
    {
      params: { access_token: accessToken },
    }
  );
  console.log(`[sendDMWithQuickReply] QuickReply enviado p/ userId=${recipientId}.`);
}

/**
 * Envia uma DM com (opcionalmente) um botão de link.
 */
async function sendDirectMessage({
  accessToken,
  igUserId,
  recipientId,
  text,
  button,
}: {
  accessToken: string;
  igUserId: string;
  recipientId: string;
  text: string;
  button?: { url: string; title: string };
}) {
  let finalText = text;
  if (button) {
    // Adiciona o link como texto extra
    finalText += `\n\n${button.title}: ${button.url}`;
  }

  await axios.post(
    `${IG_GRAPH_API_BASE}/${igUserId}/messages`,
    {
      recipient: { id: recipientId },
      message: { text: finalText },
      messaging_type: "RESPONSE",
    },
    {
      params: { access_token: accessToken },
    }
  );
  console.log(`[sendDirectMessage] DM enviada p/ userId=${recipientId}.`);
}

/**
 * Obtém o autor do comentário (ID do usuário) para podermos enviar DM
 */
async function getCommentAuthorId(commentId: string, accessToken: string): Promise<string | null> {
  try {
    const resp = await axios.get(`${IG_GRAPH_API_BASE}/${commentId}`, {
      params: {
        fields: "from{id,username}",
        access_token: accessToken,
      },
    });
    return resp.data.from?.id || null;
  } catch (err) {
    console.error("[getCommentAuthorId] Erro ao buscar autor:", (err as any)?.message);
    return null;
  }
}

// Eventos de debug do Worker
instagramWebhookWorker.on("active", (job) => {
  console.log(`[InstagramWebhookWorker] Job ativo: id=${job.id}`);
});

instagramWebhookWorker.on("completed", (job) => {
  console.log(`[InstagramWebhookWorker] Job concluído: id=${job.id}`);
});

instagramWebhookWorker.on("failed", (job, err) => {
  console.error(`[InstagramWebhookWorker] Job falhou: id=${job?.id}, Erro: ${err.message}`);
});

instagramWebhookWorker.on("error", (err) => {
  console.error("[InstagramWebhookWorker] Erro no worker:", err);
});

console.log(
  `[InstagramWebhookWorker] Worker inicializado e aguardando jobs na fila "${INSTAGRAM_WEBHOOK_QUEUE_NAME}"...`
);
