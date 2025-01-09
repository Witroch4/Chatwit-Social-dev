// worker/instagram-webhook.worker.ts

import { Worker, Job } from "bullmq";
import axios from "axios";
import dotenv from "dotenv";
import { connection } from "@/lib/redis";
import {
  INSTAGRAM_WEBHOOK_QUEUE_NAME,
  IInstagramWebhookJobData,
} from "@/lib/queue/instagram-webhook.queue";
import { prisma } from "@/lib/prisma"; // Para buscar as automações do DB
import { getInstagramUserToken } from "@/lib/instagram-auth";
// ^-- Implemente essa função para recuperar o access_token do seu usuário do IG

dotenv.config();

/**
 * Base da Graph API para Instagram.
 * Pode vir do .env ou ser fixo (ex.: "https://graph.facebook.com/v17.0")
 */
const IG_GRAPH_API_BASE = process.env.IG_GRAPH_API_BASE || "https://graph.facebook.com/v17.0";

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

      // Percorremos cada "entry" (pode ter múltiplas notificações em um só POST)
      for (const event of entry) {
        const igUserId = event.id; // IG User ID do dono da conta
        // const time = event.time;

        // changes ou messaging (depende do "formato" do webhook)
        // Com 'include values' no Webhooks, tende a vir em "changes" para comments/mentions
        // Mas para 'messages', vem em um array "messaging".

        if (event.changes) {
          for (const change of event.changes) {
            const { field, value } = change;
            switch (field) {
              case "comments":
                // Ex.: { comment_id, media_id, text, username, ... }
                await handleCommentChange(value, igUserId);
                break;
              default:
                console.warn(`[InstagramWebhookWorker] Campo não tratado: ${field}`);
            }
          }
        }

        if (event.messaging) {
          // Esse é o formato do "messages" event
          // Ex.: event.messaging = [ { sender: {...}, recipient: {...}, ... } ]
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
 */
async function handleCommentChange(value: any, igUserId: string) {
  try {
    const { comment_id, media_id, text: commentText = "", username = "" } = value;

    // 1) Encontrar o token do dono da conta no seu sistema
    //    (Ele que habilitou a automação no front)
    const accessToken = await getInstagramUserToken(igUserId);
    if (!accessToken) {
      console.warn(`[handleCommentChange] Não encontrei token para IG_user_id=${igUserId}`);
      return;
    }

    // 2) Buscar do Prisma a automação cadastrada para esse usuário IG
    //    Você pode ter várias automações, mas aqui assumo apenas 1 "ativa".
    //    Ajuste conforme seu modelo/suas regras.
    const automacao = await prisma.automacao.findFirst({
      where: {
        // user.providerAccountId = igUserId
        // ... Mas depende de como você relacionou.
        user: { providerAccountId: igUserId },
      },
    });
    if (!automacao) {
      console.log(`[handleCommentChange] Nenhuma automação configurada para IG_user_id=${igUserId}`);
      return;
    }

    // 3) Verificar se automação é para "qualquer" mídia ou para uma mídia específica
    const isMediaOk =
      automacao.anyMediaSelected || // se "qualquer"
      (automacao.selectedMediaId && automacao.selectedMediaId === media_id);

    if (!isMediaOk) {
      console.log("[handleCommentChange] Mídia não corresponde à automação configurada.");
      return;
    }

    // 4) Verificar se o comentário bate com as palavras-chave (se "especifica")
    let matchKeywords = true; // default (se for "qualquer")
    if (automacao.selectedOptionPalavra === "especifica" && automacao.palavrasChave) {
      // Ex.: automacao.palavrasChave = "Preço, link, comprar"
      const keywords = automacao.palavrasChave
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      // Checar se pelo menos um dos gatilhos existe no texto do comentário
      matchKeywords = keywords.some((k) => commentText.toLowerCase().includes(k));
    }

    if (!matchKeywords) {
      console.log("[handleCommentChange] Comentário não bateu com o gatilho de palavra-chave.");
      return;
    }

    // 5) Se `responderPublico`, mandar reply no próprio comentário (opcional).
    if (automacao.responderPublico) {
      await replyPublicComment(comment_id, accessToken, automacao.fraseBoasVindas || "");
    }

    // 6) Enviar DM de boas-vindas (Etapa 2).
    //    *** Aqui há 2 caminhos:
    //    A) Private Reply vinculada ao comentário (dentro de 7 dias ou se live, durante a live).
    //    B) Iniciar DM normal.
    //    O "Private Reply" é uma feature que manda a mensagem para o "Requests" ou "Inbox".
    //    Documentação: https://developers.facebook.com/docs/messenger-platform/instagram/features/private-replies
    //    Exemplo:
    await sendPrivateReply(
      igUserId,
      accessToken,
      comment_id,
      automacao.fraseBoasVindas || "Olá! Recebemos seu comentário 😊"
    );

    // 7) Enviar QuickReply no final (opcional).
    //    Para Quick Replies, precisamos mandar de forma "normal DM" (recipient.id).
    //    Para isso, precisamos do "IG Scoped ID" do autor do comentário.
    //    O "author ID" nem sempre vem no value. Se não vier, precisamos buscar via API.
    //    A depender da permissão, podemos buscar com: GET /<comment_id>?fields=username,from{id}
    //    A doc do "comments" event, na maioria dos casos, retorna algo como "from": { id }.
    //    Abaixo, demonstro como buscar (caso precise).
    const authorIgId = await getCommentAuthorId(comment_id, accessToken);

    //    Se quisermos mandar um QuickReply DM "comum":
    //    (metade das vezes, é preciso que o usuário já tenha mandado DM pra conta.
    //     senão, talvez só o "PrivateReply" seja permitido.)
    if (authorIgId && automacao.quickReplyTexto) {
      await sendDMWithQuickReply({
        recipientId: authorIgId,
        accessToken,
        text: automacao.fraseBoasVindas || "Olá! Obrigado pelo seu comentário!",
        quickReplyLabel: automacao.quickReplyTexto,
      });
    }

  } catch (err: any) {
    console.error("[handleCommentChange] Erro:", err.message);
  }
}

/**
 * Lida com evento de "messages" (DM).
 * Se detectarmos que é uma quick_reply (payload), enviamos a Etapa 3 (link).
 */
async function handleMessageEvent(msgEvt: any, igUserId: string) {
  try {
    const senderId = msgEvt.sender?.id;
    const recipientId = msgEvt.recipient?.id;

    // Se for o "quick reply"
    const quickReplyPayload = msgEvt.message?.quick_reply?.payload;

    if (!quickReplyPayload) {
      // Pode ser uma DM normal ou outro tipo de mensagem
      console.log("[handleMessageEvent] Mensagem sem quick_reply payload, ignorando...");
      return;
    }

    // Buscar automação do BD novamente
    const automacao = await prisma.automacao.findFirst({
      where: { user: { providerAccountId: igUserId } },
    });
    if (!automacao) {
      console.log(`[handleMessageEvent] Nenhuma automação p/ IG_user_id=${igUserId}`);
      return;
    }

    // Se for o payload que representa a "etapa 2" -> "Me envie o link"
    // (Você pode definir no front o "payload" do quickReply como "pedir_link" ou algo assim)
    // ou comparar com automacao.quickReplyTexto
    // Deixarei fixo "ME_ENVIE_O_LINK" só para exemplificar
    if (quickReplyPayload === "ME_ENVIE_O_LINK") {
      // Mandar a Etapa 3: DM com o link
      const accessToken = await getInstagramUserToken(igUserId);
      if (!accessToken) {
        console.warn(`[handleMessageEvent] Falta token p/ IG_user_id=${igUserId}`);
        return;
      }

      // Enviar a mensagem com o link
      await sendDirectMessage({
        accessToken,
        igUserId,
        recipientId: senderId,
        text: automacao.mensagemEtapa3 || "Aqui está o link que você pediu!",
        button: {
          url: automacao.linkEtapa3 || "https://minha-loja.com.br",
          title: automacao.legendaBotaoEtapa3 || "Visite o nosso site",
        },
      });
    }
  } catch (err: any) {
    console.error("[handleMessageEvent] Erro:", err.message);
  }
}

/**
 * Exemplo de função para responder publicamente no comentário
 */
async function replyPublicComment(commentId: string, accessToken: string, mensagem: string) {
  await axios.post(
    `${IG_GRAPH_API_BASE}/${commentId}/replies`,
    new URLSearchParams({
      message: mensagem,
      access_token: accessToken,
    }),
  );
  console.log(`[replyPublicComment] Resposta pública enviada no commentId=${commentId}.`);
}

/**
 * Exemplo de "Private Reply" a um comentário.
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
  console.log(`[sendPrivateReply] PrivateReply enviado para commentId=${commentId}.`);
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
  // Nesse caso, é a rota /<IG_PRO_USER_ID>/messages com "recipient.id"
  // Precisamos saber o IG User ID da conta do "dono".
  // Supondo que o "recipientId" seja o do seguidor, e iremos usar `me/messages`.
  // Mas a doc recomenda usar `<IG_PRO_USER_ID>/messages`.

  // O "messaging_type" = "RESPONSE" ou "UPDATE" (depende do caso).
  // "quick_replies": máx. 13, com "content_type":"text".
  await axios.post(
    `${IG_GRAPH_API_BASE}/me/messages`, // ou `${IG_GRAPH_API_BASE}/${igUserId}/messages`
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
  console.log(`[sendDMWithQuickReply] QuickReply enviado para userId=${recipientId}.`);
}

/**
 * Envia uma mensagem direta (com ou sem botão).
 * Caso queira mandar "botão" com link, não é "quick_replies";
 * em Instagram, rola mandar "text" + "cta button" ou link.
 * Exemplo adaptado do Messenger "template", mas no Instagram
 * tem limitações diferentes.
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
  // Se quisermos mandar um "template" com link (no Messenger), é algo do
  // type: "button". No Instagram, no momento, a exibição de botões é diferente.
  // A doc oficial do Instagram "private replies" não dá 100% de suporte
  // a botões de URL. Então você pode mandar apenas o link no texto.
  //
  // Se você quiser mandar um "quick reply" com link,
  // a doc oficial: https://developers.facebook.com/docs/messenger-platform/instagram/features/quick-replies
  //
  // Exemplo simples: mandar o link no corpo do texto.
  let finalText = text;
  if (button) {
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

  console.log(`[sendDirectMessage] DM enviada para userId=${recipientId}.`);
}

/**
 * Exemplo de função para obter o autor do comentário, caso "username" não baste.
 * Precisamos do "from.id" => o IG Scoped ID do autor (para mandar DM).
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

// Eventos de debug
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
