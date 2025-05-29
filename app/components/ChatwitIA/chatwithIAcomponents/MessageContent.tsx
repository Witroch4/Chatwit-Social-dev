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
import { FileIcon, Download, Eye, Copy, MessageSquare } from "lucide-react";
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
  onImageReference?: (imageUrl: string, prompt?: string) => void;
}

// Componente para exibir imagens geradas
const GeneratedImage: React.FC<{ 
  src: string; 
  alt: string; 
  prompt?: string; 
  onAspectRatioDetected?: (aspectRatio: string) => void;
  sharedAspectRatio?: string;
  isProgress?: boolean;
  onReference?: (imageUrl: string, prompt?: string) => void;
}> = React.memo(({ 
  src, 
  alt, 
  prompt,
  onAspectRatioDetected,
  sharedAspectRatio = '1 / 1',
  isProgress = false,
  onReference
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
    
    console.log(`🖼️ Imagem carregada com sucesso - Dimensões: ${img.naturalWidth}x${img.naturalHeight}, Aspect Ratio: ${aspectRatio.toFixed(3)}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`❌ Erro ao carregar imagem: ${src}`);
    setIsLoading(false);
    
    // Se for uma thumbnail que falhou, tentar a URL original
    const img = e.currentTarget;
    if (src.includes('_thumb.') && src !== displaySrc) {
      console.log(`🔄 Tentando URL original após falha da thumbnail`);
      const originalUrl = src.replace(/_thumb\.(jpg|jpeg|png|webp)/, '.$1');
      setDisplaySrc(originalUrl);
    }
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

  const handleReference = () => {
    if (onReference) {
      onReference(displaySrc, prompt || alt);
      toast.success('Imagem referenciada! Você pode fazer uma nova pergunta sobre ela.');
    }
  };

  return (
    <div className="my-4">
      {/* Imagem */}
      <div 
        className="relative w-full transition-all duration-300 ease-in-out group" 
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
          onError={handleImageError}
        />
        
        {isLoading && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-muted/50 transition-opacity duration-300 rounded-lg"
            style={{ 
              aspectRatio: naturalAspectRatio,
              maxWidth: '100%'
            }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {/* Overlay de progresso para imagens em geração */}
        {(isProgress || isPreloading) && !isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/10 transition-opacity duration-300 rounded-lg"></div>
        )}
        
        {/* Badge de progresso */}
        {isProgress && !isLoading && (
          <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs animate-pulse">
            Progresso...
          </div>
        )}
        
        {/* Badge de carregamento da imagem final */}
        {isPreloading && !isLoading && (
          <div className="absolute bottom-2 right-2 bg-green-600 dark:bg-green-500 text-white px-2 py-1 rounded text-xs animate-pulse">
            Finalizando...
          </div>
        )}
        
        {/* Overlay com botões - apenas para imagens finais */}
        {!isProgress && !isPreloading && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-200 rounded-lg opacity-0 hover:opacity-100 flex items-center justify-center">
            {/* Botões centralizados */}
            <div className="flex gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg transform scale-90 hover:scale-100 transition-transform duration-200 border border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 w-10 p-0"
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
                    className="h-10 w-10 p-0 hover:bg-primary/20 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReference();
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Referenciar imagem</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 w-10 p-0 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
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
                    className="h-10 w-10 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400"
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

export default React.memo(function MessageContent({ content, isStreaming = false, onImageReference }: Props) {
  if (!content) return null;

  // Estado para armazenar aspect-ratios detectados
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<string>('1 / 1');

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
    let processedContent = content;
    let lastIndex = 0;

    // Log apenas se houver mudança no conteúdo
    const hasImages = content.includes('![');
    
    // Processar imagens markdown no conteúdo restante
    let match;
    while ((match = imageRegex.exec(processedContent)) !== null) {
      // Adicionar texto antes da imagem
      if (match.index > lastIndex) {
        const textBefore = processedContent.slice(lastIndex, match.index).trim();
        if (textBefore) {
          parts.push({
            type: 'text',
            content: textBefore
          });
        }
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
    if (lastIndex < processedContent.length) {
      const remainingText = processedContent.slice(lastIndex).trim();
      if (remainingText) {
        parts.push({
          type: 'text',
          content: remainingText
        });
      }
    }

    const result = parts.length > 0 ? parts : [{ type: 'text' as const, content: content }];
    
    // Log apenas se houver imagens processadas
    if (hasImages || result.filter(p => p.type === 'image').length > 0) {
      console.log('📊 MessageContent - Final processed parts:', result.length, 'parts');
      console.log('🖼️ MessageContent - Image parts:', result.filter(p => p.type === 'image').length);
    }
    
    return result;
  }, [content]);

  const proseClass = useMemo(() => 
    "prose prose-slate dark:prose-invert max-w-none break-words " +
    "w-full min-w-0 overflow-wrap-anywhere " +
    (isStreaming ? "stream-content" : "stream-complete")
  , [isStreaming]);

  const processed = content.replace(/\[(.+?)\]\(file_id:(.+?)\)/g, "**[ARQUIVO: $1]**");

  return (
    <div className={`${proseClass} w-full min-w-0`} style={{ 
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      whiteSpace: 'pre-wrap'
    }}>
      {hasFileReference && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md mb-3">
          <FileIcon size={18} className="text-blue-500" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
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
              onReference={onImageReference}
            />
          );
        } else if (part.type === 'text' && part.content) {
          // Processar o texto para remover referências de imagem já processadas
          const textContent = part.content.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '');
          
          if (!textContent.trim()) return null;

          const processedText = textContent.replace(/\[(.+?)\]\(file_id:(.+?)\)/g, "**[ARQUIVO: $1]**");

          return (
            <div key={index} className="w-full min-w-0" style={{ 
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap'
            }}>
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
                              className="bg-muted px-1 py-0.5 rounded-md font-mono text-sm text-foreground"
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
            </div>
          );
        }
        return null;
      })}
    </div>
  );
});
