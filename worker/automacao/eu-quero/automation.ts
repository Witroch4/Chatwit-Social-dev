// worker/automacao/eu-quero/automation.ts
import axios from "axios";
import { prisma } from "@/lib/prisma";  // Ajuste o caminho conforme seu projeto
import { getInstagramUserToken } from "@/lib/instagram-auth";

/**
 * Exemplo de import do Bull. Você pode ter algo como:
 *   import { Queue } from "bullmq";
 *   export const followUpQueue = new Queue("contato-sem-clique", { connection: redisConnection });
 */
import { followUpQueue } from "@/worker/queues/followUpQueue"; // Exemplo (você deve implementar)

// Constante base da Graph API do IG
const IG_GRAPH_API_BASE = process.env.IG_GRAPH_API_BASE || "https://graph.instagram.com/v21.0";

/**
 * Função principal que recebe o webhook e despacha para handleCommentChange() ou handleMessageEvent().
 */
export async function handleInstagramWebhook(data: any) {
  const { object, entry } = data;
  if (object !== "instagram") {
    console.warn("[handleInstagramWebhook] Objeto não suportado:", object);
    return;
  }
  for (const event of entry) {
    const igUserId = event.id;
    // 1) Se for "changes" => comentários
    if (event.changes) {
      for (const change of event.changes) {
        if (change.field === "comments") {
          await handleCommentChange(change.value, igUserId);
        }
      }
    }
    // 2) Se for "messaging" => DM/postback
    if (event.messaging) {
      for (const msgEvt of event.messaging) {
        await handleMessageEvent(msgEvt, igUserId);
      }
    }
  }
}

/**
 * 1) Trata Comentários:
 *    - Verifica se automacao.anyMediaSelected ou if (effectiveMediaId == selectedMediaId).
 *    - Se automacao.anyword for true, não checa palavras específicas. Caso contrário, checa `palavrasChave`.
 *    - Se responderPublico, manda reply no comentário.
 *    - Se fraseBoasVindas/quickReplyTexto, manda private reply com botão.
 *    - Se contatoSemClique = true, agenda job (Bull) para mandar msg 1h depois caso não clique.
 */
async function handleCommentChange(value: any, igUserId: string) {
  try {
    const { id: commentId, text: commentText = "", from, media } = value;
    const mediaId = media?.id;
    const originalMediaId = media?.original_media_id;
    const effectiveMediaId = originalMediaId || mediaId;

    console.log(`[handleCommentChange] Comentário: media=${mediaId}, text="${commentText}"`);

    // Ignora se for o dono da conta
    if (from?.id === igUserId) {
      console.log("[handleCommentChange] Ignorando comentário do próprio igUserId.");
      return;
    }

    // Token
    const accessToken = await getInstagramUserToken(igUserId);
    if (!accessToken) {
      console.warn("[handleCommentChange] Sem token p/ igUserId=", igUserId);
      return;
    }

    // Buscar automações ativas
    const automacoes = await prisma.automacao.findMany({
      where: {
        user: { accounts: { some: { provider: "instagram", igUserId } } },
        live: true,
      },
    });
    if (!automacoes.length) {
      console.log("[handleCommentChange] Nenhuma automação ativa p/ igUserId=", igUserId);
      return;
    }

    // Função para ver se comentario bate com a automacao
    function matches(automacao: any) {
      // 1) Checa se anyMediaSelected ou mediaId == selectedMediaId
      if (!automacao.anyMediaSelected) {
        if (effectiveMediaId !== automacao.selectedMediaId) return false;
      }
      // 2) Checa if automacao.anyword ou se text incl. automacao.palavrasChave
      if (!automacao.anyword) {
        const kw = automacao.palavrasChave?.toLowerCase() || "";
        if (!commentText.toLowerCase().includes(kw)) return false;
      }
      return true;
    }

    const matchList = automacoes.filter(matches);
    if (!matchList.length) {
      console.log("[handleCommentChange] Nenhuma automação correspondeu.");
      return;
    }

    // Pega a primeira
    const automacao = matchList[0];

    // Se responderPublico
    if (automacao.responderPublico) {
      const pubMsg = pickRandomPublicReply(automacao.publicReply);
      await replyPublicComment(commentId, accessToken, pubMsg);
    }

    // Se fraseBoasVindas + quickReplyTexto => private reply (com postback)
    if (automacao.fraseBoasVindas && automacao.quickReplyTexto) {
      await sendPrivateReplyWithButton({
        igUserId,
        accessToken,
        commentId,
        text: automacao.fraseBoasVindas,
        buttonTitle: automacao.quickReplyTexto,
        buttonPayload: automacao.buttonPayload,
      });
    }

    // Se automacao.contatoSemClique = true => Agenda job p/ 1h depois
    if (automacao.contatoSemClique) {
      // Precisamos criar/atualizar Lead + LeadAutomacao
      const senderId = from.id;
      // Cria Lead se não existir
      let lead = await prisma.lead.findUnique({ where: { igSenderId: senderId } });
      if (!lead) {
        lead = await prisma.lead.create({ data: { igSenderId: senderId } });
      }
      // Cria LeadAutomacao se não existir
      let la = await prisma.leadAutomacao.findUnique({
        where: {
          leadIgSenderId_automacaoId: {
            leadIgSenderId: lead.igSenderId,
            automacaoId: automacao.id,
          },
        },
      });
      if (!la) {
        la = await prisma.leadAutomacao.create({
          data: {
            leadIgSenderId: lead.igSenderId,
            automacaoId: automacao.id,
            linkSent: false,
            waitingForEmail: false,
          },
        });
      }

      // Adicionamos um job na fila "contato-sem-clique" para disparar daqui a 1h
      await followUpQueue.add(
        "noClickFollowUp", // Nome do job
        {
          leadId: lead.igSenderId,
          automacaoId: automacao.id,
          quickReplyTexto: automacao.quickReplyTexto,
          followUpMsg:
            automacao.noClickPrompt ||
            "🔥 Quer saber mais? Então não esquece de clicar no link aqui embaixo!",
        },
        { delay: 3600000 } // 1 hora = 3600 * 1000 ms
      );
      console.log("[handleCommentChange] Job agendado p/ contatoSemClique em 1h.");
    }

    console.log("[handleCommentChange] OK, automacaoId =", automacao.id);
  } catch (err) {
    console.error("[handleCommentChange] Erro:", err);
    throw err;
  }
}

