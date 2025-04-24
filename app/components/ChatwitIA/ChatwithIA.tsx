//ChatwitIA.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChatwitIA } from "@/hooks/useChatwitIA";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ChatHeader from "./chatwithIAcomponents/ChatHeader";
import MessagesList from "./chatwithIAcomponents/MessagesList";
import ScrollToBottomButton from "./chatwithIAcomponents/ScrollToBottomButton";
import SettingsModal from "./chatwithIAcomponents/SettingsModal";
import ChatInputForm from "../ChatInputForm";

const defaultSystemPrompt = /* …mesmo texto gigante… */ "";

interface Props {
  modelId?: string;
  chatId?: string | null;
  initialMessage?: string | null;
  onTitleChange?: (title: string) => void;
}

export default function ChatwitIA({
  modelId = "chatgpt-4o-latest",
  chatId = null,
  initialMessage = null,
  onTitleChange,
}: Props) {
  const router = useRouter();
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
    currentSessionId,
  } = useChatwitIA(chatId, modelId) as any;

  /** Depois que o hook gera a primeira sessão, trocamos de rota
 *  (isso acontece em milissegundos, sem recarregar o componente). */
useEffect(() => {
  if (!chatId && currentSessionId) {
    router.replace(`/chatwitia/${currentSessionId}`);
  }
}, [chatId, currentSessionId, router]);


  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [showSettings, setShowSettings] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [cnisAnalysisActive, setCnisAnalysisActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Flag to track whether the initial message has been sent
  const initialMessageSentRef = useRef(false);

  /* ----- scroll helpers (inalterados) ----- */
  const handleScrollEvent = () => {
    const c = messagesContainerRef.current;
    if (!c) return;
    
    // Mostra botão de scroll quando estiver mais de 150px do final
    const isNearBottom = c.scrollHeight - c.clientHeight <= c.scrollTop + 150;
    
    // Só atualiza o estado se realmente mudar para evitar re-renders
    if (showScrollButton !== !isNearBottom) {
      setShowScrollButton(!isNearBottom);
    }
    
    // Limpa contagem de mensagens não lidas quando scroll chega ao fim
    if (isNearBottom && unreadMessages > 0) {
      setUnreadMessages(0);
    }
  };

  useEffect(() => {
    const c = messagesContainerRef.current;
    c?.addEventListener("scroll", handleScrollEvent);
    return () => c?.removeEventListener("scroll", handleScrollEvent);
  }, [showScrollButton, unreadMessages]); // Dependências atualizadas

  useEffect(() => {
    if (!messages.length) return;
    const c = messagesContainerRef.current;
    const isNearBottom = c && c.scrollHeight - c.clientHeight <= c.scrollTop + 150;
    
    const lastMessage = messages[messages.length - 1];
    
    // Incrementa contador de mensagens não lidas apenas para mensagens do assistente
    // e quando o usuário não está próximo do final
    if (!isNearBottom && lastMessage.role === "assistant") {
      setUnreadMessages((n) => n + 1);
      
      // Destaca visualmente o botão com animação
      const scrollBtn = document.querySelector('.scroll-to-bottom-btn');
      if (scrollBtn) {
        scrollBtn.classList.add('highlight');
        setTimeout(() => scrollBtn?.classList.remove('highlight'), 1000);
      }
    } else if (isNearBottom) {
      // Se estiver perto do final, rola automaticamente para a última mensagem
      scrollToBottom();
    }
  }, [messages]);

  // Função de scroll para o final das mensagens com animação suave
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end" 
    });
    
    // Limpa contador de mensagens não lidas ao rolar para o final
    setUnreadMessages(0);
  };

  /* ----- submit ----- */
  const handleSubmit = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;
      // Always pass the modelId to ensure it's used
      await sendMessage(content, systemPrompt, modelId);
      setInput("");
      inputRef.current?.focus();
    },
    [isLoading, sendMessage, systemPrompt, modelId]
  );

  // Reset the initialMessageSent flag when chatId changes
  useEffect(() => {
    initialMessageSentRef.current = false;
  }, [chatId, modelId]); // Also reset when modelId changes

  // Process initial message once when component mounts or chatId/modelId changes
  useEffect(() => {
    if (!initialMessage || isLoading || initialMessageSentRef.current) return;
    
    console.log(`Processing initial message with model: ${modelId}`);
    initialMessageSentRef.current = true;

    // Small timeout to ensure component is fully mounted
    setTimeout(() => handleSubmit(initialMessage), 100);

    // Clean up pending message from sessionStorage
    if (typeof window !== 'undefined' && chatId) {
      sessionStorage.removeItem(`pending_${chatId}`);
    }
  }, [initialMessage, isLoading, handleSubmit, chatId, modelId]);

  /* ----- CNIS analysis toggle ----- */
  const handleToggleCnisAnalysis = (isActive: boolean) => {
    setCnisAnalysisActive(isActive);
    console.log("ChatwitIA: CNIS Analysis mode set to:", isActive);
  };

  /* ----- título automático ----- */
  useEffect(() => {
    if (messages.length > 0 && chatId && onTitleChange) {
      const latestMessage = messages[messages.length - 1];

      // Se for uma mensagem do assistente com conteúdo
      if (latestMessage.role === "assistant" && latestMessage.content) {
        // Se o backend forneceu um summary, use-o
        if (latestMessage.summary) {
          console.log("Usando título sugerido pelo backend:", latestMessage.summary);
          onTitleChange(latestMessage.summary);
        } 
        // Caso contrário, gere um título a partir da primeira mensagem do usuário
        else {
          const firstUserMessage = messages.find((m: any) => m.role === "user");
          if (firstUserMessage && typeof firstUserMessage.content === "string") {
            // Extrair as primeiras palavras da mensagem do usuário para um título
            const userContent = firstUserMessage.content.replace(/\n/g, ' ').trim();
            const title = userContent.length > 50
              ? userContent.substring(0, 47) + '...'
              : userContent;
            
            console.log("Gerando título a partir da mensagem do usuário:", title);
            onTitleChange(title);
          }
        }
      }
    }
  }, [messages, chatId, onTitleChange]);

  /* ---------------- render ----------------- */
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
        onSubmit={handleSubmit}
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
 