// app/components/ChatInputForm.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Settings,
  Type,
  ArrowUp,
  Upload,
  Image as ImageIcon,
  Mic,
  FileText as FileTextIcon,
  File as PdfIcon,
  BookOpen,
  Globe,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FileWithContent } from "@/hooks/useChatwitIA";
import FileManager from "./ChatwitIA/FileManager";
import DocumentViewer from "./ChatwitIA/DocumentViewer";
import ImageEditor from "./ChatwitIA/ImageEditor";
import axios from "axios";
import { toast } from "sonner";

export type UploadPurpose = "vision" | "assistants" | "user_data";

export interface ChatInputFormProps {
  input: string;
  setInput: (v: string | ((p: string) => string)) => void;
  onSubmit: (content: string) => Promise<any>;
  isLoading?: boolean;
  systemPrompt?: string;
  setSystemPrompt?: (v: string) => void;
  onToggleSettings?: () => void;
  onAudioCapture?: () => void;
  onImageGenerate?: () => void;
  files?: FileWithContent[];
  onUploadFile?: (file: File, purpose: UploadPurpose, fileId?: string) => Promise<any>;
  onDeleteFile?: (id: string) => Promise<any>;
  onEditImage?: (file: File, prompt: string, mask?: File) => Promise<any>;
  onVariationImage?: (file: File) => Promise<any>;
  isFileLoading?: boolean;
  handleTranscriptReady?: (t: string) => void;
  activePdfFileId?: string | null;
  onAskPdf?: (id: string, q: string) => Promise<any>;
  onSetActivePdf?: (id: string | null) => void;
  currentSessionId?: string;
  isCnisAnalysisActive?: boolean;
  onToggleCnisAnalysis?: (isActive: boolean) => void;
  onSearchToggle?: (isActive: boolean) => void;
  onInvestigateToggle?: (isActive: boolean) => void;
  onGenerateImage?: (prompt: string) => Promise<any>;
}

const MAX_CHAR_LIMIT = 474743;