/**
 * 2) Trata Mensagens (DM) e Postbacks.
 *    - Se postback => checa se automacao pede para seguir (pedirParaSeguirPro); se sim, procede direto (pois assumimos o usuário segue).
 *    - Se pedirEmailPro, checa email. Se não tem => waitingForEmail. Se tem => envia link.
 *    - Se for texto => se waitingForEmail, salva e-mail e envia link.
 *    - Se clicou no quickReply => cancela job "contatoSemClique" (se implementar).
 */
async function handleMessageEvent(msgEvt: any, igUserId: string) {
  try {
    // Ignora mensagens de echo
    if (msgEvt.message?.is_echo) {
      console.log("[handleMessageEvent] ignoring echo");
      return;
    }
    const senderId = msgEvt.sender?.id;
    if (!senderId || senderId === igUserId) return;

    const accessToken = await getInstagramUserToken(igUserId);
    if (!accessToken) return;

    // Verifica se é postback ou quick_reply
    const postbackPayload = msgEvt.postback?.payload || msgEvt.message?.quick_reply?.payload;
    if (postbackPayload) {
      console.log("[handleMessageEvent] Detected postback or quick_reply, payload =", postbackPayload);

      // Busca a automação que possui o mesmo buttonPayload
      const automacao = await prisma.automacao.findFirst({
        where: {
          user: { accounts: { some: { provider: "instagram", igUserId } } },
          buttonPayload: postbackPayload,
          live: true,
        },
      });
      if (!automacao) {
        console.log("[handleMessageEvent] automacao não encontrada para payload =", postbackPayload);
        return;
      }

      // Cria ou pega o Lead
      let lead = await prisma.lead.findUnique({ where: { igSenderId: senderId } });
      if (!lead) {
        lead = await prisma.lead.create({ data: { igSenderId: senderId } });
      }

      // Cria ou pega o LeadAutomacao
      let la = await prisma.leadAutomacao.findUnique({
        where: {
          leadIgSenderId_automacaoId: {
            leadIgSenderId: lead.igSenderId,
            automacaoId: automacao.id,
          },
        },
      });
      if (!la) {
        la = await prisma.leadAutomacao.create({
          data: {
            leadIgSenderId: lead.igSenderId,
            automacaoId: automacao.id,
          },
        });
      }

      // Se houver job agendado, você pode cancelar aqui (ex: followUpQueue.remove(la.followUpJobId))

      // 1.1) Se a automação pede para seguir (pedirParaSeguirPro),
      // vamos simplesmente continuar assumindo que o usuário segue
      if (automacao.pedirParaSeguirPro) {
        console.log("[handleMessageEvent] Supondo que o usuário segue a conta (FORÇANDO TRUE).");
        // Aqui, em vez de checar, pulamos direto para próxima lógica
      }

      // 1.2) Se a automação pede email
      if (automacao.pedirEmailPro) {
        if (!lead.email) {
          // Marca a automação como aguardando e-mail e solicita o e-mail
          await prisma.leadAutomacao.update({
            where: { id: la.id },
            data: { waitingForEmail: true },
          });
          const prompt = automacao.emailPrompt || "Por favor, informe seu e-mail:";
          await sendEmailRequestMessage({
            igUserId,
            accessToken,
            recipientId: senderId,
            emailPrompt: prompt,
          });
          return;
        } else {
          // Se já possui e-mail, envia o link
          await sendLinkForAutomacao(lead, automacao, accessToken, igUserId);
          return;
        }
      }

      // 1.3) Se não há solicitação de e-mail, envia o link diretamente
      await sendLinkForAutomacao(lead, automacao, accessToken, igUserId);
      return;
    }

    // 2) Se for mensagem de texto normal (sem postback/quick_reply)
    const text = msgEvt.message?.text || "";
    if (!text) return;

    // Procura pelo Lead
    const lead = await prisma.lead.findUnique({ where: { igSenderId: senderId } });
    if (!lead) return;

    // Busca automações que estão aguardando e-mail para esse Lead
    const waitingList = await prisma.leadAutomacao.findMany({
      where: { leadIgSenderId: lead.igSenderId, waitingForEmail: true },
    });
    if (!waitingList.length) {
      console.log("[handleMessageEvent] Nenhuma automação aguardando e-mail para lead=", lead.igSenderId);
      return;
    }

    if (isValidEmail(text)) {
      // Atualiza o lead com o e-mail informado
      const updatedLead = await prisma.lead.update({
        where: { igSenderId: lead.igSenderId },
        data: { email: text },
      });
      // Para cada automação aguardando e-mail, marca como atendida e envia o link
      for (const la of waitingList) {
        await prisma.leadAutomacao.update({
          where: { id: la.id },
          data: { waitingForEmail: false },
        });
        const automacao = await prisma.automacao.findUnique({
          where: { id: la.automacaoId },
        });
        if (!automacao) continue;

        // Caso a automação peça para seguir, iremos ignorar a checagem e seguir
        if (automacao.pedirParaSeguirPro) {
          console.log("[handleMessageEvent] (Email Flow) Supondo que o usuário segue a conta (FORÇANDO TRUE).");
        }
        // Envia o link da automação
        await sendLinkForAutomacao(updatedLead, automacao, accessToken, igUserId);
      }
    } else {
      // Solicita novamente um e-mail válido
      await sendEmailRequestMessage({
        igUserId,
        accessToken,
        recipientId: senderId,
        emailPrompt: "Digite um email válido 🤗 , ex: joao@gmail.com, maria@outlook.com, etc",
      });
    }
  } catch (err: any) {
    console.error("[handleMessageEvent] erro:", err.message);
  }
}

