"use client";
import React, { useState, useRef, useEffect } from "react";
import { useChatwitIA } from "@/hooks/useChatwitIA";
import { useSession } from "next-auth/react";

import ChatHeader from "./chatwithIAcomponents/ChatHeader";
import MessagesList from "./chatwithIAcomponents/MessagesList";
import ScrollToBottomButton from "./chatwithIAcomponents/ScrollToBottomButton";
import SettingsModal from "./chatwithIAcomponents/SettingsModal";

import ChatInputForm from "../ChatInputForm"; // mantém o mesmo

const defaultSystemPrompt =
  "Você é GPT Universal, uma inteligência artificial de última geração que entende profundamente qualquer assunto solicitado pelo usuário. Sua missão é responder com clareza, precisão e didática. Sempre que responder, siga rigorosamente essas instruções:\n\n" +
  "1. **Compreensão Profunda:**\n" +
  "   - Leia cuidadosamente a solicitação do usuário.\n" +
  "   - Se necessário, peça esclarecimentos antes de responder.\n\n" +
  "2. **Estrutura Clara:**\n" +
  "   - Organize suas respostas em tópicos numerados ou marcadores.\n" +
  "   - Sempre forneça introdução, desenvolvimento detalhado e conclusão.\n\n" +
  "3. **Exemplos Didáticos:**\n" +
  "   - Sempre inclua exemplos práticos e claros para ilustrar explicações, especialmente em tópicos técnicos ou complexos.\n" +
  "   - Utilize exemplos do cotidiano, casos de uso reais ou situações hipotéticas detalhadas.\n\n" +
  "4. **Codificação e Formatação:**\n" +
  "   - Sempre que fornecer códigos:\n" +
  "     - Indique claramente a linguagem usada.\n" +
  "     - Formate o código com identação correta e comentários explicativos.\n" +
  "     - Sempre acompanhe o código com uma breve explicação passo a passo.\n\n" +
  "5. **Atenção aos Detalhes:**\n" +
  "   - Revise a resposta antes de entregá-la para garantir precisão absoluta.\n" +
  "   - Corrija proativamente possíveis erros comuns que possam surgir no tema solicitado.\n\n" +
  "6. **Antecipação e Pró-atividade:**\n" +
  "   - Se perceber que alguma informação extra pode beneficiar o usuário, inclua-a mesmo que não solicitada diretamente.\n" +
  "   - Sugira possíveis melhorias ou alternativas mais eficazes, sempre que aplicável.\n\n" +
  "7. **Referências e Fontes:**\n" +
  "   - Indique fontes ou referências confiáveis sempre que pertinente.\n" +
  "   - Se possível, indique documentação oficial, artigos científicos ou manuais técnicos.";

interface Props {
  modelId?: string;
  chatId?: string | null;
}

export default function ChatwitIA({
  modelId = "chatgpt-4o-latest",
  chatId = null,
}: Props) {
  const { data: authSession } = useSession();
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    files,
    isFileLoading,
    uploadFile,
    deleteFile,
    editImage,
    createImageVariation,
  } = useChatwitIA(chatId, modelId) as any;

  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [showSettings, setShowSettings] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [cnisAnalysisActive, setCnisAnalysisActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ----- scroll helpers ----- */
  const handleScrollEvent = () => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const bottom = c.scrollHeight - c.clientHeight <= c.scrollTop + 150;
    setShowScrollButton(!bottom);
    if (bottom) setUnreadMessages(0);
  };

  useEffect(() => {
    const c = messagesContainerRef.current;
    c?.addEventListener("scroll", handleScrollEvent);
    return () => c?.removeEventListener("scroll", handleScrollEvent);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const c = messagesContainerRef.current;
    const bottom =
      c && c.scrollHeight - c.clientHeight <= c.scrollTop + 150;
    if (!bottom && messages[messages.length - 1].role === "assistant") {
      setUnreadMessages((n) => n + 1);
    }
  }, [messages]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ----- submit ----- */
  const handleSubmit = async (content: string) => {
    if (!content.trim() || isLoading) return;
    await sendMessage(content, systemPrompt, modelId);
    setInput("");                // limpar input local do ChatwitIA, se ainda usar
    inputRef.current?.focus();
  };
  
  /* ----- CNIS analysis toggle ----- */
  const handleToggleCnisAnalysis = (isActive: boolean) => {
    setCnisAnalysisActive(isActive);
    console.log("ChatwithIA: CNIS Analysis mode set to:", isActive);
    // Here you would typically implement the custom tool call logic later
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <ChatHeader
        modelId={modelId}
        canClear={messages.length > 0}
        onClear={clearMessages}
        onToggleSettings={() => setShowSettings((v) => !v)}
      />

      <MessagesList
        messages={messages}
        isLoading={isLoading}
        error={error}
        containerRef={messagesContainerRef}
        endRef={messagesEndRef}
      />

      {showScrollButton && (
        <ScrollToBottomButton unread={unreadMessages} onClick={scrollToBottom} />
      )}

      <SettingsModal
        show={showSettings}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        defaultSystemPrompt={defaultSystemPrompt}
        onClose={() => setShowSettings(false)}
      />

      <ChatInputForm
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}   // agora recebe string
        isLoading={isLoading}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        onAudioCapture={() => {}}
        onImageGenerate={() => {}}
        handleTranscriptReady={(t) => setInput((p) => (p ? `${p} ${t}` : t))}
        files={files}
        onUploadFile={uploadFile}
        onDeleteFile={deleteFile}
        onEditImage={editImage}
        onVariationImage={createImageVariation}
        isFileLoading={isFileLoading}
        currentSessionId={chatId || undefined}
        isCnisAnalysisActive={cnisAnalysisActive}
        onToggleCnisAnalysis={handleToggleCnisAnalysis}
      />
    </div>
  );
}
