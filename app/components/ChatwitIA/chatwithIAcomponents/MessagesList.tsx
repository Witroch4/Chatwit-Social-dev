import React, { useEffect, useCallback, useMemo } from "react";
import MessageContent from "./MessageContent";
import AnimatedMessage from "./AnimatedMessage";
import { FileIcon } from "lucide-react";

interface MessagesListProps {
  messages: any[];
  isLoading: boolean;
  error: string | null;
  containerRef: React.RefObject<HTMLDivElement>;
  endRef: React.RefObject<HTMLDivElement>;
}

const MessagesList = React.memo(function MessagesList({
  messages,
  isLoading,
  error,
  containerRef,
  endRef,
}: MessagesListProps) {
  // Verificar se já temos uma resposta em progresso (stream começou) - memoizado
  const hasResponseInProgress = useMemo(() => {
    if (messages.length === 0) return false;
    
    const lastMessage = messages[messages.length - 1];
    // Considera stream iniciado se for uma mensagem do assistente e tiver qualquer conteúdo
    return lastMessage.role === 'assistant' && lastMessage.content !== '';
  }, [messages]);
  
  // Verificar se o streaming está ativo ou se já acabou - memoizado
  const isStreamActive = useMemo(() => {
    return isLoading && hasResponseInProgress;
  }, [isLoading, hasResponseInProgress]);

  // Scroll function memoizada
  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [endRef]);

  // rolar sempre que chegar nova msg ou quando a resposta em stream mudar
  useEffect(() => {
    // Usar scrollIntoView com comportamento suave quando novas mensagens chegarem
    if (messages.length) {
      scrollToEnd();
    }
  }, [messages.length, hasResponseInProgress, scrollToEnd]);

  // Conteúdo vazio memoizado
  const emptyContent = useMemo(() => (
    <div className="h-full flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold mb-8">ChatwitIA</h1>
      <p className="text-gray-500">Envie uma mensagem para começar.</p>
    </div>
  ), []);

  if (!messages.length) return emptyContent;

  return (
    <section
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-5"
    >
      <div className="max-w-3xl mx-auto w-full pt-8 px-4">
        {messages.map((m, i) => {
          if (!m || m.role === "system") return null;
          const isUser = m.role === "user";
          const pdf = typeof m.content === "string" && m.content.match(/\[.*?\]\(file_id:.*?\)/);
          return (
            <div key={i} className={`mb-6 flex ${isUser ? "justify-end" : "justify-center"}`}>
              <AnimatedMessage isAssistant={!isUser}>
                <div className={`max-w-[80%] ${isUser ? "bg-gray-50 rounded-lg px-4 py-3" : ""}`}>
                  {typeof m.content === "string" ? (
                    isUser ? (
                      <div>
                        {pdf && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-2">
                            <FileIcon size={16} className="text-blue-500" />
                            <span className="text-xs text-blue-700">Arquivo PDF anexado</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">
                          {pdf ? m.content.replace(/\[(.+?)\]\(file_id:.*?\)/g, "$1") : m.content}
                        </p>
                      </div>
                    ) : (
                      <MessageContent 
                        content={m.content} 
                        isStreaming={isLoading && i === messages.length - 1 && m.role === 'assistant'} 
                      />
                    )
                  ) : (
                    <p className="text-red-500">Formato de conteúdo não suportado</p>
                  )}
                </div>
              </AnimatedMessage>
            </div>
          );
        })}

        {/* Mostrar animação de carregamento apenas se estiver carregando E não tiver resposta em progresso */}
        {isLoading && !hasResponseInProgress && (
          <div className="mb-6 flex justify-center">
            <div className="loading-message bg-blue-50 border border-blue-100 rounded-lg px-5 py-3 flex items-center gap-3">
              <div className="loading-dots flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
              </div>
              <span className="text-blue-700 font-medium text-sm">Processando sua solicitação</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6">
            <p className="font-semibold">Erro:</p>
            <p>{error}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
});

export default MessagesList;