/**
 * Verifica se o user (senderId) segue a conta (igUserId).
 * Agora, sempre vamos retornar true para forçar a continuidade da automação.
 */
async function checkIfUserFollows(
  senderId: string,
  igUserId: string,
  accessToken: string
): Promise<boolean> {
  console.log(`[checkIfUserFollows] Forçando TRUE para ${senderId} seguir a conta ${igUserId}.`);
  return true;
}

/**
 * Envia uma msg pedindo para seguir + botão "Estou seguindo" (postback = automacao.buttonPayload).
 * IMPORTANTE: aqui passamos o buttonPayload da automação para o quick reply.
 */
async function sendFollowRequestMessage({
  igUserId,
  accessToken,
  recipientId,
  followPrompt,
  buttonPayload,
}: {
  igUserId: string;
  accessToken: string;
  recipientId: string;
  followPrompt: string;
  buttonPayload: string;
}) {
  const url = `${IG_GRAPH_API_BASE}/${igUserId}/messages`;
  const body = {
    recipient: { id: recipientId },
    message: {
      text: followPrompt,
      quick_replies: [
        {
          content_type: "text",
          title: "Estou seguindo", // Botão que o usuário clica após seguir
          payload: buttonPayload,  // Usa o payload único da automação
        },
      ],
    },
  };
  await axios.post(url, body, { params: { access_token: accessToken } });
  console.log("[sendFollowRequestMessage] Mensagem pedindo follow enviada a", recipientId);
}

/**
 * Envia uma msg pública no comentário do IG.
 */
