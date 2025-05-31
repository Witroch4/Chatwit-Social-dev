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
  File,
  BookOpen,
  Globe,
  Search,
  MoreHorizontal,
  MessageSquare,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  UploadCloud,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FileWithContent } from "@/hooks/useChatwitIA";
import FileManager from "./ChatwitIA/FileManager";
import DocumentViewer from "./ChatwitIA/DocumentViewer";
import ImageEditor from "./ChatwitIA/ImageEditor";
import axios from "axios";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

export type UploadPurpose = "vision" | "assistants" | "user_data";

// 🔧 NOVO: Estado de upload de arquivo
interface FileUploadState {
  id: string;
  name: string;
  isImage: boolean;
  fileType?: string;
  status: 'uploading' | 'syncing' | 'completed' | 'error';
  useUrl?: boolean;
  storageUrl?: string;
  openaiFileId?: string;
  error?: string;
  progress?: number;
}

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
  const [fileUploadUseUrl, setFileUploadUseUrl] = useState<boolean>(false);
  
  // 🔧 NOVO: Estados para controlar uploads e bloqueio
  const [uploadingFiles, setUploadingFiles] = useState<FileUploadState[]>([]);
  const [completedFiles, setCompletedFiles] = useState<FileUploadState[]>([]);
  
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

  // 🔧 NOVO: Verificar se há uploads em andamento
  const isUploading = useMemo(() => {
    return uploadingFiles.some(file => file.status === 'uploading' || file.status === 'syncing');
  }, [uploadingFiles]);

  // 🔧 NOVO: Combinar arquivos pendentes para exibição
  const pendingPdfRefs = useMemo(() => {
    const completedAsRefs = completedFiles.filter(f => f.status === 'completed').map(f => ({
      id: f.openaiFileId || f.id,
      name: f.name,
      isImage: f.isImage,
      fileType: f.fileType,
      useUrl: f.useUrl,
      storageUrl: f.storageUrl
    }));
    return completedAsRefs;
  }, [completedFiles]);

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

  // 🔧 NOVO: useEffect para definir altura inicial do textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Definir altura inicial correta
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 120), 280)}px`;
      
      // Se não há conteúdo, garantir altura mínima
      if (!textarea.value || textarea.value.trim() === '') {
        textarea.style.height = "120px";
      }
    }
  }, []); // Executar apenas no mount

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

  // 🔧 NOVA: Função para processar arquivo e mostrar progresso
  const processFile = useCallback(async (file: File, purpose: UploadPurpose, useUrl: boolean) => {
    const fileId = Math.random().toString(36).substr(2, 9);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    
    // Determinar purpose correto
    let finalPurpose = purpose;
    if (isPdf && purpose === 'vision' && !useUrl) {
      finalPurpose = 'user_data'; // PDFs pontuais usam user_data
    }

    // "Carregar arquivo" = purpose vision + useUrl true (converte PDF e usa URLs diretas)
    const isFileConversionMode = purpose === 'vision' && useUrl;

    // Adicionar arquivo ao estado de uploading
    const uploadState: FileUploadState = {
      id: fileId,
      name: file.name,
      isImage,
      fileType: file.type,
      status: 'uploading',
      useUrl: useUrl,
      progress: 0
    };

    setUploadingFiles(prev => [...prev, uploadState]);

    try {
      // 🔧 NOVA LÓGICA: Se é "Carregar arquivo" (vision + useUrl), usar endpoint especial que converte PDF
      if (isFileConversionMode) {
        console.log(`📤 Processando arquivo para análise (conversão): ${file.name}`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', purpose); // Manter vision
        
        if (currentSessionId) {
          formData.append('sessionId', currentSessionId);
        }

        // Usar endpoint especial que converte PDF para imagens
        const processResponse = await fetch('/api/upload/process-files', {
          method: 'POST',
          body: formData,
        });

        if (!processResponse.ok) {
          throw new Error(`Processamento falhou: ${processResponse.statusText}`);
        }

        const processResult = await processResponse.json();
        console.log(`✅ Processamento concluído: ${file.name}`, processResult);

        if (!processResult.success) {
          throw new Error(processResult.error || 'Erro no processamento');
        }

        // Criar referências para todas as imagens (convertidas ou originais)
        const imageUrls = processResult.image_urls || [];
        const fileReferences = imageUrls.map((url: string, index: number) => ({
          id: `${fileId}-img-${index}`,
          name: isPdf ? `${file.name} - Página ${index + 1}` : file.name,
          isImage: true,
          useUrl: true,
          storageUrl: url,
          status: 'completed' as const,
          progress: 100
        }));

        // Remover do uploading e adicionar aos completed
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        setCompletedFiles(prev => [...prev, ...fileReferences]);

        toast.success(`✅ ${file.name} processado: ${imageUrls.length} imagem(ns) prontas para análise!`);
        return;
      }

      // Lógica original para outros purposes
      console.log(`📤 Iniciando upload: ${file.name}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', finalPurpose);
      
      if (currentSessionId) {
        formData.append('sessionId', currentSessionId);
      }

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload falhou: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log(`✅ Upload concluído: ${file.name}`, uploadResult);

      // Atualizar progresso
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, storageUrl: uploadResult.url, progress: 50 }
          : f
      ));

      // Fase 2: Para imagens usando Files API, sincronizar com OpenAI
      if (isImage && !useUrl) {
        console.log(`🔄 Iniciando sincronização OpenAI: ${file.name}`);
        
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'syncing', progress: 75 }
            : f
        ));

        const syncResponse = await fetch('/api/chatwitia/files/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            fileId: uploadResult.id,
            storageUrl: uploadResult.url,
            filename: file.name,
            fileType: file.type,
            purpose: 'vision',
            sessionId: currentSessionId
          }),
        });

        if (!syncResponse.ok) {
          throw new Error(`Erro ao sincronizar: ${syncResponse.statusText}`);
        }

        const syncResult = await syncResponse.json();
        console.log(`✅ Sincronização concluída: ${file.name}`, syncResult);

        if (!syncResult.openaiFileId) {
          throw new Error('Não foi possível obter file_id da OpenAI');
        }

        // Marcar como concluído
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        setCompletedFiles(prev => [...prev, {
          ...uploadState,
          id: uploadResult.id,
          openaiFileId: syncResult.openaiFileId,
          storageUrl: uploadResult.url,
          status: 'completed',
          progress: 100
        }]);

        toast.success(`✅ ${file.name} processado com sucesso!`);
      } else if (isImage && useUrl) {
        // Para imagens usando URL direta
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        setCompletedFiles(prev => [...prev, {
          ...uploadState,
          id: uploadResult.url, // Para URL direta, usar a URL como ID
          storageUrl: uploadResult.url,
          status: 'completed',
          progress: 100
        }]);

        toast.success(`✅ ${file.name} carregado com sucesso!`);
      } else if (isPdf) {
        // Para PDFs, tentar sincronizar
        console.log(`🔄 Iniciando sincronização PDF: ${file.name}`);
        
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'syncing', progress: 75 }
            : f
        ));

        try {
          const syncResponse = await fetch('/api/chatwitia/files/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              fileId: uploadResult.id,
              storageUrl: uploadResult.url,
              filename: file.name,
              fileType: file.type,
              purpose: finalPurpose,
              sessionId: currentSessionId
            }),
          });

          if (syncResponse.ok) {
            const syncResult = await syncResponse.json();
            const finalId = syncResult.openaiFileId || uploadResult.id;
            
            setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
            setCompletedFiles(prev => [...prev, {
              ...uploadState,
              id: uploadResult.id,
              openaiFileId: syncResult.openaiFileId,
              storageUrl: uploadResult.url,
              status: 'completed',
              progress: 100
            }]);

            toast.success(`✅ ${file.name} processado com sucesso!`);
          } else {
            // Sync falhou, mas usar ID interno
            setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
            setCompletedFiles(prev => [...prev, {
              ...uploadState,
              id: uploadResult.id,
              storageUrl: uploadResult.url,
              status: 'completed',
              progress: 100
            }]);

            toast.warning(`⚠️ ${file.name} carregado (sync pendente)`);
          }
        } catch (syncError) {
          console.error('Erro ao sincronizar PDF:', syncError);
          
          // Usar mesmo assim
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
          setCompletedFiles(prev => [...prev, {
            ...uploadState,
            id: uploadResult.id,
            storageUrl: uploadResult.url,
            status: 'completed',
            progress: 100
          }]);

          toast.warning(`⚠️ ${file.name} carregado (sync falhou)`);
        }
      }

    } catch (error) {
      console.error(`❌ Erro ao processar ${file.name}:`, error);
      
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              progress: 0
            }
          : f
      ));

      toast.error(`❌ Erro ao processar ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [currentSessionId]);

  // Handle send with debounce against duplicates
  const handleSend = useCallback(async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    
    // 🔧 NOVO: Bloquear se há uploads em andamento
    if (isLoading || sendingRef.current || isUploading) {
      if (isUploading) {
        toast.warning('⏳ Aguarde o processamento das imagens terminar');
      }
      console.log(`⏸️ Bloqueando envio: isLoading=${isLoading}, sending=${sendingRef.current}, uploading=${isUploading}`);
      return;
    }
    
    sendingRef.current = true;

    console.log(`🚀 Iniciando handleSend com conteúdo: "${input.trim()}"`);

    // Cria conteúdo apropriado para diferentes tipos de arquivos
    let content = input.trim();

    // Se temos arquivos para enviar com a mensagem
    if (pendingPdfRefs.length > 0) {
      // Adiciona referências de todos os arquivos (PDFs e imagens)
      const fileLinks = pendingPdfRefs.map(r => {
        // 🔧 CORREÇÃO: Para imagens com useUrl: true, usar formato markdown de imagem
        if (r.useUrl && r.isImage && r.storageUrl) {
          return `![${r.name}](${r.storageUrl})`;
        } else {
          // Para outros tipos (PDFs ou imagens via Files API), usar file_id
          return `[${r.name}](file_id:${r.id})`;
        }
      }).join("\n");
      if (content) content += "\n\n";
      content += fileLinks;
    }

    if (!content) {
      console.log(`⚠️ Conteúdo vazio, cancelando envio`);
      sendingRef.current = false;
      return;
    }

    console.log(`📤 Enviando conteúdo final: "${content}"`);

    // 🔧 CORREÇÃO: Limpar input IMEDIATAMENTE após capturar o conteúdo
    setInput("");
    setVisibleText("");
    setCompletedFiles([]); // Limpar arquivos processados após envio
    
    // 🔧 CORREÇÃO: Limpar também o textarea diretamente e resetar altura
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = "120px"; // Reset para altura mínima atualizada
    }

    // Agora enviar a mensagem (sem await para não bloquear a limpeza)
    try {
      await onSubmit(content);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      sendingRef.current = false;
    }
    
    console.log(`✅ handleSend concluído`);
  }, [
    isLoading, 
    input,
    pendingPdfRefs, 
    onSubmit, 
    currentSessionId, 
    setInput,
    isUploading
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
          const fileType = file.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const fileObj = new (File as any)([blob], file.filename, { type: fileType } as FilePropertyBag);
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
    { purpose: "vision" as UploadPurpose, label: "Imagem para análise", icon: ImageIcon, key: "vision-image", useUrl: true },
    { purpose: "vision" as UploadPurpose, label: "Imagens Para Exemplo", icon: ImageIcon, key: "vision-files", useUrl: false },
    { purpose: "vision" as UploadPurpose, label: "Carregar arquivo (PDF + Imagens)", icon: Upload, key: "vision-files-convert", useUrl: true },
    { purpose: "vision" as UploadPurpose, label: "Carregar PDF", icon: File, key: "vision-pdf", useUrl: false },
  ], []);

  // 🔧 ATUALIZADO: Verificar se deve exibir envio - incluir upload em andamento
  const canSend = useMemo(() => {
    return !isLoading && !isUploading && (visibleText.trim() || pendingPdfRefs.length > 0);
  }, [isLoading, isUploading, visibleText, pendingPdfRefs.length]);

  // 🔧 NOVO: Configurar drag and drop para "Carregar arquivos (PDF + Imagens)"
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isUploading) {
      toast.warning('⏳ Aguarde o processamento atual terminar');
      return;
    }

    // Usar sempre a configuração de "Carregar arquivos (PDF + Imagens)"
    // purpose: "vision" + useUrl: true (converte PDF e usa URLs diretas)
    const purpose: UploadPurpose = "vision";
    const useUrl = true;

    console.log(`🎯 Drag & Drop: ${acceptedFiles.length} arquivo(s) detectado(s)`);
    
    // Processar todos os arquivos em paralelo
    const processPromises = acceptedFiles.map(file => 
      processFile(file, purpose, useUrl)
    );
    
    // Aguardar todos os processamentos
    await Promise.allSettled(processPromises);
    
    toast.success(`📁 ${acceptedFiles.length} arquivo(s) processado(s) via drag & drop!`);
  }, [isUploading, processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    noClick: true, // Impedir clique na área toda
    noKeyboard: true, // Desabilitar teclado
    // Aceitar os mesmos tipos de arquivo
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

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

      {/* 🔧 NOVO: Mostrar arquivos sendo carregados com progresso */}
      {uploadingFiles.length > 0 && (
        <div className="mb-3 px-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Processando arquivos... ({uploadingFiles.length})
              </span>
            </div>
            
            <div className="space-y-2">
              {uploadingFiles.map(file => (
                <div key={file.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {file.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-amber-800 dark:text-amber-200 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-300">
                        {file.status === 'uploading' && '⬆️ Enviando...'}
                        {file.status === 'syncing' && '🔄 Sincronizando...'}
                        {file.status === 'error' && '❌ Erro'}
                      </span>
                    </div>
                    
                    {file.status === 'error' && file.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {file.error}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setUploadingFiles(prev => prev.filter(f => f.id !== file.id))}
                    className="flex-shrink-0 p-1 text-amber-600 hover:text-red-500 transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* 🔧 NOVO: Aviso sobre bloqueio de envio */}
            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded px-2 py-1">
              ⏳ O envio de mensagens está bloqueado até o processamento ser concluído
            </div>
          </div>
        </div>
      )}

      {/* Mostrar os arquivos concluídos como previews modernos */}
      {pendingPdfRefs.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3 px-4">
          {pendingPdfRefs.map(r => (
            <div key={r.id} className="group relative">
              {r.isImage ? (
                // Preview moderno para imagens (similar ao ChatGPT)
                <div className="relative bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    {/* Thumbnail da imagem */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={r.useUrl ? r.id : (r.storageUrl || r.id)}
                        alt={r.name}
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    </div>
                    
                    {/* Informações da imagem */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <ImageIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {r.name}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ✅ {r.useUrl ? "Pronto para análise" : "Processado (Files API)"}
                      </p>
                    </div>
                    
                    {/* Botão de remover */}
                    <button
                      onClick={() => setCompletedFiles(prev => prev.filter(f => (f.openaiFileId || f.id) !== r.id))}
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-600 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center"
                      title={`Remover ${r.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                // Badge para outros tipos de arquivo (PDFs, etc.)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border ${
                      r.fileType === 'application/pdf' 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                      {r.fileType === 'application/pdf' ? (
                        <File className="w-3 h-3" />
                      ) : (
                        <FileTextIcon className="w-3 h-3" />
                      )}
                      <span className="truncate max-w-32">{r.name}</span>
                      <button
                        onClick={() => setCompletedFiles(prev => prev.filter(f => (f.openaiFileId || f.id) !== r.id))}
                        className="text-current opacity-60 hover:opacity-100 transition-opacity ml-1"
                        title={`Remover ${r.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Arquivo: {r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ✅ {r.fileType === 'application/pdf' ? 'PDF processado' : 'Arquivo pronto'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
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
            // Não usar mais pendingPdfRefs diretamente - seria necessário adaptação se usado
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

      {/* 🔧 NOVO: Área de input com Drag & Drop */}
      <div 
        {...getRootProps()}
        className="sticky bottom-0 border-t border-border bg-background py-4 relative"
      >
        {/* 🔧 NOVO: Overlay de drag & drop */}
        {isDragActive && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 rounded-lg border-2 border-primary border-dashed flex items-center justify-center">
            <div className="text-center">
              <UploadCloud className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-lg font-semibold text-primary">
                Solte os arquivos aqui
              </p>
              <p className="text-sm text-muted-foreground">
                PDFs serão convertidos em imagens automaticamente
              </p>
            </div>
          </div>
        )}

        <input {...getInputProps()} />

        <div className="container mx-auto max-w-6xl px-4">
          <div className="relative flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-visible">
            <div className="flex-grow relative">
              {/* Textarea */}
              <textarea
                ref={inputRef}
                className="w-full pt-[30px] pb-[50px] pl-[30px] pr-[30px] bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[120px] max-h-[280px] overflow-auto rounded-t-lg"
                placeholder={isUploading ? "⏳ Aguardando processamento de arquivos..." : isDragActive ? "📁 Solte os arquivos aqui..." : "Digite sua mensagem ou arraste arquivos..."}
                rows={1}
                disabled={isUploading} // 🔧 NOVO: Desabilitar durante upload
                style={{ 
                  height: '120px', // 🔧 CORREÇÃO: Altura inicial maior
                  boxSizing: 'border-box',
                  textOverflow: 'ellipsis',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word',
                  opacity: isUploading ? 0.6 : 1 // 🔧 NOVO: Feedback visual durante upload
                }}
                onPaste={e => {
                  if (isUploading) {
                    e.preventDefault();
                    return;
                  }
                  setTimeout(() => {
                    const el = inputRef.current;
                    if (el) {
                      // 🔧 CORREÇÃO: Se o texto está vazio, voltar para altura mínima
                      if (el.value.trim() === '') {
                        el.style.height = "120px";
                      } else {
                        el.style.height = "auto";
                        el.style.height = `${Math.min(Math.max(el.scrollHeight, 120), 280)}px`;
                      }
                    }
                  }, 0);
                }}
                value={visibleText}
                onChange={e => {
                  if (isUploading) return; // 🔧 NOVO: Bloquear edição durante upload
                  
                  const newText = e.target.value;
                  
                  if (newText.length <= MAX_CHAR_LIMIT) {
                    setInput(newText);
                    
                    setTimeout(() => {
                      if (e.target) {
                        // 🔧 CORREÇÃO: Se o texto foi removido completamente, voltar para altura mínima
                        if (newText.trim() === '') {
                          e.target.style.height = "120px";
                        } else {
                          e.target.style.height = "auto";
                          e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 120), 280)}px`;
                        }
                      }
                    }, 0);
                  }
                }}
                onKeyDown={e => {
                  if (isUploading) {
                    e.preventDefault();
                    return;
                  }
                  
                  if (e.key === "Enter") {
                    if (e.shiftKey) {
                      e.preventDefault();
                      const textarea = e.target as HTMLTextAreaElement;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const currentValue = textarea.value;
                      const newValue = currentValue.substring(0, start) + '\n' + currentValue.substring(end);
                      
                      if (newValue.length <= MAX_CHAR_LIMIT) {
                        setInput(newValue);
                        
                        setTimeout(() => {
                          textarea.selectionStart = textarea.selectionEnd = start + 1;
                          textarea.style.height = "auto";
                          textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 120), 280)}px`;
                        }, 0);
                      }
                    } else {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }
                }}
              />

              {/* Overlay de botões */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between bg-card/90 backdrop-blur-sm p-2 rounded-lg border border-border shadow-sm">
                {/* botões da esquerda */}
                <div className="flex items-center space-x-2">
                  {/* CNIS toggle no overlay */}
                  <button
                    type="button"
                    onClick={toggleCnis}
                    disabled={isUploading} // 🔧 NOVO: Desabilitar durante upload
                    aria-pressed={cnisActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors disabled:opacity-50 ${
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
                    disabled={isUploading} // 🔧 NOVO: Desabilitar durante upload
                    className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <Plus size={20} />
                  </button>

                  {/* Buscar */}
                  <button
                    type="button"
                    onClick={toggleBuscar}
                    disabled={isUploading} // 🔧 NOVO: Desabilitar durante upload
                    aria-pressed={buscarActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors disabled:opacity-50 ${
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
                    disabled={isUploading} // 🔧 NOVO: Desabilitar durante upload
                    aria-pressed={investigarActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors disabled:opacity-50 ${
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
                    disabled={isUploading} // 🔧 NOVO: Desabilitar durante upload
                    aria-pressed={gerarImagemActive}
                    className={`flex items-center px-3 py-1 rounded-full hover:bg-accent transition-colors disabled:opacity-50 ${
                      gerarImagemActive ? "bg-primary/20 text-primary" : "bg-transparent text-muted-foreground"
                    }`}
                  >
                    <ImageIcon size={20} />
                    <span className="ml-1 text-sm">Criar imagem</span>
                  </button>
                  
                  {/* Menu adicional */}
                  <button 
                    type="button" 
                    disabled={isUploading} // 🔧 NOVO: Desabilitar durante upload
                    className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* botões da direita */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={onAudioCapture} 
                    disabled={isLoading || isUploading} // 🔧 NOVO: Incluir upload no disable
                    className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground disabled:text-muted-foreground/50 transition-colors"
                  >
                    <Mic size={20} />
                  </button>
                  
                  <button 
                    onClick={handleSend} 
                    disabled={!canSend} 
                    className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <ArrowUp size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Upload menu */}
            {showUploadMenu && !isUploading && ( // 🔧 NOVO: Ocultar menu durante upload
              <div ref={uploadMenuRef} className="absolute bottom-20 left-4 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[220px] z-50">
                {uploadMenuItems.map(item => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setFileUploadPurpose(item.purpose);
                      setFileUploadUseUrl(item.useUrl);
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
                if (!e.target.files || isUploading) return; // 🔧 NOVO: Bloquear se já há upload
                
                const filesToProcess = Array.from(e.target.files);
                
                // Processar todos os arquivos em paralelo
                const processPromises = filesToProcess.map(file => 
                  processFile(file, fileUploadPurpose, fileUploadUseUrl)
                );
                
                // Aguardar todos os processamentos
                await Promise.allSettled(processPromises);
                
                e.target.value = "";
              }}
              multiple
              accept="image/*,application/pdf"
              disabled={isUploading} // 🔧 NOVO: Desabilitar input durante upload
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInputForm;