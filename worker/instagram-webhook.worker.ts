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
 * Ajuste se necessário para a versão do Graph API
 */
const IG_GRAPH_API_BASE =
  process.env.IG_GRAPH_API_BASE || "https://graph.instagram.com/v21.0"

export const instagramWebhookWorker = new Worker<IInstagramWebhookJobData>(
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

      for (const event of entry) {
        const igUserId = event.id // ex.: "1784..."

        // 1) Se veio "changes", é comentário em post/reel
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

        // 2) Se veio "messaging", é DM ou postback
        if (event.messaging) {
          for (const msgEvt of event.messaging) {
            await handleMessageEvent(msgEvt, igUserId)
          }
        }
      }

      console.log("[InstagramWebhookWorker] Evento(s) processado(s) com sucesso!")
    } catch (error: any) {
      console.error("[InstagramWebhookWorker] Erro ao processar evento:", error.message)
      throw error
    }
  },
  { connection }
)

/**
 * Trata comentários em posts ou reels.
 */
async function handleCommentChange(value: any, igUserId: string) {
  try {
    const { id: comment_id, text: commentText = "", from, media } = value
    const media_id = media?.id

    console.log(
      `[handleCommentChange] Recebido comentário. media_id=${media_id}, text=${commentText}`
    )

    // Ignora comentário do próprio dono da conta
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

    // 2) Buscar TODAS as automações deste igUserId
    const automacoes = await prisma.automacao.findMany({
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

    if (!automacoes || automacoes.length === 0) {
      console.log(`[handleCommentChange] Nenhuma automação p/ igUserId=${igUserId}`)
      return
    }

    // 3) Verificar qual automação "bate" com este comentário
    function matchesComment(automacao: any) {
      // Verifica palavra-chave
      if (automacao.selectedOptionPalavra === "especifica") {
        const palavrasChave = automacao.palavrasChave?.toLowerCase() || ""
        // Se preferir, faça split em várias palavras e teste cada.
        // Aqui está simplificado, assumindo que "palavrasChave" é substring.
        if (!commentText.toLowerCase().includes(palavrasChave)) {
          return false
        }
      }
      // Verifica mídia
      if (automacao.anyMediaSelected) {
        return true
      } else {
        return media_id === automacao.selectedMediaId
      }
    }

    // Separa quem tem mídia específica e quem aceita qualquer mídia
    const midiaEspecifica = automacoes.filter(
      (a) => !a.anyMediaSelected && a.selectedMediaId && matchesComment(a)
    )
    const midiaQualquer = automacoes.filter(
      (a) => a.anyMediaSelected && matchesComment(a)
    )

    let automacaoQueBate = midiaEspecifica.length > 0 ? midiaEspecifica[0] : undefined
    if (!automacaoQueBate && midiaQualquer.length > 0) {
      automacaoQueBate = midiaQualquer[0]
    }

    if (!automacaoQueBate) {
      console.log("[handleCommentChange] Nenhuma automação bateu com mídia/palavra.")
      return
    }

    // (1) Se automação configurada para responder publicamente
    if (automacaoQueBate.responderPublico) {
      const randomReply = pickRandomPublicReply(automacaoQueBate.publicReply)
      await replyPublicComment(comment_id, accessToken, randomReply)
    }

    // (2) Se houver DM de boas-vindas configurada, envia "private reply" com botão
    if (automacaoQueBate.fraseBoasVindas && automacaoQueBate.quickReplyTexto) {
      // Agora o "payload" vem do BD: automacaoQueBate.buttonPayload
      // Ex.: "WIT-EQ:b38ff768...".
      await sendPrivateReplyWithButton({
        igUserId,
        accessToken,
        commentId: comment_id,
        text: automacaoQueBate.fraseBoasVindas,
        buttonTitle: automacaoQueBate.quickReplyTexto,
        buttonPayload: automacaoQueBate.buttonPayload, // <--- AQUI a mudança principal
      })
    }

    console.log("[handleCommentChange] Automação finalizada com sucesso!")
  } catch (err) {
    console.error("[handleCommentChange] Erro:", err)
  }
}

/**
 * Trata eventos de mensagem (DM) e postback.
 */
async function handleMessageEvent(msgEvt: any, igUserId: string) {
  try {
    const senderId = msgEvt.sender?.id
    if (senderId === igUserId) {
      console.log("[handleMessageEvent] Ignorando msg do próprio igUserId.")
      return
    }

    // Se for um postback (botão clicado)
    if (msgEvt.postback) {
      const postbackPayload = msgEvt.postback.payload
      console.log("[handleMessageEvent] Recebeu postback:", postbackPayload)

      // Vamos procurar se existe ALGUMA automação que tenha esse buttonPayload
      // e pertença ao mesmo usuário (igUserId).
      // (Se quiser, pode usar findMany e iterar; aqui iremos no findFirst.)
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
          buttonPayload: postbackPayload, // <--- Procuramos a automação cujo payload bateu
        },
      })

      if (!automacao) {
        console.log(
          `[handleMessageEvent] Nenhuma automação achada para payload=${postbackPayload}`
        )
        return
      }

      // Achamos a automação, então pegamos o token e enviamos a segunda DM
      const accessToken = await getInstagramUserToken(igUserId)
      if (!accessToken) {
        console.warn(`[handleMessageEvent] Sem token p/ igUserId=${igUserId}`)
        return
      }

      // Mensagem da Etapa 3
      const textEtapa3 =
        automacao.mensagemEtapa3 || "Obrigado por ter respondido, segue nosso link."
      const link = automacao.linkEtapa3 || "https://seu-site.com.br"
      const linkTitle = automacao.legendaBotaoEtapa3 || "Acessar Link"

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

      return
    }

    // Se não for postback => ignorar ou tratar DMs livres
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
              payload: buttonPayload, // <-- Usando o 'buttonPayload' salvo no BD
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
                  type: "web_url",
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

/** Logs do BullMQ */
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
