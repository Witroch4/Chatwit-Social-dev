//ChatwitIA.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChatwitIA } from "@/hooks/useChatwitIA";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ChatHeader from "./chatwithIAcomponents/ChatHeader";
import MessagesList from "./chatwithIAcomponents/MessagesList";
import ScrollToBottomButton from "./chatwithIAcomponents/ScrollToBottomButton";
import SettingsModal from "./chatwithIAcomponents/SettingsModal";
import ChatInputForm from "../ChatInputForm";
import { UploadPurpose } from "../ChatInputForm";
import { toast } from "sonner";

const defaultSystemPrompt = /* …mesmo texto gigante… */ `Você é um assistente útil e amigável. Use um tom conversacional, cordial e educado. 

Você tem a capacidade de renderizar equações matemáticas usando KaTeX. Use a sintaxe correta:

1. Para equações inline: $E = mc^2$
2. Para blocos de equação: $$\frac{1}{\sqrt{2\pi\sigma^2}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}$$
3. Para blocos de código com linguagem "math": 
\`\`\`math
\frac{d}{dx}[\sin(x)] = \cos(x)
\`\`\`

IMPORTANTE: Sempre use a sintaxe $$...$$, nunca use colchetes [ ] para envolver equações matemáticas. 
A sintaxe correta é:
- $$\frac{d}{dx}[\sin(x)] = \cos(x)$$
- $$\lim_{h \to 0} \frac{\sin(x+h) - \sin(x)}{h} = \cos(x)$$

Responda às perguntas do usuário de forma precisa e útil. Quando necessário, inclua equações matemáticas formatadas adequadamente.`;

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
  const { data: session } = useSession();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const handleSubmitRef = useRef<((content: string) => Promise<void>) | null>(null);
  
  // Integrar hook de geração de imagem
  const { 
    generateImage, 
    isGenerating: isGeneratingImage
  } = useImageGeneration(chatId || undefined);

  const {
    messages,
    sendMessage,
    isLoading,
    clearMessages,
    error,
    files,
    uploadFile,
    deleteFile,
    editImage,
    createImageVariation,
    isFileLoading,
    currentSessionId
  } = useChatwitIA(chatId, modelId);

  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [showSettings, setShowSettings] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [cnisAnalysisActive, setCnisAnalysisActive] = useState(false);

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

  // Manter handleSubmitRef atualizado
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Função de upload para garantir que PDFs sempre usem 'user_data'
  const handleUploadFile = async (file: File, purpose: UploadPurpose) => {
    // Para PDFs, sempre usar 'user_data' conforme recomendação moderna da OpenAI
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const finalPurpose = isPdf ? 'user_data' as UploadPurpose : purpose;
    
    if (isPdf && purpose !== 'user_data') {
      console.log(`Convertendo purpose de ${purpose} para user_data para PDF: ${file.name}`);
    }
    
    // Chamar a função de upload do hook com o purpose adequado
    return await uploadFile(file, finalPurpose);
  };

  /** Depois que o hook gera a primeira sessão, trocamos de rota
  * (isso acontece em milissegundos, sem recarregar o componente). */
  useEffect(() => {
    if (!chatId && currentSessionId) {
      console.log(`🔄 Transição de rota: ${chatId} -> ${currentSessionId} (mensagens: ${messages.length})`);
      // 🔧 CORREÇÃO: Usar replace em vez de push para evitar problemas de navegação
      // e preservar o estado das mensagens durante a transição
      router.replace(`/chatwitia/${currentSessionId}`);
    }
  }, [chatId, currentSessionId, router, messages.length]);

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

  // Reset the initialMessageSent flag when chatId changes
  useEffect(() => {
    console.log(`🔄 Resetando flag de mensagem inicial para chatId: ${chatId}, modelId: ${modelId}`);
    initialMessageSentRef.current = false;
  }, [chatId]); // Remover modelId das dependências para evitar resets desnecessários

  // Process initial message once when component mounts or chatId changes
  useEffect(() => {
    if (!initialMessage || isLoading || initialMessageSentRef.current) {
      console.log(`⏸️ Pulando processamento de mensagem inicial. 
        initialMessage: ${!!initialMessage}, 
        isLoading: ${isLoading}, 
        alreadySent: ${initialMessageSentRef.current}`);
      return;
    }
    
    console.log(`🚀 Processando mensagem inicial: "${initialMessage}" com modelo: ${modelId}`);
    initialMessageSentRef.current = true;

    // 🔧 OTIMIZAÇÃO: Remover timeout desnecessário - executar imediatamente
    console.log(`💬 Enviando mensagem inicial: "${initialMessage}"`);
    if (handleSubmitRef.current) {
      handleSubmitRef.current(initialMessage);
    } else {
      console.warn(`⚠️ handleSubmitRef.current não está disponível`);
    }

    // Clean up pending message from sessionStorage
    if (typeof window !== 'undefined' && chatId) {
      console.log(`🧹 Limpando sessionStorage para chatId: ${chatId}`);
      sessionStorage.removeItem(`pending_${chatId}`);
    }
  }, [initialMessage, chatId, isLoading]);

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

  // Função para lidar com geração de imagem
  const handleGenerateImage = useCallback(async (prompt: string) => {
    console.log(`🎨 ChatwitIA.handleGenerateImage chamado com prompt: "${prompt}"`);
    
    if (!prompt.trim()) {
      toast.error('Prompt para imagem não pode estar vazio');
      return;
    }

    try {
      console.log(`🎨 handleGenerateImage chamado com prompt: "${prompt}"`);
      
      // Mostrar feedback imediato ao usuário
      toast.info(`🎨 Gerando imagem: "${prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt}"`);
      
      // Verificar se o modelo atual suporta geração de imagem via Responses API
      // Lista específica de modelos que suportam a ferramenta image_generation na Responses API
      const imageCompatibleModels = [
        'gpt-4o',
        'gpt-4o-2024-05-13',
        'gpt-4o-2024-08-06',
        'gpt-4o-2024-11-20',
        'gpt-4.1',
        'gpt-4.1-2025-04-14',
        'gpt-4.1-mini',
        'gpt-4.1-mini-2025-04-14',
        'gpt-4.1-nano',
        'gpt-4.1-nano-2025-04-14',
        'o3-mini',
        'o3'
      ];
      
      // Mapear modelos "latest" para versões compatíveis (similar ao backend)
      let modelForImageCheck = modelId;
      if (modelId.includes('latest') || modelId.includes('chatgpt-4o')) {
        if (modelId.includes('4o') || modelId.includes('chatgpt-4o')) {
          modelForImageCheck = 'gpt-4o-2024-11-20';
          console.log(`🔄 Frontend: Mapeando ${modelId} para ${modelForImageCheck} para verificação de compatibilidade`);
        } else if (modelId.includes('4.1-mini')) {
          modelForImageCheck = 'gpt-4.1-mini-2025-04-14';
        } else if (modelId.includes('4.1-nano')) {
          modelForImageCheck = 'gpt-4.1-nano-2025-04-14';
        } else if (modelId.includes('4.1')) {
          modelForImageCheck = 'gpt-4.1-2025-04-14';
        }
      }
      
      const supportsImageGeneration = imageCompatibleModels.some(compatibleModel => 
        modelId === compatibleModel || 
        modelId.startsWith(compatibleModel + '-') ||
        modelForImageCheck === compatibleModel ||
        modelForImageCheck.startsWith(compatibleModel + '-')
      );

      console.log(`🔍 Modelo ${modelId} suporta geração de imagem via Responses API: ${supportsImageGeneration}`);

      if (!supportsImageGeneration) {
        console.log('🖼️ Usando Image API diretamente para geração de imagem');
        
        const imageOptions = {
          model: 'gpt-image-1' as const,
          size: '1024x1024' as const,
          quality: 'auto' as const,
          background: 'auto' as const,
          useResponsesApi: false
        };
        
        // Gerar imagem usando Image API
        const images = await generateImage(prompt, imageOptions);
        
        if (images.length > 0) {
          // A imagem será exibida através do estado do hook de imagem
          toast.success('Imagem gerada com sucesso!');
        }
      } else {
        // ⚠️ NOVA LÓGICA: Para modelos compatíveis com Responses API,
        // enviar diretamente via sendMessage (que já incorpora geração de imagem)
        console.log('🎨 Enviando para chat com geração automática via Responses API');
        
        const userMessage = prompt; // Usar prompt diretamente sem prefixo
        await sendMessage(userMessage, systemPrompt, modelId);
      }
    } catch (error: any) {
      console.error('Erro ao gerar imagem:', error);
      toast.error(`Erro ao gerar imagem: ${error.message || 'Erro desconhecido'}`);
    }
  }, []); // ⚠️ REMOVENDO DEPENDÊNCIAS para tornar a função estável

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
        isLoading={isLoading || isGeneratingImage}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        onAudioCapture={() => {}}
        onImageGenerate={() => {}}
        onGenerateImage={handleGenerateImage}
        handleTranscriptReady={(t) => setInput((p) => (p ? `${p} ${t}` : t))}
        files={files}
        onUploadFile={handleUploadFile}
        onDeleteFile={deleteFile}
        onEditImage={editImage}
        onVariationImage={createImageVariation}
        isFileLoading={isFileLoading}
        currentSessionId={chatId || undefined}
        isCnisAnalysisActive={cnisAnalysisActive}
        onToggleCnisAnalysis={handleToggleCnisAnalysis}
        onSearchToggle={(isActive) => console.log('Search toggle:', isActive)}
        onInvestigateToggle={(isActive) => console.log('Investigate toggle:', isActive)}
      />
    </div>
  );
}
 