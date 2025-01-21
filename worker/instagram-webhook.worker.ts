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
 * Caso queira usar a do Instagram Graph (para mensagens),
 * normalmente é https://graph.instagram.com/vxx.0
 */
const IG_GRAPH_API_BASE =
  process.env.IG_GRAPH_API_BASE || "https://graph.instagram.com/v21.0";

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
        const igUserId = event.id; // ex.: "178414..."

        // Se tivermos "changes", então é evento de "comments"
        if (event.changes) {
          for (const change of event.changes) {
            const { field, value } = change;
            switch (field) {
              case "comments":
                await handleCommentChange(value, igUserId);
                break;
              default:
                console.warn(
                  `[InstagramWebhookWorker] Campo não tratado: ${field}`
                );
            }
          }
        }

        // Se existirem eventos de "messaging", como DMs, postbacks, etc.
        if (event.messaging) {
          for (const msgEvt of event.messaging) {
            await handleMessageEvent(msgEvt, igUserId);
          }
        }
      }

      console.log("[InstagramWebhookWorker] Evento(s) processado(s) com sucesso!");
    } catch (error: any) {
      console.error(
        "[InstagramWebhookWorker] Erro ao processar evento:",
        error.message
      );
      throw error; // BullMQ fará re-tentativas se der erro
    }
  },
  { connection }
);

/**
 * Lida com comentários em posts/reels (field: "comments").
 *   - Verifica mídia e palavra-chave (se necessário)
 *   - Se aprovado, faz:
 *       1) Resposta pública (opcional)
 *       2) Envia DM (template) com automacao.DMreply + botão postback
 */
async function handleCommentChange(value: any, igUserId: string) {
  try {
    const { id: comment_id, text: commentText = "", from, media } = value;
    const media_id = media?.id;

    console.log(
      `[handleCommentChange] Recebido comentário. media_id=${media_id}, text=${commentText}`
    );

    // Evitar "loop" se o autor do comentário = igUserId
    if (from?.id === igUserId) {
      console.log(
        "[handleCommentChange] Ignorando comentário pois foi feito pelo próprio igUserId."
      );
      return;
    }

    // 1) Encontrar token de acesso
    const accessToken = await getInstagramUserToken(igUserId);
    if (!accessToken) {
      console.warn(
        `[handleCommentChange] Token não encontrado p/ igUserId=${igUserId}`
      );
      return;
    }

    // 2) Buscar automação configurada
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
      console.log(
        `[handleCommentChange] Nenhuma automação p/ igUserId=${igUserId}`
      );
      return;
    }

    // ------------------------------------------------------
    // Verificações de mídia e/ou palavra-chave
    // ------------------------------------------------------
    if (!automacao.anyMediaSelected) {
      // se anyMediaSelected=false, precisa bater o ID exato
      if (media_id !== automacao.selectedMediaId) {
        console.log(
          "[handleCommentChange] Mídia do comentário não coincide com o selectedMediaId. Ignorando."
        );
        return;
      }
    }

    if (automacao.selectedOptionPalavra === "especifica") {
      // Se for 'especifica', confere se o commentText contém automacao.palavrasChave
      const palavrasChave = automacao.palavrasChave || "";
      if (
        !commentText.toLowerCase().includes(palavrasChave.toLowerCase())
      ) {
        console.log(
          "[handleCommentChange] Comentário não contém a palavra-chave. Ignorando."
        );
        return;
      }
    }

    // ------------------------------------------------------
    // Se chegou aqui, as condições bateram => Dispara a automação
    // ------------------------------------------------------

    // 1) Resposta pública no comentário (se configurado)
    if (automacao.responderPublico) {
      const publicReply =
        automacao.fraseBoasVindas || "Olá! Obrigado pelo seu comentário!";
      await replyPublicComment(comment_id, accessToken, publicReply);
    }

    // 2) Obter authorIgId para enviar DM
    const authorIgId = await getCommentAuthorId(comment_id, accessToken);
    if (!authorIgId) {
      console.log(
        "[handleCommentChange] Não foi possível obter o authorIgId, abortando DM."
      );
      return;
    }

    // 3) Enviar DM (template) com o "title" = automacao.DMreply
    //    e botão postback = automacao.quickReplyTexto
    if (automacao.quickReplyTexto && automacao.DMreply) {
      // Ex.: payload "ACT::ME_ENVIE_O_LINK"
      await sendTemplateMessage({
        igUserId,
        accessToken,
        recipientId: authorIgId,
        title: automacao.DMreply,
        buttonTitle: automacao.quickReplyTexto,
        buttonPayload: "ACT::ME_ENVIE_O_LINK",
      });
    }

    console.log(
      "[handleCommentChange] Automação finalizada (resposta pública + DM Template)!"
    );
  } catch (err) {
    console.error("[handleCommentChange] Erro:", err);
  }
}

/**
 * Lida com evento "messaging" (DM, postback etc.).
 *   - Se for postback com payload "ACT::ME_ENVIE_O_LINK", enviamos outro template
 *     com link (mensagemEtapa3 + linkEtapa3 + legendaBotaoEtapa3).
 */
