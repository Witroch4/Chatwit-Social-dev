// worker/instagram-webhook.worker.ts

import { Worker, Job } from "bullmq"
import axios from "axios"
import dotenv from "dotenv"
import { connection } from "@/lib/redis"
import {
  INSTAGRAM_WEBHOOK_QUEUE_NAME,
  IInstagramWebhookJobData,
} from "@/lib/queue/instagram-webhook.queue"
import { prisma } from "@/lib/prisma"
import { getInstagramUserToken } from "@/lib/instagram-auth"

dotenv.config()

/**
 * Esta base de API normalmente é a do Messenger/Instagram Graph.
 * Ajuste conforme sua versão/endpoint:
 *   ex: "https://graph.instagram.com/v21.0"
 */
const IG_GRAPH_API_BASE =
  process.env.IG_GRAPH_API_BASE || "https://graph.instagram.com/v21.0"

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
      )

      const { object, entry } = job.data

      if (object !== "instagram") {
        console.warn(`[InstagramWebhookWorker] Objeto não suportado: ${object}`)
        return
      }

      // Percorre cada "event" em entry
      for (const event of entry) {
        const igUserId = event.id // ex.: "1784..."

        // 1) Se veio "changes", normalmente é comentário em post/reel
        if (event.changes) {
          for (const change of event.changes) {
            const { field, value } = change
            if (field === "comments") {
              await handleCommentChange(value, igUserId)
            } else {
              console.warn(`[InstagramWebhookWorker] Field não tratado: ${field}`)
            }
          }
        }

        // 2) Se veio "messaging", normalmente é DM ou postback
        if (event.messaging) {
          for (const msgEvt of event.messaging) {
            await handleMessageEvent(msgEvt, igUserId)
          }
        }
      }

      console.log("[InstagramWebhookWorker] Evento(s) processado(s) com sucesso!")
    } catch (error: any) {
      console.error("[InstagramWebhookWorker] Erro ao processar evento:", error.message)
      throw error // BullMQ re-tentará se der erro
    }
  },
  { connection }
)

/**
 * Trata comentários em posts ou reels.
 * - Verifica se a automação está configurada p/ responder esse comentário
 * - Se sim, publica uma resposta pública (random de `publicReply`) e
 *   envia DM no formato de Private Reply com Button Template
 *   contendo `fraseBoasVindas` e o botão `quickReplyTexto`.
 */
async function handleCommentChange(value: any, igUserId: string) {
  try {
    const { id: comment_id, text: commentText = "", from, media } = value
    const media_id = media?.id

    console.log(
      `[handleCommentChange] Recebido comentário. media_id=${media_id}, text=${commentText}`
    )

    // Evitar loop se o autor do comentário é o próprio igUserId
    if (from?.id === igUserId) {
      console.log("[handleCommentChange] Ignorando comentário do próprio igUserId.")
      return
    }

    // 1) Obter token p/ esse igUserId
    const accessToken = await getInstagramUserToken(igUserId)
    if (!accessToken) {
      console.warn(`[handleCommentChange] Token não encontrado p/ igUserId=${igUserId}`)
      return
    }

    // 2) Buscar automação (relacionada ao user que tem account.igUserId=igUserId)
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
    })
    if (!automacao) {
      console.log(`[handleCommentChange] Nenhuma automação p/ igUserId=${igUserId}`)
      return
    }

    // ------------------------------------------------------
    // Filtrar por "anyMediaSelected" e "selectedMediaId"
    // ------------------------------------------------------
    if (!automacao.anyMediaSelected) {
      // se false, então deve bater ID exato
      if (media_id !== automacao.selectedMediaId) {
        console.log("[handleCommentChange] Mídia != selectedMediaId. Ignorando.")
        return
      }
    }

    // ------------------------------------------------------
    // Se "selectedOptionPalavra" = "especifica", checar "palavrasChave"
    // ------------------------------------------------------
    if (automacao.selectedOptionPalavra === "especifica") {
      const palavras = automacao.palavrasChave || ""
      // Exemplo simples: .includes() no texto
      if (!commentText.toLowerCase().includes(palavras.toLowerCase())) {
        console.log("[handleCommentChange] Comentário sem a palavra-chave. Ignorando.")
        return
      }
    }

    // ------------------------------------------------------
    // Se chegou aqui, dispara a automação
    // ------------------------------------------------------

    // (1) Resposta pública (se "responderPublico" estiver true)
    if (automacao.responderPublico) {
      const randomReply = pickRandomPublicReply(automacao.publicReply)
      await replyPublicComment(comment_id, accessToken, randomReply)
    }

    // (2) Enviar Private Reply em formato de Button Template
    //     se "fraseBoasVindas" e "quickReplyTexto" estiverem configurados
    if (automacao.fraseBoasVindas && automacao.quickReplyTexto) {
      // Enviar a mensagem de boas-vindas (text) e um único botão
      // "comment_id" => Private Reply atrelada ao comentário original
      await sendPrivateReplyWithButton({
        igUserId,
        accessToken,
        commentId: comment_id,
        text: automacao.fraseBoasVindas,
        buttonTitle: automacao.quickReplyTexto,
        buttonPayload: "ACT::ME_ENVIE_O_LINK",
      })
    }

    console.log("[handleCommentChange] Automação finalizada com sucesso!")
  } catch (err) {
    console.error("[handleCommentChange] Erro:", err)
  }
}

/**
 * Trata eventos de mensagem (DM) e postback.
 * - Se o payload = "ACT::ME_ENVIE_O_LINK", enviamos 2ª DM c/ linkEtapa3
 */
