"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInstagramWebhook = handleInstagramWebhook;
//worker\automacao\eu-quero\automation.ts
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("@/lib/prisma");
const instagram_auth_1 = require("@/lib/instagram-auth");
// Ajuste se necessário para a versão do Graph API
const IG_GRAPH_API_BASE = process.env.IG_GRAPH_API_BASE || "https://graph.instagram.com/v21.0";
/**
 * Função única que recebe os dados do job (webhook do Instagram)
 * e, para cada evento, chama os devidos handlers (comentário, DM etc.).
 */
async function handleInstagramWebhook(data) {
    const { object, entry } = data;
    if (object !== "instagram") {
        console.warn(`[handleInstagramWebhook] Objeto não suportado: ${object}`);
        return;
    }
    for (const event of entry) {
        const igUserId = event.id; // Ex.: "1784..."
        // 1) Se for "changes", trata comentário em post/reel
        if (event.changes) {
            for (const change of event.changes) {
                const { field, value } = change;
                if (field === "comments") {
                    await handleCommentChange(value, igUserId);
                }
                else {
                    console.warn(`[handleInstagramWebhook] Field não tratado: ${field}`);
                }
            }
        }
        // 2) Se for "messaging", trata DM ou postback
        if (event.messaging) {
            for (const msgEvt of event.messaging) {
                await handleMessageEvent(msgEvt, igUserId);
            }
        }
    }
}
/**
 * Trata comentários em posts ou reels (automação "eu-quero").
 */
