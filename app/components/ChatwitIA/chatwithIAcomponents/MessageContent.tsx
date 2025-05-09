// app/components/ChatwitIA/chatwithIAcomponents/MessageContent.tsx
"use client";

//import { CodeProps } from "react-markdown/lib/ast-to-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import CodeBlock from "./CodeBlock";
import { FileIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface Props {
  content: string;
  isStreaming?: boolean;
}

export default function MessageContent({ content, isStreaming = false }: Props) {
  if (!content) return null;

  // Detecta referências a arquivos para exibir aviso
  const hasFileReference = /\[.*?\]\(file_id:.*?\)/.test(content);

  const processed = hasFileReference
    ? content.replace(/\[(.+?)\]\(file_id:(.+?)\)/g, "**[ARQUIVO: $1]**")
    : content;

  const proseClass =
    "prose prose-slate dark:prose-invert max-w-none break-words " +
    (isStreaming ? "stream-content" : "stream-complete");

  return (
    <div className={proseClass}>
      {hasFileReference && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-3">
          <FileIcon size={18} className="text-blue-500" />
          <span className="text-sm text-blue-700">
            Arquivo PDF anexado à mensagem
          </span>
        </div>
      )}

      <ReactMarkdown
        // --------- plugins ----------
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
        // --------- custom renderers ----------
        components={{
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            // Bloco ```math``` vira KaTeX automaticamente (remark-math lida)
            if (!inline && language !== "math") {
              return (
                <div className="not-prose">
                  <CodeBlock
                    language={language}
                    value={String(children).replace(/\n$/, "")}
                  />
                </div>
              );
            }

            if (inline) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <code
                      className="bg-gray-100 px-1 py-0.5 rounded-md font-mono text-sm text-gray-800"
                      {...props}
                    >
                      {children}
                    </code>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Trecho de código inline</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            // language==="math" já foi convertido, então cai aqui
            return <code {...props}>{children}</code>;
          }
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
