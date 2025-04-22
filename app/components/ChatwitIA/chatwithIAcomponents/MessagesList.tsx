import React, { useEffect } from "react";
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

export default function MessagesList({
  messages,
  isLoading,
  error,
  containerRef,
  endRef,
}: MessagesListProps) {
  // rolar sempre que chegar nova msg
  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [messages.length]);

  if (!messages.length)
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold mb-8">ChatwitIA</h1>
        <p className="text-gray-500">Envie uma mensagem para começar.</p>
      </div>
    );

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
                      <MessageContent content={m.content} />
                    )
                  ) : (
                    <p className="text-red-500">Formato de conteúdo não suportado</p>
                  )}
                </div>
              </AnimatedMessage>
            </div>
          );
        })}

        {isLoading && (
          <div className="mb-6 flex justify-center text-gray-500 italic">
            Gerando resposta...
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
}
