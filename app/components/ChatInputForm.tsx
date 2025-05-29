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
  MessageSquare,
  X,
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
  referencedImage?: {
    url: string;
    prompt?: string;
    responseId?: string;
  } | null;
  onClearReferencedImage?: () => void;
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
  referencedImage,
  onClearReferencedImage,
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
  
  // Estado para o texto visível
  const [visibleText, setVisibleText] = useState('');
  
  // toggle states for overlay buttons
  const [buscarActive, setBuscarActive] = useState(false);
  const [investigarActive, setInvestigarActive] = useState(false);
  const [gerarImagemActive, setGerarImagemActive] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar texto visível com input
  useEffect(() => {
    setVisibleText(input);
    
    // 🔧 CORREÇÃO: Sincronizar também o textarea quando o input muda externamente
    if (inputRef.current && inputRef.current.value !== input) {
      inputRef.current.value = input;
      // Ajustar altura do textarea
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(Math.max(inputRef.current.scrollHeight, 100), 280)}px`;
    }
  }, [input]);

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

    // Se temos arquivos para enviar com a mensagem
    if (pendingPdfRefs.length > 0) {
      // Adiciona referências de todos os arquivos (PDFs e imagens)
      const fileLinks = pendingPdfRefs.map(r => `[${r.name}](file_id:${r.id})`).join("\n");
      if (content) content += "\n\n";
      content += fileLinks;
    }

    if (!content) {
      console.log(`⚠️ Conteúdo vazio, cancelando envio`);
      sendingRef.current = false;
      return;
    }

    console.log(`📤 Enviando conteúdo final: "${content}"`);
    await onSubmit(content);
    
    // 🔧 CORREÇÃO: Limpar tanto o input quanto o texto visível
    setInput("");
    setVisibleText("");
    setPendingPdfRefs([]);
    
    // 🔧 CORREÇÃO: Limpar também o textarea diretamente
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = "100px"; // Reset para altura mínima
    }
    
    sendingRef.current = false;
    console.log(`✅ handleSend concluído`);
  }, [
    isLoading, 
    input,
    pendingPdfRefs, 
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
    { purpose: "vision" as UploadPurpose, label: "Imagem para análise", icon: ImageIcon, key: "vision-image" },
    { purpose: "user_data" as UploadPurpose, label: "Carregar arquivo", icon: Upload, key: "user-data" },
    { purpose: "vision" as UploadPurpose, label: "PDF – análise pontual", icon: PdfIcon, key: "vision-pdf" },
    { purpose: "assistants" as UploadPurpose, label: "PDF → banco vetorial", icon: BookOpen, key: "assistants" },
  ], []);

  // Verificar se deve exibir envio - memoizado
  const canSend = useMemo(() => {
    return !isLoading && (visibleText.trim() || pendingPdfRefs.length > 0);
  }, [isLoading, visibleText, pendingPdfRefs.length]);



  return (
    <>
      {/* Mostrar imagem referenciada */}
      {referencedImage && (
        <div className="mb-3 px-4">
          <div className="bg-gradient-to-r from-muted/20 to-accent/20 border border-border rounded-lg p-3">
            <div className="flex items-start gap-3">
              {/* Thumbnail da imagem */}
              <div className="flex-shrink-0">
                <img 
                  src={referencedImage.url} 
                  alt={referencedImage.prompt || "Imagem referenciada"}
                  className="w-16 h-16 object-cover rounded-lg border border-border"
                />
              </div>
              
              {/* Informações da imagem */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Imagem Referenciada</span>
                  {referencedImage.responseId && (
                    <span className="text-xs text-primary bg-accent px-2 py-0.5 rounded-full">
                      ID: {referencedImage.responseId.slice(-8)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {referencedImage.prompt || "Imagem para análise"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Digite sua pergunta sobre esta imagem abaixo
                </p>
              </div>
              
              {/* Botão para remover referência */}
              <button
                onClick={onClearReferencedImage}
                className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                title="Remover referência"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mostrar os arquivos pendentes como badges */}
      {pendingPdfRefs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-4">
          {pendingPdfRefs.map(r => (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                  r.isImage ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
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
      <div className="sticky bottom-0 border-t border-border bg-background py-4">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="relative flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-visible">
            <div className="flex-grow relative">
              {/* Textarea */}
              <textarea
                ref={inputRef}
                className="w-full pt-[30px] pb-[70px] pl-[30px] pr-[30px] bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[100px] max-h-[280px] overflow-auto rounded-t-lg"
                placeholder="Digite sua mensagem..."
                rows={1}
                onPaste={e => {
                  // Não prevenir o comportamento padrão - deixar o React lidar com o paste
                  // O onChange será chamado automaticamente após o paste
                  setTimeout(() => {
                    // Apenas reajustar a altura após o paste
                    const el = inputRef.current;
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = `${Math.min(Math.max(el.scrollHeight, 100), 280)}px`;
                    }
                  }, 0);
                }}
                value={visibleText}
                style={{ 
                  boxSizing: 'border-box',
                  textOverflow: 'ellipsis',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word'
                }}
                onChange={e => {
                  const newText = e.target.value;
                  
                  if (newText.length <= MAX_CHAR_LIMIT) {
                    setInput(newText);
                    
                    // Ajustar altura do textarea
                    setTimeout(() => {
                      if (e.target) {
                        e.target.style.height = "auto";
                        e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 100), 280)}px`;
                      }
                    }, 0);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    if (e.shiftKey) {
                      // Shift+Enter: inserir quebra de linha manualmente
                      e.preventDefault();
                      const textarea = e.target as HTMLTextAreaElement;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const currentValue = textarea.value;
                      const newValue = currentValue.substring(0, start) + '\n' + currentValue.substring(end);
                      
                      if (newValue.length <= MAX_CHAR_LIMIT) {
                        setInput(newValue);
                        
                        // Reposicionar cursor após a quebra de linha
                        setTimeout(() => {
                          textarea.selectionStart = textarea.selectionEnd = start + 1;
                          textarea.style.height = "auto";
                          textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 100), 280)}px`;
                        }, 0);
                      }
                    } else {
                      // Enter simples: enviar mensagem
                      e.preventDefault();
                      handleSend(e);
                    }
                  }
                }}
              />

              {/* Overlay de botões */}
              <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between bg-card/80 backdrop-blur-sm p-2 rounded-lg border border-border">
                {/* botões da esquerda */}
                <div className="flex items-center space-x-2">
                  {/* CNIS toggle no overlay */}
                  <button
                    type="button"
                    onClick={toggleCnis}
                    aria-pressed={cnisActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors ${
                      cnisActive ? "bg-primary/20 text-primary" : "bg-transparent text-muted-foreground"
                    }`}
                  >
                    <FileTextIcon size={20} />
                    <span className="ml-1 text-sm">CNIS</span>
                  </button>
                  {/* Abertura de menu */}
                  <button
                    type="button"
                    onClick={() => setShowUploadMenu(prev => !prev)}
                    className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={20} />
                  </button>

                  {/* Buscar */}
                  <button
                    type="button"
                    onClick={toggleBuscar}
                    aria-pressed={buscarActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors ${
                      buscarActive ? "bg-primary/20 text-primary" : "bg-transparent text-muted-foreground"
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
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors ${
                      investigarActive ? "bg-primary/20 text-primary" : "bg-transparent text-muted-foreground"
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
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors ${
                      gerarImagemActive ? "bg-primary/20 text-primary" : "bg-transparent text-muted-foreground"
                    }`}
                  >
                    <ImageIcon size={20} />
                    <span className="ml-1 text-sm">Criar imagem</span>
                  </button>
                  {/* Menu adicional */}
                  <button type="button" className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* botões da direita */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={onAudioCapture} 
                    disabled={isLoading} 
                    className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground disabled:text-muted-foreground/50 transition-colors"
                  >
                    <Mic size={20} />
                  </button>
                  <button 
                    onClick={handleSend} 
                    disabled={!canSend} 
                    className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors"
                  >
                    <ArrowUp size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Upload menu */}
            {showUploadMenu && (
              <div ref={uploadMenuRef} className="absolute bottom-20 left-4 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-50">
                {uploadMenuItems.map(item => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setFileUploadPurpose(item.purpose);
                      fileInputRef.current?.click();
                      setShowUploadMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <item.icon size={16} className="mr-2 text-muted-foreground" /> {item.label}
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
                    const isImage = file.type.startsWith('image/');
                    
                    // Para PDFs, sempre usar user_data conforme recomendação atual da OpenAI
                    // Para imagens, usar vision para análise visual
                    let purposeToUse = fileUploadPurpose;
                    if (isPdf) {
                      purposeToUse = 'user_data';
                      console.log('Arquivo PDF detectado, usando purpose user_data');
                    } else if (isImage && fileUploadPurpose === 'user_data') {
                      // Se for imagem e o purpose for user_data (padrão), mudar para vision
                      purposeToUse = 'vision';
                      console.log('Arquivo de imagem detectado, usando purpose vision');
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