async function handleCommentChange(value, igUserId) {
    try {
        const { id: comment_id, text: commentText = "", from, media } = value;
        const media_id = media === null || media === void 0 ? void 0 : media.id;
        console.log(`[handleCommentChange] Recebido comentário. media_id=${media_id}, text=${commentText}`);
        // Ignora comentário do próprio dono da conta
        if ((from === null || from === void 0 ? void 0 : from.id) === igUserId) {
            console.log("[handleCommentChange] Ignorando comentário do próprio igUserId.");
            return;
        }
        // 1) Obter token p/ esse igUserId
        const accessToken = await (0, instagram_auth_1.getInstagramUserToken)(igUserId);
        if (!accessToken) {
            console.warn(`[handleCommentChange] Token não encontrado p/ igUserId=${igUserId}`);
            return;
        }
        // 2) Buscar TODAS as automações ATIVAS deste igUserId (live: true)
        const automacoes = await prisma_1.prisma.automacao.findMany({
            where: {
                user: {
                    accounts: {
                        some: {
                            provider: "instagram",
                            igUserId: igUserId,
                        },
                    },
                },
                live: true, // <--- IGNORA as pausadas
            },
        });
        if (!automacoes || automacoes.length === 0) {
            console.log(`[handleCommentChange] Nenhuma automação ativa p/ igUserId=${igUserId}`);
            return;
        }
        // 3) Verificar qual automação "bate" com este comentário
        function matchesComment(automacao) {
            var _a;
            // Verifica a palavra-chave (caso a automação exija)
            if (automacao.selectedOptionPalavra === "especifica") {
                const palavrasChave = ((_a = automacao.palavrasChave) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
                if (!commentText.toLowerCase().includes(palavrasChave)) {
                    return false;
                }
            }
            // Verifica mídia
            if (automacao.anyMediaSelected) {
                return true;
            }
            else {
                return media_id === automacao.selectedMediaId;
            }
        }
        // Filtra quais automações podem responder
        const midiaEspecifica = automacoes.filter((a) => !a.anyMediaSelected && a.selectedMediaId && matchesComment(a));
        const midiaQualquer = automacoes.filter((a) => a.anyMediaSelected && matchesComment(a));
        let automacaoQueBate = midiaEspecifica.length > 0 ? midiaEspecifica[0] : undefined;
        if (!automacaoQueBate && midiaQualquer.length > 0) {
            automacaoQueBate = midiaQualquer[0];
        }
        if (!automacaoQueBate) {
            console.log("[handleCommentChange] Nenhuma automação bateu com mídia/palavra.");
            return;
        }
        // (1) Se automação configurada para responder publicamente
        if (automacaoQueBate.responderPublico) {
            const randomReply = pickRandomPublicReply(automacaoQueBate.publicReply);
            await replyPublicComment(comment_id, accessToken, randomReply);
        }
        // (2) Se houver DM de boas-vindas configurada, envia "private reply" com botão
        if (automacaoQueBate.fraseBoasVindas && automacaoQueBate.quickReplyTexto) {
            await sendPrivateReplyWithButton({
                igUserId,
                accessToken,
                commentId: comment_id,
                text: automacaoQueBate.fraseBoasVindas,
                buttonTitle: automacaoQueBate.quickReplyTexto,
                buttonPayload: automacaoQueBate.buttonPayload,
            });
        }
        console.log("[handleCommentChange] Automação finalizada com sucesso!");
    }
    catch (err) {
        console.error("[handleCommentChange] Erro:", err);
    }
}
/**
 * Trata eventos de mensagem (DM) e postback (quando clica em botão).
 */
async function handleMessageEvent(msgEvt, igUserId) {
    var _a;
    try {
        const senderId = (_a = msgEvt.sender) === null || _a === void 0 ? void 0 : _a.id;
        if (senderId === igUserId) {
            console.log("[handleMessageEvent] Ignorando msg do próprio igUserId.");
            return;
        }
        // Se for um postback (botão clicado)
        if (msgEvt.postback) {
            const postbackPayload = msgEvt.postback.payload;
            console.log("[handleMessageEvent] Recebeu postback:", postbackPayload);
            // Verifica se existe alguma automação para esse payload
            const automacao = await prisma_1.prisma.automacao.findFirst({
                where: {
                    user: {
                        accounts: {
                            some: {
                                provider: "instagram",
                                igUserId: igUserId,
                            },
                        },
                    },
                    buttonPayload: postbackPayload,
                    live: true, // <--- Também ignora se não estiver ativa
                },
            });
            if (!automacao) {
                console.log(`[handleMessageEvent] Nenhuma automação ATIVA achada para payload=${postbackPayload}`);
                return;
            }
            // Obter token novamente
            const accessToken = await (0, instagram_auth_1.getInstagramUserToken)(igUserId);
            if (!accessToken) {
                console.warn(`[handleMessageEvent] Sem token p/ igUserId=${igUserId}`);
                return;
            }
            // Enviar a Etapa 3: mensagem + link
            const textEtapa3 = automacao.mensagemEtapa3 || "Obrigado por ter respondido, segue nosso link.";
            const link = automacao.linkEtapa3 || "https://seu-site.com.br";
            const linkTitle = automacao.legendaBotaoEtapa3 || "Acessar Link";
            await sendTemplateLink({
                igUserId,
                accessToken,
                recipientId: senderId,
                title: textEtapa3,
                url: link,
                urlButtonTitle: linkTitle,
            });
            console.log("[handleMessageEvent] Enviou template da Etapa 3 (link).");
            return;
        }
        // Se não for postback, ignorar ou tratar de forma genérica
        console.log("[handleMessageEvent] Mensagem sem postback, ignorando...");
    }
    catch (err) {
        console.error("[handleMessageEvent] Erro:", err.message);
    }
}
/**
 * Responde publicamente a um comentário
 */
async function replyPublicComment(commentId, accessToken, mensagem) {
    await axios_1.default.post(`${IG_GRAPH_API_BASE}/${commentId}/replies`, new URLSearchParams({
        message: mensagem,
        access_token: accessToken,
    }));
    console.log(`[replyPublicComment] Resposta pública enviada ao commentId=${commentId}.`);
}
/**
 * Escolhe aleatoriamente uma frase de `publicReply` ou retorna fallback.
 */
function pickRandomPublicReply(publicReply) {
    let frases = [];
    if (publicReply) {
        try {
            const arr = JSON.parse(publicReply);
            if (Array.isArray(arr) && arr.length > 0) {
                frases = arr;
            }
        }
        catch (err) {
            console.warn("[pickRandomPublicReply] Erro ao parsear JSON de publicReply.");
        }
    }
    if (frases.length === 0) {
        return "Olá! Eu te mandei uma mensagem privada, dá uma olhada! ✅";
    }
    const randomIndex = Math.floor(Math.random() * frases.length);
    return frases[randomIndex];
}
/**
 * Envia uma Private Reply com botão (ex.: "Quer saber mais?").
 */
async function sendPrivateReplyWithButton({ igUserId, accessToken, commentId, text, buttonTitle, buttonPayload, }) {
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
    };
    await axios_1.default.post(`${IG_GRAPH_API_BASE}/${igUserId}/messages`, body, {
        params: { access_token: accessToken },
    });
    console.log(`[sendPrivateReplyWithButton] Button Template enviado ao commentId=${commentId}.`);
}
/**
 * Envia um template com botão "web_url" (ex.: com link de produto/serviço).
 */
async function sendTemplateLink({ igUserId, accessToken, recipientId, title, url, urlButtonTitle, }) {
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
    await axios_1.default.post(`${IG_GRAPH_API_BASE}/${igUserId}/messages`, body, {
        params: { access_token: accessToken },
    });
    console.log(`[sendTemplateLink] Template com link enviado p/ userId=${recipientId}.`);
}
