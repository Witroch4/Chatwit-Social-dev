// app/components/ChatwitIA/chatwithIAcomponents/MessageContent.tsx
"use client";

//import { CodeProps } from "react-markdown/lib/ast-to-react";

// ESTRATÉGIA ANTI-PISCAR DE IMAGENS:
// =================================
// Para evitar o "piscar" das imagens durante a geração:
// 1. Usa o mesmo componente GeneratedImage para progresso e imagem final
// 2. Key estável baseada no src da imagem (não no index)
// 3. Transição suave via props isProgress, sem re-mount do elemento <img>
// 4. Mantém o mesmo base64 durante toda a sessão (priorizando sobre URLs do MinIO)
// 5. PRÉ-CARREGAMENTO: Quando imagem final é diferente da parcial, pré-carrega 
//    "nos bastidores" e só troca quando pronta, eliminando 100% do piscar

import React, { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import CodeBlock from "./CodeBlock";
import { FileIcon, Download, Eye, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  content: string;
  isStreaming?: boolean;
}

// Componente para exibir imagens geradas
const GeneratedImage: React.FC<{ 
  src: string; 
  alt: string; 
  prompt?: string; 
  onAspectRatioDetected?: (aspectRatio: string) => void;
  sharedAspectRatio?: string;
  isProgress?: boolean;
}> = React.memo(({ 
  src, 
  alt, 
  prompt,
  onAspectRatioDetected,
  sharedAspectRatio = '1 / 1',
  isProgress = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<string>(sharedAspectRatio);
  const [wasProgress, setWasProgress] = useState(isProgress);
  
  // NOVO: Estado para gerenciar transição suave entre imagens
  const [displaySrc, setDisplaySrc] = useState(src);
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    if (wasProgress && !isProgress && src !== displaySrc) {
      console.log('🔄 Iniciando pré-carregamento da imagem final para transição suave');
      setIsPreloading(true);
      setFinalSrc(src);
      
      const finalImage = new Image();
      finalImage.onload = () => {
        console.log('✅ Imagem final pré-carregada, fazendo transição suave');
        setDisplaySrc(src);
        setIsPreloading(false);
        setFinalSrc(null);
      };
      finalImage.onerror = () => {
        console.warn('❌ Erro no pré-carregamento, usando imagem diretamente');
        setDisplaySrc(src);
        setIsPreloading(false);
        setFinalSrc(null);
      };
      finalImage.src = src;
    } else if (isProgress || src === displaySrc) {
      setDisplaySrc(src);
    }
    
    setWasProgress(isProgress);
  }, [src, isProgress, wasProgress, displaySrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const aspectRatioString = `${aspectRatio.toFixed(3)} / 1`;
    setNaturalAspectRatio(aspectRatioString);
    setIsLoading(false);
    
    if (onAspectRatioDetected) {
      onAspectRatioDetected(aspectRatioString);
    }
    
    console.log(`🖼️ Imagem carregada - Dimensões: ${img.naturalWidth}x${img.naturalHeight}, Aspect Ratio: ${aspectRatio.toFixed(3)}`);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(displaySrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `imagem-gerada-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Imagem baixada com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      toast.error('Erro ao baixar imagem');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(displaySrc);
      toast.success('URL da imagem copiada!');
    } catch (error) {
      console.error('Erro ao copiar URL:', error);
      toast.error('Erro ao copiar URL');
    }
  };

  return (
    <div className="my-4">
      {/* Imagem */}
      <div 
        className="relative w-full transition-all duration-300 ease-in-out" 
        style={{ 
          aspectRatio: isExpanded ? 'auto' : naturalAspectRatio,
          maxWidth: '100%'
        }}
      >
        <img
          src={displaySrc}
          alt={alt}
          className={`w-full transition-all duration-300 ease-in-out rounded-lg ${
            isExpanded 
              ? 'cursor-zoom-out h-auto opacity-100' 
              : 'cursor-zoom-in h-full object-contain opacity-100'
          } ${isLoading ? 'opacity-0' : 'opacity-100'} ${
            isProgress || isPreloading ? 'opacity-80' : 'opacity-100'
          }`}
          style={{
            transition: 'opacity 0.3s ease-in-out, height 0.3s ease-in-out'
          }}
          onClick={() => !isProgress && !isPreloading && setIsExpanded(!isExpanded)}
          onLoad={handleImageLoad}
          onError={() => setIsLoading(false)}
        />
        
        {isLoading && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-gray-100 transition-opacity duration-300 rounded-lg"
            style={{ 
              aspectRatio: naturalAspectRatio,
              maxWidth: '100%'
            }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Overlay de progresso para imagens em geração */}
        {(isProgress || isPreloading) && !isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-100/20 transition-opacity duration-300 rounded-lg"></div>
        )}
        
        {/* Badge de progresso */}
        {isProgress && !isLoading && (
          <div className="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs animate-pulse">
            Progresso...
          </div>
        )}
        
        {/* Badge de carregamento da imagem final */}
        {isPreloading && !isLoading && (
          <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs animate-pulse">
            Finalizando...
          </div>
        )}
        
        {/* Overlay com botões - apenas para imagens finais */}
        {!isProgress && !isPreloading && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? 'Reduzir' : 'Expandir'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl();
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copiar URL</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Baixar imagem</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
});

GeneratedImage.displayName = 'GeneratedImage';

// Tipos para as partes do conteúdo
interface ContentPart {
  type: 'text' | 'image';
  content?: string;
  alt?: string;
  src?: string;
  prompt?: string;
  isProgress?: boolean;
}

export default React.memo(function MessageContent({ content, isStreaming = false }: Props) {
  if (!content) return null;

  // Estado para armazenar aspect-ratios detectados
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<string>('1 / 1');

  // Debug: log do conteúdo recebido (apenas uma vez por render, não repetidamente)
  const debugInfo = useMemo(() => {
    const shortContent = content.substring(0, 200) + (content.length > 200 ? '...' : '');
    console.log('MessageContent - content received:', shortContent);
    return shortContent;
  }, [content]);

  // Detecta referências a arquivos para exibir aviso
  const hasFileReference = useMemo(() => {
    return /\[.*?\]\(file_id:.*?\)/.test(content);
  }, [content]);

  // Função para detectar aspect-ratio a partir do primeiro carregamento de imagem final
  const handleAspectRatioDetection = (aspectRatio: string) => {
    if (detectedAspectRatio === '1 / 1') { // Só atualiza se ainda for o padrão
      setDetectedAspectRatio(aspectRatio);
      console.log(`📐 Aspect ratio detectado e aplicado: ${aspectRatio}`);
    }
  };

  // Processar conteúdo para extrair imagens geradas - usar useMemo para evitar re-computações
  const contentParts = useMemo((): ContentPart[] => {
    // Regex para detectar imagens markdown ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)/g;
    const parts: ContentPart[] = [];
    let lastIndex = 0;
    let match;

    // Log apenas se houver mudança no conteúdo
    const hasImages = content.includes('![');
    if (hasImages) {
      console.log('MessageContent - processing content for images...');
    }
    
    while ((match = imageRegex.exec(content)) !== null) {
      if (hasImages) {
        console.log('MessageContent - found image match:', match[1], match[2].substring(0, 50) + '...');
      }
      
      // Adicionar texto antes da imagem
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }

      // Determinar se é uma imagem parcial/progresso
      const alt = match[1] || 'Imagem gerada';
      const src = match[2] || '';
      const isProgress = alt.includes('Gerando imagem') || alt.includes('sendo gerada');

      // Adicionar imagem
      parts.push({
        type: 'image',
        alt: alt,
        src: src,
        prompt: alt && alt.includes('Imagem gerada') && !isProgress ? alt : undefined,
        isProgress: isProgress
      });

      lastIndex = match.index + match[0].length;
    }

    // Adicionar texto restante
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }

    const result = parts.length > 0 ? parts : [{ type: 'text' as const, content: content }];
    
    // Log apenas se houver imagens para reduzir spam
    if (hasImages) {
      console.log('MessageContent - processed parts:', result.length, 'parts');
      console.log('MessageContent - image parts:', result.filter(p => p.type === 'image').length);
    }
    
    return result;
  }, [content]);

  const proseClass = useMemo(() => 
    "prose prose-slate dark:prose-invert max-w-none break-words " +
    (isStreaming ? "stream-content" : "stream-complete")
  , [isStreaming]);

  const processed = hasFileReference
    ? content.replace(/\[(.+?)\]\(file_id:(.+?)\)/g, "**[ARQUIVO: $1]**")
    : content;

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

      {contentParts.map((part, index) => {
        if (part.type === 'image' && part.src && part.alt) {
          // SIMPLIFICADO: Sempre usar GeneratedImage para todas as imagens
          // O componente agora lida com ambos os estados: progresso e final
          
          // Usar uma key estável baseada na imagem para evitar re-mount
          // quando só mudar o alt (de "Gerando imagem..." para "Imagem gerada")
          const imageKey = part.src.startsWith('data:image/') 
            ? `img-${part.src.substring(0, 100)}` // Hash base64 para key estável
            : `img-${part.src}`; // URL completa para key estável
          
          return (
            <GeneratedImage
              key={imageKey}
              src={part.src}
              alt={part.alt}
              prompt={part.prompt}
              onAspectRatioDetected={handleAspectRatioDetection}
              sharedAspectRatio={detectedAspectRatio}
              isProgress={part.isProgress}
            />
          );
        } else if (part.type === 'text' && part.content) {
          // Processar o texto para remover referências de imagem já processadas
          const textContent = part.content.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '');
          
          if (!textContent.trim()) return null;

          const processedText = hasFileReference
            ? textContent.replace(/\[(.+?)\]\(file_id:(.+?)\)/g, "**[ARQUIVO: $1]**")
            : textContent;

          return (
      <ReactMarkdown
              key={index}
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
              {processedText}
      </ReactMarkdown>
          );
        }
        return null;
      })}
    </div>
  );
});