const ChatInputForm: React.FC<ChatInputFormProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading = false,
  onToggleSettings,
  onAudioCapture,
  onImageGenerate,
  files = [],
  onUploadFile,
  onDeleteFile,
  onEditImage,
  onVariationImage,
  isFileLoading = false,
  handleTranscriptReady,
  activePdfFileId,
  onAskPdf,
  onSetActivePdf,
  currentSessionId,
  isCnisAnalysisActive = false,
  onToggleCnisAnalysis,
  onSearchToggle,
  onInvestigateToggle,
  onGenerateImage,
}) => {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [cnisActive, setCnisActive] = useState(isCnisAnalysisActive);
  const [viewingFile, setViewingFile] = useState<FileWithContent | null>(null);
  const [editingFile, setEditingFile] = useState<FileWithContent | null>(null);
  const [fileUploadPurpose, setFileUploadPurpose] = useState<UploadPurpose>("user_data");
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});
  const [pendingPdfRefs, setPendingPdfRefs] = useState<{ 
    id: string; 
    name: string; 
    isImage: boolean; 
    fileType?: string;
    filename?: string;
    openaiFileId?: string;
    storageUrl?: string;
  }[]>([]);
  const [showAskPdf, setShowAskPdf] = useState(false);
  const [pdfQuestion, setPdfQuestion] = useState("");
  const sendingRef = useRef(false);
  // toggle states for overlay buttons
  const [buscarActive, setBuscarActive] = useState(false);
  const [investigarActive, setInvestigarActive] = useState(false);
  const [gerarImagemActive, setGerarImagemActive] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Detectar se o usuário está solicitando geração de imagem usando LLM
  const detectImageGenerationIntent = useCallback(async (text: string): Promise<boolean> => {
    // Verificações rápidas primeiro (para performance)
    const lowerText = text.toLowerCase();
    
    // Comandos explícitos óbvios (detecção rápida)
    const obviousCommands = [
      'gerar imagem', 'criar imagem', 'desenhar', 'gere uma imagem', 
      'crie uma imagem', 'faça uma imagem', 'crie a imagem',
      'generate image', 'create image', 'draw', 'make an image'
    ];
    
    if (obviousCommands.some(cmd => lowerText.includes(cmd))) {
      console.log(`✅ Comando óbvio detectado rapidamente`);
      return true;
    }
    
    // Se não for óbvio, usar LLM para classificação inteligente
    try {
      console.log(`🤖 Usando LLM para detectar intenção: "${text}"`);
      
      const response = await fetch('/api/chatwitia/classify-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          maxTokens: 10, // Resposta muito curta para economizar tokens
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const isImageIntent = result.isImageGeneration === true;
        console.log(`🤖 LLM classificou como geração de imagem: ${isImageIntent}`);
        return isImageIntent;
      } else {
        console.warn(`⚠️ Erro na classificação LLM, usando fallback`);
      }
    } catch (error) {
      console.warn(`⚠️ Erro na classificação LLM:`, error);
    }
    
    // Fallback: análise de padrões mais sofisticada
    const fallbackPatterns = [
      /\b(crie|faça|gere|desenhe|ilustre)\s+.*\b(imagem|desenho|ilustração|figura)/i,
      /\b(uma?|um)\s+(imagem|desenho|ilustração|figura)\s+(de|do|da)/i,
      /\bvisuali[sz]e?\s+.*\b(como|sendo)/i,
      /\bimagin[ae]\s+.*\b(visual|imagem)/i,
      /\b(como\s+seria|o\s+que\s+parece)\s+.*\b(visual|visualmente)/i
    ];
    
    const hasFallbackPattern = fallbackPatterns.some(pattern => pattern.test(text));
    if (hasFallbackPattern) {
      console.log(`✅ Padrão sofisticado detectado no fallback`);
      return true;
    }
    
    console.log(`❌ Nenhuma intenção de imagem detectada`);
    return false;
  }, []);

  // Versão síncrona da detecção (para casos onde não podemos aguardar)
  const detectImageGenerationIntentSync = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    // Comandos explícitos óbvios
    const obviousCommands = [
      'gerar imagem', 'criar imagem', 'desenhar', 'gere uma imagem', 
      'crie uma imagem', 'faça uma imagem', 'crie a imagem',
      'generate image', 'create image', 'draw', 'make an image'
    ];
    
    if (obviousCommands.some(cmd => lowerText.includes(cmd))) {
      return true;
    }
    
    // Padrões sofisticados
    const patterns = [
      /\b(crie|faça|gere|desenhe|ilustre)\s+.*\b(imagem|desenho|ilustração|figura)/i,
      /\b(uma?|um)\s+(imagem|desenho|ilustração|figura)\s+(de|do|da)/i,
      /\bvisuali[sz]e?\s+.*\b(como|sendo)/i,
      /\bimagin[ae]\s+.*\b(visual|imagem)/i
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }, []);

  // Handle send with debounce against duplicates
  const handleSend = useCallback(async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (isLoading || sendingRef.current) {
      console.log(`⏸️ Bloqueando envio: isLoading=${isLoading}, sending=${sendingRef.current}`);
      return;
    }
    sendingRef.current = true;

    console.log(`🚀 Iniciando handleSend com conteúdo: "${input.trim()}"`);

    // Sincronizar PDFs com a OpenAI antes de enviar
    const syncPdfs = async (): Promise<void> => {
      // Encontrar PDFs para sincronizar
      const pdfsToSync = pendingPdfRefs.filter(file => 
        (file.fileType === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) && 
        !file.id.startsWith('file-')
      );
      
      if (pdfsToSync.length === 0) {
        return Promise.resolve();
      }
      
      console.log('📄 Sincronizando PDFs com OpenAI:', pdfsToSync);
      
      // Sincronizar cada PDF com OpenAI
      const syncPromises = pdfsToSync.map(async (pdf) => {
        try {
          const response = await fetch('/api/chatwitia/files/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              fileId: pdf.id,
              storageUrl: pdf.storageUrl,
              filename: pdf.filename || pdf.name,
              fileType: pdf.fileType,
              purpose: 'user_data', // Sempre usar user_data para PDFs
              sessionId: currentSessionId
            }),
          });
          
          if (!response.ok) {
            console.error(`Erro HTTP ao sincronizar PDF: ${response.status}`);
            throw new Error(`Falha ao sincronizar PDF: ${response.statusText}`);
          }
          
          const result = await response.json();
          
          if (result.openaiFileId) {
            console.log(`📄 PDF sincronizado: ${pdf.filename || pdf.name} -> ${result.openaiFileId}`);
            
            // Substituir o ID interno pelo ID da OpenAI
            setPendingPdfRefs(prev =>
              prev.map(r =>
                r.id === pdf.id
                  ? { ...r, id: result.openaiFileId } // SUBSTITUIR id interno pelo openaiFileId
                  : r
              )
            );
          } else {
            console.warn(`PDF sync não retornou openaiFileId para ${pdf.name}`);
          }
        } catch (error) {
          console.error(`Erro ao sincronizar PDF ${pdf.filename || pdf.name}:`, error);
        }
      });
      
      return Promise.all(syncPromises).then(() => {});
    };
    
    // Primeiro sincronizar PDFs
    await syncPdfs();

    // Cria conteúdo apropriado para diferentes tipos de arquivos
    let content = input.trim();
    
    // Verificar se há intenção de gerar imagem (assíncrono)
    const shouldGenerateImage = await detectImageGenerationIntent(content);
    
    console.log(`🔍 Analisando texto: "${content}"`);
    console.log(`🎨 Deve gerar imagem: ${shouldGenerateImage}`);
    console.log(`🔧 onGenerateImage disponível: ${typeof onGenerateImage}`);
    console.log(`🔧 onGenerateImage existe: ${!!onGenerateImage}`);
    
    if (shouldGenerateImage) {
      if (!onGenerateImage) {
        console.log(`❌ onGenerateImage não está definido!`);
      } else {
        console.log(`✅ Todas as condições atendidas, chamando onGenerateImage`);
      }
    }
    
    if (shouldGenerateImage && onGenerateImage) {
      console.log(`🎨 Detectada intenção de gerar imagem: "${content}"`);
      
      // Extrair o prompt da imagem do texto
      let imagePrompt = content;
      
      // Remover palavras-chave de comando apenas se foram comandos explícitos
      const explicitCommands = [
        'gerar imagem', 'criar imagem', 'desenhar', 'ilustrar', 'desenhe', 'ilustre', 
        'crie uma imagem', 'faça uma imagem', 'gere uma imagem', 'crie a imagem',
        'generate image', 'create image', 'draw', 'illustrate', 'make a drawing'
      ];
      
      const hasExplicitCommand = explicitCommands.some(cmd => 
        content.toLowerCase().includes(cmd)
      );
      
      if (hasExplicitCommand) {
        // Só remover palavras-chave se foi um comando explícito
        const cleanPrompt = imagePrompt
          .replace(/^(gerar imagem|criar imagem|desenhar|ilustrar|desenhe|ilustre|crie uma imagem|faça uma imagem|gere uma imagem|crie a imagem|generate image|create image|draw|illustrate|make a drawing)\s*(de|do|da|of|a)?\s*/i, '')
          .trim();
        
        if (cleanPrompt) {
          imagePrompt = cleanPrompt;
        }
      }
      // Se não foi comando explícito, usar a descrição natural como está
      
      if (imagePrompt) {
        try {
          console.log(`🎨 Gerando imagem via onGenerateImage: "${imagePrompt}"`);
          
          // Chamar função de geração de imagem se fornecida
          await onGenerateImage(imagePrompt);
          
          // Limpar estado e sair - IMPORTANTE: não continuar para onSubmit
          setInput("");
          setPendingPdfRefs([]);
          sendingRef.current = false;
          console.log(`✅ Geração de imagem concluída, não enviando para chat normal`);
          return; // ⚠️ CRUCIAL: Retornar aqui para evitar envio duplo
        } catch (error) {
          console.error('❌ Erro ao gerar imagem:', error);
          toast.error('Erro ao gerar imagem. Enviando como mensagem normal.');
          // Se houver erro, continuar com envio normal (não fazer return)
        }
      }
    } else {
      console.log(`❌ Condição de geração de imagem não atendida - shouldGenerateImage: ${shouldGenerateImage}, onGenerateImage: ${typeof onGenerateImage}`);
    }

    console.log(`💬 Prosseguindo com envio normal do chat`);

    // Se temos arquivos para enviar com a mensagem
    if (pendingPdfRefs.length > 0) {
      // Separa imagens e outros arquivos
      const images = pendingPdfRefs.filter(ref => ref.isImage);
      const files = pendingPdfRefs.filter(ref => !ref.isImage);
      
      // Adiciona referências de arquivos não-imagem (PDFs, etc.)
      if (files.length > 0) {
        const fileLinks = files.map(r => `[${r.name}](file_id:${r.id})`).join("\n");
        if (content) content += "\n\n";
        content += fileLinks;
      }
      
      // Para imagens, cria um formato especial que a OpenAI entenderá
      if (images.length > 0) {
        // Vamos adicionar um JSON especial que será processado no backend
        // para ser transformado em formato de mensagem com imagem para OpenAI
        if (content) content += "\n\n";
        content += "<!-- IMAGES_JSON " + 
                  JSON.stringify(images.map(img => ({
                    url: img.id,
                    name: img.name
                  }))) + 
                  " -->";
      }
    }

    if (!content) {
      console.log(`⚠️ Conteúdo vazio, cancelando envio`);
      sendingRef.current = false;
      return;
    }

    console.log(`📤 Enviando conteúdo final: "${content}"`);
    await onSubmit(content);
    setInput("");
    setPendingPdfRefs([]);
    sendingRef.current = false;
    console.log(`✅ handleSend concluído`);
  }, [
    isLoading, 
    input,
    pendingPdfRefs, 
    detectImageGenerationIntent, 
    onGenerateImage, 
    onSubmit, 
    currentSessionId, 
    setInput
  ]);

  // Toggle CNIS analysis
  const toggleCnis = useCallback(() => {
    const next = !cnisActive;
    setCnisActive(next);
    onToggleCnisAnalysis?.(next);
  }, [cnisActive, onToggleCnisAnalysis]);

  const toggleBuscar = useCallback(() => {
    const next = !buscarActive;
    setBuscarActive(next);
    onSearchToggle?.(next);
  }, [buscarActive, onSearchToggle]);

  const toggleInvestigar = useCallback(() => {
    const next = !investigarActive;
    setInvestigarActive(next);
    onInvestigateToggle?.(next);
  }, [investigarActive, onInvestigateToggle]);

  // Funções adaptadoras para garantir consistência de tipos - memoizadas
  const handleDeleteFile = useCallback((fileId: string) => {
    if (onDeleteFile) {
      return onDeleteFile(fileId);
    }
    return Promise.resolve();
  }, [onDeleteFile]);

  const handleVariationImage = useCallback((fileId: string) => {
    // Encontrar o arquivo correspondente
    const file = files.find(f => f.id === fileId);
    if (file && file.content && onVariationImage) {
      // Criar um File object a partir do conteúdo base64
      fetch(file.content)
        .then(res => res.blob())
        .then(blob => {
          const fileObj = new File([blob], file.filename, { type: 'image/png' });
          return onVariationImage(fileObj);
        })
        .catch(err => {
          console.error('Erro ao processar imagem para variação:', err);
          return Promise.resolve();
        });
    }
    return Promise.resolve();
  }, [files, onVariationImage]);

  // Função adaptadora para edição de imagem - memoizada
  const handleImageEdit = useCallback((file: File, prompt: string, mask?: File) => {
    if (onEditImage) {
      return onEditImage(file, prompt, mask);
    }
    return Promise.resolve();
  }, [onEditImage]);

  // Menu items memoizado para evitar re-renders
  const uploadMenuItems = useMemo(() => [
    { purpose: "user_data" as UploadPurpose, label: "Carregar arquivo", icon: Upload },
    { purpose: "vision" as UploadPurpose, label: "PDF – análise pontual", icon: PdfIcon },
    { purpose: "assistants" as UploadPurpose, label: "PDF → banco vetorial", icon: BookOpen },
  ], []);

  // Verificar se deve exibir envio - memoizado
  const canSend = useMemo(() => {
    return !isLoading && (input.trim() || pendingPdfRefs.length > 0);
  }, [isLoading, input, pendingPdfRefs.length]);

  return (
    <>
      {/* Mostrar os arquivos pendentes como badges */}
      {pendingPdfRefs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-4">
          {pendingPdfRefs.map(r => (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                  r.isImage ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                }`}>
                  {r.isImage ? (
                    <ImageIcon size={16} /> 
                  ) : (
                    <FileTextIcon size={16} />
                  )}
                  {r.name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <code className="text-xs">
                  {r.isImage 
                    ? `Imagem: ${r.name}`
                    : `[${r.name}](file_id:${r.id})`}
                </code>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* File Manager / Document / Image Editor */}
      {showFileManager && (
        <FileManager
          files={files}
          loading={isFileLoading}
          onViewFile={id => setViewingFile(files.find(f => f.id === id) || null)}
          onDeleteFile={handleDeleteFile}
          onEditImage={editingFile => setEditingFile(files.find(f => f.id === editingFile) || null)}
          onVariationImage={handleVariationImage}
          onInsertFileReference={(id, name) => {
            setPendingPdfRefs(prev => [...prev, { id, name, isImage: false }]);
            setShowFileManager(false);
          }}
        />
      )}
      {viewingFile && (
        <DocumentViewer
          fileUrl={viewingFile.content || `/api/chatwitia/files/${viewingFile.id}/content`}
          fileName={viewingFile.filename}
          fileType={viewingFile.filename.endsWith(".pdf") ? "application/pdf" : "image"}
          onClose={() => setViewingFile(null)}
        />
      )}
      {editingFile && (
        <ImageEditor
          imageUrl={editingFile.content || `/api/chatwitia/files/${editingFile.id}/content`}
          fileName={editingFile.filename}
          onClose={() => setEditingFile(null)}
          onSave={handleImageEdit}
        />
      )}

      {/* Main input bar */}
      <div className="sticky bottom-0 border-t bg-white py-4">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="relative flex flex-col rounded-lg border bg-white shadow-sm overflow-visible">
            <div className="flex-grow relative">
              {/* Textarea */}
              <textarea
                ref={inputRef}
                className="w-full pt-[30px] pb-[70px] pl-[30px] pr-[30px] bg-transparent resize-none focus:outline-none min-h-[100px] max-h-[280px] overflow-auto rounded-t-lg"
                placeholder="Digite sua mensagem..."
                onPaste={e => {
                  // Aguarda o paste padrão e atualiza o estado + altura do textarea
                  setTimeout(() => {
                    const el = inputRef.current;
                    if (!el) return;
                    const newValue = el.value;
                    // Só atualiza se estiver dentro do limite
                    if (newValue.length <= MAX_CHAR_LIMIT) {
                      setInput(newValue);
                    }
                    // Reajusta a altura para acomodar o conteúdo
                    el.style.height = "auto";
                    el.style.height = `${Math.min(Math.max(el.scrollHeight, 100), 280)}px`;
                  }, 0);
                }}
                value={input}
                style={{ 
                  boxSizing: 'border-box',
                  textOverflow: 'ellipsis',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word'
                }}
                onChange={e => {
                  if (e.target.value.length <= MAX_CHAR_LIMIT) {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 100), 280)}px`;
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    handleSend(e);
                  }
                }}
              />

              {/* Overlay de botões */}
              <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between bg-white/80 backdrop-blur-sm p-2 rounded-lg border">
                {/* botões da esquerda */}
                <div className="flex items-center space-x-2">
                  {/* CNIS toggle no overlay */}
                  <button
                    type="button"
                    onClick={toggleCnis}
                    aria-pressed={cnisActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-gray-200 ${
                      cnisActive ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600"
                    }`}
                  >
                    <FileTextIcon size={20} />
                    <span className="ml-1 text-sm">CNIS</span>
                  </button>
                  {/* Abertura de menu */}
                  <button
                    type="button"
                    onClick={() => setShowUploadMenu(prev => !prev)}
                    className="p-2 rounded-full hover:bg-gray-200"
                  >
                    <Plus size={20} />
                  </button>

                  {/* Buscar */}
                  <button
                    type="button"
                    onClick={toggleBuscar}
                    aria-pressed={buscarActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-gray-200 ${
                      buscarActive ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600"
                    }`}
                  >
                    <Globe size={20} />
                    <span className="ml-1 text-sm">Buscar</span>
                  </button>
                  {/* Investigar */}
                  <button
                    type="button"
                    onClick={toggleInvestigar}
                    aria-pressed={investigarActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-gray-200 ${
                      investigarActive ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600"
                    }`}
                  >
                    <Search size={20} />
                    <span className="ml-1 text-sm">Investigar</span>
                  </button>
                  {/* Criar imagem */}
                  <button
                    type="button"
                    onClick={() => { setGerarImagemActive(prev => !prev); onImageGenerate?.(); }}
                    aria-pressed={gerarImagemActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-gray-200 ${
                      gerarImagemActive ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600"
                    }`}
                  >
                    <ImageIcon size={20} />
                    <span className="ml-1 text-sm">Criar imagem</span>
                  </button>
                  {/* Menu adicional */}
                  <button type="button" className="p-2 rounded-full hover:bg-gray-200">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* botões da direita */}
                <div className="flex items-center space-x-2">
                  <button onClick={onAudioCapture} disabled={isLoading} className="p-2 rounded-full hover:bg-gray-200"><Mic size={20} /></button>
                  <button onClick={handleSend} disabled={!canSend} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"><ArrowUp size={20} /></button>
                </div>
              </div>
            </div>

            {/* Upload menu */}
            {showUploadMenu && (
              <div ref={uploadMenuRef} className="absolute bottom-20 left-4 bg-white border rounded-lg shadow-lg py-1 min-w-[220px] z-50">
                {uploadMenuItems.map(item => (
                  <button
                    key={item.purpose}
                    onClick={() => {
                      setFileUploadPurpose(item.purpose);
                      fileInputRef.current?.click();
                      setShowUploadMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <item.icon size={16} className="mr-2 text-gray-500" /> {item.label}
                  </button>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async e => {
                if (!e.target.files) return;
                
                for (const file of Array.from(e.target.files)) {
                  try {
                    // Determinar se é um PDF pelo tipo MIME ou pela extensão
                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    
                    // Para PDFs, sempre usar user_data conforme recomendação atual da OpenAI
                    let purposeToUse = fileUploadPurpose;
                    if (isPdf) {
                      purposeToUse = 'user_data';
                      console.log('Arquivo PDF detectado, usando purpose user_data');
                    }
                    
                    // Criar FormData para enviar para a API local
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('purpose', purposeToUse);
                    
                    if (currentSessionId) {
                      formData.append('sessionId', currentSessionId);
                      console.log(`Enviando arquivo com sessionId: ${currentSessionId}`);
                    } else {
                      console.log('ALERTA: Enviando arquivo sem sessionId');
                    }
                    
                    console.log(`Enviando arquivo: ${file.name}, tipo: ${file.type}, purpose: ${purposeToUse}`);
                    
                    // Enviar para nossa API local
                    const response = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                    });
                    
                    if (!response.ok) {
                      throw new Error(`Upload falhou: ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    console.log('Arquivo enviado:', result);
                    
                    // Para imagens, usamos a URL direta em vez de file_id
                    if (file.type.startsWith('image/')) {
                      setPendingPdfRefs(prev => [...prev, { 
                        id: result.url, // Usamos a URL completa
                        name: file.name,
                        isImage: true,
                        fileType: file.type
                      }]);
                      console.log(`Adicionada referência de imagem, ID: ${result.url}`);
                    } else if (isPdf) {
                      // Para PDFs, tentar sincronizar imediatamente para obter o openaiFileId
                      try {
                        const syncResponse = await fetch('/api/chatwitia/files/sync', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ 
                            fileId: result.id,
                            storageUrl: result.url,
                            filename: file.name,
                            fileType: file.type,
                            purpose: 'user_data',
                            sessionId: currentSessionId
                          }),
                        });
                        
                        if (syncResponse.ok) {
                          const syncResult = await syncResponse.json();
                          console.log(`PDF sincronizado com OpenAI, fileId: ${result.id}, openaiFileId: ${syncResult.openaiFileId}`);
                          
                          // Usar diretamente o openaiFileId
                          if (syncResult.openaiFileId) {
                            setPendingPdfRefs(prev => [...prev, { 
                              id: syncResult.openaiFileId, // Usar o ID da OpenAI
                              name: file.name,
                              isImage: false,
                              fileType: file.type
                            }]);
                          } else {
                            // Fallback para o ID interno se não recebeu openaiFileId
                            setPendingPdfRefs(prev => [...prev, { 
                              id: result.id,
                              name: file.name,
                              isImage: false,
                              fileType: file.type,
                              storageUrl: result.url
                            }]);
                          }
                        } else {
                          console.error(`Erro ao sincronizar PDF: ${syncResponse.statusText}`);
                          // Adicionar mesmo assim com o ID interno
                          setPendingPdfRefs(prev => [...prev, { 
                            id: result.id,
                            name: file.name,
                            isImage: false,
                            fileType: file.type,
                            storageUrl: result.url
                          }]);
                        }
                      } catch (syncError) {
                        console.error('Erro ao sincronizar PDF:', syncError);
                        // Adicionar mesmo com o ID interno
                        setPendingPdfRefs(prev => [...prev, { 
                          id: result.id,
                          name: file.name,
                          isImage: false,
                          fileType: file.type,
                          storageUrl: result.url
                        }]);
                      }
                    } else {
                      // Outros tipos de arquivo
                      setPendingPdfRefs(prev => [...prev, { 
                        id: result.id,
                        name: file.name,
                        isImage: false,
                        fileType: file.type
                      }]);
                    }
                    
                    // Integração com OpenAI (opcional)
                    if (onUploadFile) {
                      await onUploadFile(file, purposeToUse as UploadPurpose, result.id);
                    }
                  } catch (error) {
                    console.error('Erro ao enviar arquivo:', error);
                    toast.error(`Erro ao enviar arquivo: ${error instanceof Error ? error.message : 'Desconhecido'}`);
                  }
                }
                e.target.value = "";
              }}
              multiple
            />

          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInputForm;