async function handleMessageEvent(msgEvt: any, igUserId: string) {
  try {
    const senderId = msgEvt.sender?.id;
    const recipientId = msgEvt.recipient?.id;

    // Se "senderId" = "igUserId", estamos recebendo nossa própria mensagem
    if (senderId === igUserId) {
      console.log(
        "[handleMessageEvent] Ignorando mensagem pois foi enviada pelo próprio igUserId."
      );
      return;
    }

    // 1) Check se é postback
    if (msgEvt.postback) {
      // Ex.: "payload": "ACT::ME_ENVIE_O_LINK"
      const postbackPayload = msgEvt.postback.payload;
      console.log("[handleMessageEvent] Recebeu postback:", postbackPayload);

      // Buscar automação
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
        console.log(
          `[handleMessageEvent] Nenhuma automação p/ igUserId=${igUserId}`
        );
        return;
      }

      // Se for "ACT::ME_ENVIE_O_LINK", enviamos o Template com link
      if (postbackPayload === "ACT::ME_ENVIE_O_LINK") {
        const accessToken = await getInstagramUserToken(igUserId);
        if (!accessToken) {
          console.warn(
            `[handleMessageEvent] Falta token p/ igUserId=${igUserId}`
          );
          return;
        }

        const finalText =
          automacao.mensagemEtapa3 || "Aqui está o link que você pediu!";
        const finalUrl =
          automacao.linkEtapa3 || "https://meu-site.com.br";
        const finalTitle =
          automacao.legendaBotaoEtapa3 || "Acessar";

        // Mandar Template com botão web_url
        await sendTemplateLink({
          igUserId,
          accessToken,
          recipientId: senderId, // ID do usuário que clicou no postback
          title: finalText,
          url: finalUrl,
          urlButtonTitle: finalTitle,
        });

        console.log(
          "[handleMessageEvent] Enviou template com link (Etapa 3) com sucesso!"
        );
      }

      return;
    }

    // Se não for postback, pode ser message normal (texto), mas você disse que
    // quer replicar a estratégia do ManyChat, que foca em postbacks.
    // Deixamos aqui só um log:
    console.log("[handleMessageEvent] Mensagem sem postback, ignorando...");

  } catch (err: any) {
    console.error("[handleMessageEvent] Erro:", err.message);
  }
}

/**
 * Responde publicamente a um comentário do Instagram
 */
async function replyPublicComment(
  commentId: string,
  accessToken: string,
  mensagem: string
) {
  await axios.post(
    `${IG_GRAPH_API_BASE}/${commentId}/replies`,
    new URLSearchParams({
      message: mensagem,
      access_token: accessToken,
    })
  );
  console.log(
    `[replyPublicComment] Resposta pública no commentId=${commentId} enviada.`
  );
}

/**
 * Envia um Template genérico (tipo "generic") com um único 'element',
 * contendo TÍTULO e um BOTÃO do tipo postback.
 */
async function sendTemplateMessage({
  igUserId,
  accessToken,
  recipientId,
  title,
  buttonTitle,
  buttonPayload,
}: {
  igUserId: string;
  accessToken: string;
  recipientId: string;
  title: string;
  buttonTitle: string;
  buttonPayload: string;
}) {
  await axios.post(
    `${IG_GRAPH_API_BASE}/${igUserId}/messages`,
    {
      recipient: {
        id: recipientId,
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: title,
                buttons: [
                  {
                    type: "postback",
                    title: buttonTitle,
                    payload: buttonPayload,
                  },
                ],
              },
            ],
          },
        },
      },
    },
    {
      params: {
        access_token: accessToken,
      },
    }
  );
  console.log(
    `[sendTemplateMessage] Template com postback enviado p/ userId=${recipientId}.`
  );
}

/**
 * Envia um Template genérico (tipo "generic") com um único 'element',
 * contendo TÍTULO e um BOTÃO do tipo "web_url".
 * Ex.: Para mandar link do seu site.
 */
async function sendTemplateLink({
  igUserId,
  accessToken,
  recipientId,
  title,
  url,
  urlButtonTitle,
}: {
  igUserId: string;
  accessToken: string;
  recipientId: string;
  title: string;
  url: string;
  urlButtonTitle: string;
}) {
  await axios.post(
    `${IG_GRAPH_API_BASE}/${igUserId}/messages`,
    {
      recipient: {
        id: recipientId,
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: title,
                buttons: [
                  {
                    type: "web_url",
                    url: url,
                    title: urlButtonTitle,
                  },
                ],
              },
            ],
          },
        },
      },
    },
    {
      params: {
        access_token: accessToken,
      },
    }
  );
  console.log(
    `[sendTemplateLink] Template com link enviado p/ userId=${recipientId}.`
  );
}

/**
 * Busca o autor do comentário para poder mandar DM
 */
async function getCommentAuthorId(
  commentId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const resp = await axios.get(`${IG_GRAPH_API_BASE}/${commentId}`, {
      params: {
        fields: "from{id,username}",
        access_token: accessToken,
      },
    });
    return resp.data?.from?.id || null;
  } catch (err) {
    console.error(
      "[getCommentAuthorId] Erro ao buscar autor:",
      (err as any)?.message
    );
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
  console.error(
    `[InstagramWebhookWorker] Job falhou: id=${job?.id}, Erro: ${err.message}`
  );
});

instagramWebhookWorker.on("error", (err) => {
  console.error("[InstagramWebhookWorker] Erro no worker:", err);
});

console.log(
  `[InstagramWebhookWorker] Worker inicializado e aguardando jobs na fila "${INSTAGRAM_WEBHOOK_QUEUE_NAME}"...`
);