async function replyPublicComment(commentId: string, accessToken: string, msg: string) {
  await axios.post(
    `${IG_GRAPH_API_BASE}/${commentId}/replies`,
    new URLSearchParams({
      message: msg,
      access_token: accessToken,
    })
  );
  console.log("[replyPublicComment] Resposta pública p/ commentId=", commentId);
}

/**
 * Retorna random de publicReply[] ou fallback.
 */
function pickRandomPublicReply(publicReply?: string | null): string {
  let frases: string[] = [];
  if (publicReply) {
    try {
      const arr = JSON.parse(publicReply);
      if (Array.isArray(arr) && arr.length > 0) {
        frases = arr;
      }
    } catch (err) {
      console.warn("[pickRandomPublicReply] erro ao parsear publicReply JSON");
    }
  }
  if (frases.length === 0) {
    return "Olá! Eu te mandei uma mensagem privada, dá uma olhada! ✅";
  }
  return frases[Math.floor(Math.random() * frases.length)];
}

/**
 * Private Reply com botão postback no comentário do IG.
 */
async function sendPrivateReplyWithButton({
  igUserId,
  accessToken,
  commentId,
  text,
  buttonTitle,
  buttonPayload,
}: {
  igUserId: string;
  accessToken: string;
  commentId: string;
  text: string;
  buttonTitle: string;
  buttonPayload: string;
}) {
  const url = `${IG_GRAPH_API_BASE}/${igUserId}/messages`;
  const body = {
    recipient: { comment_id: commentId },
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
  };
  await axios.post(url, body, { params: { access_token: accessToken } });
  console.log("[sendPrivateReplyWithButton] enviado p/ commentId=", commentId);
}

/**
 * Envia um template type=generic com web_url (Link).
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
  const endpoint = `${IG_GRAPH_API_BASE}/${igUserId}/messages`;
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
  };
  await axios.post(endpoint, body, { params: { access_token: accessToken } });
  console.log("[sendTemplateLink] link DM p/ userId=", recipientId);
}

/**
 * Envia msg pedindo e-mail
 */
async function sendEmailRequestMessage({
  igUserId,
  accessToken,
  recipientId,
  emailPrompt,
}: {
  igUserId: string;
  accessToken: string;
  recipientId: string;
  emailPrompt: string;
}) {
  const url = `${IG_GRAPH_API_BASE}/${igUserId}/messages`;
  const body = {
    recipient: { id: recipientId },
    message: { text: emailPrompt },
  };
  await axios.post(url, body, { params: { access_token: accessToken } });
  console.log("[sendEmailRequestMessage] pedindo email de", recipientId);
}

/**
 * Envia a Etapa 3 (link) p/ (Lead, Automacao).
 * Marca linkSent = true em LeadAutomacao, se ainda não estiver true.
 * Cancela job "contatoSemClique" se existir.
 */
async function sendLinkForAutomacao(lead: any, automacao: any, accessToken: string, igUserId: string) {
  // Acha LeadAutomacao
  let la = await prisma.leadAutomacao.findUnique({
    where: {
      leadIgSenderId_automacaoId: {
        leadIgSenderId: lead.igSenderId,
        automacaoId: automacao.id,
      },
    },
  });
  if (!la) {
    la = await prisma.leadAutomacao.create({
      data: {
        leadIgSenderId: lead.igSenderId,
        automacaoId: automacao.id,
      },
    });
  }

  if (la.linkSent) {
    console.log("[sendLinkForAutomacao] link já enviado p/ automacaoId=", automacao.id);
    return;
  }

  // Cancela job "contatoSemClique" se estiver programado
  // if (la.followUpJobId) { await followUpQueue.remove(la.followUpJobId); }

  const textEtapa3 = automacao.mensagemEtapa3 || "Obrigado! Segue nosso link.";
  const link = automacao.linkEtapa3 || "https://exemplo.com";
  const linkTitle = automacao.legendaBotaoEtapa3 || "Acessar Link";

  // Envia DM
  await sendTemplateLink({
    igUserId,
    accessToken,
    recipientId: lead.igSenderId,
    title: textEtapa3,
    url: link,
    urlButtonTitle: linkTitle,
  });

  await prisma.leadAutomacao.update({
    where: { id: la.id },
    data: { linkSent: true },
  });
  console.log("[sendLinkForAutomacao] Link enviado p/ automacao =", automacao.id);
}

/**
 * isValidEmail
 */
function isValidEmail(email: string): boolean {
  const regex = /^[A-Za-z0-9._%+-]+@(gmail|outlook|icloud|aol|zoho|yahoo|gmx|protonmail|hotmail)\.com(\.br)?$/i;
  return regex.test(email);
}
