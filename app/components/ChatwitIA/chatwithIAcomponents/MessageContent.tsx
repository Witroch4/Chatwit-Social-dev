import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { FileIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import CodeBlock from "./CodeBlock";

export default function MessageContent({ content }: { content: string }) {
  if (!content) return <div className="text-gray-500 italic">Aguardando resposta...</div>;

  const hasFileReference = content.match(/\[.*?\]\(file_id:(.*?)\)/);
  const processed = useMemo(
    () =>
      hasFileReference
        ? content.replace(/\[(.+?)\]\(file_id:(.+?)\)/g, "**[ARQUIVO: $1]**")
        : content,
    [content, hasFileReference]
  );

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none break-words">
      {hasFileReference && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-3">
          <FileIcon size={18} className="text-blue-500" />
          <span className="text-sm text-blue-700">
            Arquivo PDF anexado à mensagem
          </span>
        </div>
      )}

      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, children, ...props }: any) => {
            return <div className="my-2" {...props}>{children}</div>;
          },
          
          pre: ({ node, children, ...props }: any) => {
            return <div className="my-4 not-prose" {...props}>{children}</div>;
          },
          
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            
            if (!inline) {
              return (
                <div className="not-prose">
                  <CodeBlock
                    language={language}
                    value={String(children).replace(/\n$/, "")}
                  />
                </div>
              );
            }

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
          },
          
          li: ({ node, children, ...props }: any) => {
            return <li className="my-1" {...props}>{children}</li>;
          }
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