async function handleMessageEvent(msgEvt: any, igUserId: string) {
  try {
    const senderId = msgEvt.sender?.id

    // Se "senderId" = "igUserId", ignorar (evitar loop do bot respondendo a si mesmo)
    if (senderId === igUserId) {
      console.log("[handleMessageEvent] Ignorando msg do próprio igUserId.")
      return
    }

    // Se for postback
    if (msgEvt.postback) {
      const postbackPayload = msgEvt.postback.payload
      console.log("[handleMessageEvent] Recebeu postback:", postbackPayload)

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
      })
      if (!automacao) {
        console.log(`[handleMessageEvent] Nenhuma automação p/ igUserId=${igUserId}`)
        return
      }

      // Se for "ACT::ME_ENVIE_O_LINK", mandamos o link da Etapa 3
      if (postbackPayload === "ACT::ME_ENVIE_O_LINK") {
        const accessToken = await getInstagramUserToken(igUserId)
        if (!accessToken) {
          console.warn(`[handleMessageEvent] Sem token p/ igUserId=${igUserId}`)
          return
        }

        const textEtapa3 =
          automacao.mensagemEtapa3 || "Essa é uma resposta pois você clicou em Me envie o link!"
        const link = automacao.linkEtapa3 || "https://seu-site.com.br"
        const linkTitle = automacao.legendaBotaoEtapa3 || "Seguir Link"

        // Enviar template com botão do tipo "web_url"
        await sendTemplateLink({
          igUserId,
          accessToken,
          recipientId: senderId,
          title: textEtapa3,
          url: link,
          urlButtonTitle: linkTitle,
        })

        console.log("[handleMessageEvent] Enviou template da Etapa 3 (link).")
      }
      return
    }

    // Caso não seja postback => ignorar
    console.log("[handleMessageEvent] Mensagem sem postback, ignorando...")
  } catch (err: any) {
    console.error("[handleMessageEvent] Erro:", err.message)
  }
}

/**
 * Responde publicamente a um comentário
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
  )
  console.log(
    `[replyPublicComment] Resposta pública enviada ao commentId=${commentId}.`
  )
}

/**
 * Escolhe aleatoriamente uma frase de `publicReply` ou retorna fallback
 */
function pickRandomPublicReply(publicReply?: string | null): string {
  let frases: string[] = []
  if (publicReply) {
    try {
      const arr = JSON.parse(publicReply)
      if (Array.isArray(arr) && arr.length > 0) {
        frases = arr
      }
    } catch (err) {
      console.warn("[pickRandomPublicReply] Erro ao parsear JSON de publicReply.")
    }
  }

  if (frases.length === 0) {
    return "Olá! Eu te mandei uma mensagem privada, dá uma olhada! ✅"
  }

  const randomIndex = Math.floor(Math.random() * frases.length)
  return frases[randomIndex]
}

/**
 * Envia uma Private Reply no formato de "Button Template".
 * - `commentId` é obrigatório para amarrar ao comentário.
 * - `text` é o texto principal (ex.: automacao.fraseBoasVindas).
 * - `buttonTitle` e `buttonPayload` definem o botão "postback".
 */
async function sendPrivateReplyWithButton({
  igUserId,
  accessToken,
  commentId,
  text,
  buttonTitle,
  buttonPayload,
}: {
  igUserId: string
  accessToken: string
  commentId: string
  text: string
  buttonTitle: string
  buttonPayload: string
}) {
  const body = {
    recipient: {
      comment_id: commentId, // Private Reply
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: [
            {
              type: "postback",
              title: buttonTitle,
              payload: buttonPayload,
            },
          ],
        },
      },
    },
  }

  await axios.post(`${IG_GRAPH_API_BASE}/${igUserId}/messages`, body, {
    params: { access_token: accessToken },
  })
  console.log(
    `[sendPrivateReplyWithButton] Button Template enviado ao commentId=${commentId}.`
  )
}

/**
 * Manda um "template" com botão "web_url" (ex.: para mandar link).
 * Usado após o postback "ACT::ME_ENVIE_O_LINK".
 */
async function sendTemplateLink({
  igUserId,
  accessToken,
  recipientId,
  title,
  url,
  urlButtonTitle,
}: {
  igUserId: string
  accessToken: string
  recipientId: string
  title: string
  url: string
  urlButtonTitle: string
}) {
  const body = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title,
              buttons: [
                {
                  type: "web_url", // ou "open_url"
                  url,
                  title: urlButtonTitle,
                },
              ],
            },
          ],
        },
      },
    },
  }

  await axios.post(`${IG_GRAPH_API_BASE}/${igUserId}/messages`, body, {
    params: { access_token: accessToken },
  })
  console.log(
    `[sendTemplateLink] Template com link enviado p/ userId=${recipientId}.`
  )
}

// Eventos de debug do BullMQ
instagramWebhookWorker.on("active", (job) => {
  console.log(`[InstagramWebhookWorker] Job ativo: id=${job.id}`)
})
instagramWebhookWorker.on("completed", (job) => {
  console.log(`[InstagramWebhookWorker] Job concluído: id=${job.id}`)
})
instagramWebhookWorker.on("failed", (job, err) => {
  console.error(
    `[InstagramWebhookWorker] Job falhou: id=${job?.id}, Erro: ${err.message}`
  )
})
instagramWebhookWorker.on("error", (err) => {
  console.error("[InstagramWebhookWorker] Erro no worker:", err)
})

console.log(
  `[InstagramWebhookWorker] Iniciado e aguardando jobs na fila "${INSTAGRAM_WEBHOOK_QUEUE_NAME}"...`
)
