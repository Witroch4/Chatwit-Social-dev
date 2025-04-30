"use client";

import { useState, useEffect, useRef } from "react";
import { 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Eye, 
  MoreVertical, 
  Edit, 
  Trash, 
  FileText, 
  FilePlus, 
  RefreshCw,
  Phone,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  File,
  Download,
  Loader2,
  FileUp,
  Edit3
} from "lucide-react";
import { toast, useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { downloadImagesAsZip } from "../utils/download-zip";
import { ImageGalleryDialog } from "./image-gallery-dialog";

// IMPORTANTE: Este componente NÃO deve envolver <tr> em <div>.
import { LeadContextMenu, ContextType, ContextAction } from "./lead-context-menu";
import { DeleteFileButton } from "./delete-file-button";
import { DialogDetalheLead } from "./dialog-detalhe-lead";
import { ProcessDialog, ProcessType } from "./process-dialog";
import { LeadChatwit } from "../types";
import { ManuscritoDialog } from "./manuscrito-dialog";

interface ArquivoLeadChatwit {
  id: string;
  fileType: string;
  dataUrl: string;
  pdfConvertido?: string | null;
  createdAt: string;
}

interface LeadItemProps {
  lead: LeadChatwit;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (lead: LeadChatwit) => void;
  onUnificar: (id: string) => void;
  onConverter: (id: string) => void;
  onDigitarManuscrito: (lead: LeadChatwit) => void;
  isUnifying: boolean;
  isConverting: string | null;
}

export function LeadItem({
  lead,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
  onUnificar,
  onConverter,
  onDigitarManuscrito,
  isUnifying,
  isConverting,
}: LeadItemProps) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDeletedFile, setIsDeletedFile] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processType, setProcessType] = useState<ProcessType>("unify");
  const [processStartTime, setProcessStartTime] = useState<number | null>(null);
  const [isDigitando, setIsDigitando] = useState(false);
  const [showManuscritoDialog, setShowManuscritoDialog] = useState(false);
  const [confirmDeleteManuscrito, setConfirmDeleteManuscrito] = useState(false);
  const [manuscritoToDelete, setManuscritoToDelete] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Estados para o espelho de correção
  const [showEspelhoSeletor, setShowEspelhoSeletor] = useState(false);
  const [selectedEspelhoImages, setSelectedEspelhoImages] = useState<string[]>([]);
  const [isEnviandoEspelho, setIsEnviandoEspelho] = useState(false);
  const [hasEspelho, setHasEspelho] = useState(!!lead.espelhoCorrecao);

  const displayName = lead.nomeReal || lead.name || "Lead sem nome";
  const formattedDate = format(new Date(lead.createdAt ?? new Date()), "dd/MM/yyyy HH:mm", { locale: ptBR });
  
  // Efeito para detectar alterações no campo espelhoCorrecao do lead
  useEffect(() => {
    setHasEspelho(!!lead.espelhoCorrecao);
  }, [lead.espelhoCorrecao]);
  
  // Efeito para configurar um EventSource para ouvir eventos de manuscrito processado
  useEffect(() => {
    // Verifica se o lead está aguardando um manuscrito e não está com o manuscrito processado
    if (lead.aguardandoManuscrito && !lead.manuscritoProcessado) {
      // Fecha qualquer EventSource existente
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Cria um novo EventSource para ouvir eventos específicos para este lead
      const eventSource = new EventSource(`/api/admin/leads-chatwit/sse?leadId=${lead.id}`);
      eventSourceRef.current = eventSource;
      
      // Configura o handler para o evento 'manuscrito_processado'
      eventSource.addEventListener('manuscrito_processado', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Verifica se o evento é para este lead
          if (data.leadId === lead.id) {
            // Atualiza o lead com os novos dados
            onEdit({
              ...lead,
              manuscritoProcessado: true,
              aguardandoManuscrito: false,
              provaManuscrita: data.provaManuscrita || lead.provaManuscrita,
              _skipDialog: true
            });
            
            // Mostra um toast notificando que o manuscrito foi processado
            toast({
              title: "Manuscrito processado",
              description: "O manuscrito foi processado com sucesso e está disponível para edição.",
              variant: "default",
              action: (
                <ToastAction altText="Editar" onClick={() => setShowManuscritoDialog(true)}>
                  Editar agora
                </ToastAction>
              )
            });
            
            // Fecha o EventSource, pois não precisamos mais ouvir
            eventSource.close();
            eventSourceRef.current = null;
            
            // Desativa o estado de digitação
            setIsDigitando(false);
          }
        } catch (error) {
          console.error("Erro ao processar evento de manuscrito:", error);
        }
      });
      
      // Configura handlers para erros
      eventSource.onerror = (error) => {
        console.error("Erro no EventSource:", error);
        // Fecha o EventSource em caso de erro
        eventSource.close();
        eventSourceRef.current = null;
      };
      
      // Retorna uma função de limpeza
      return () => {
        eventSource.close();
        eventSourceRef.current = null;
      };
    } else {
      // Se o lead não está aguardando manuscrito, fecha qualquer EventSource existente
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  }, [lead.id, lead.aguardandoManuscrito, lead.manuscritoProcessado, onEdit, toast]);

  const handleDelete = () => {
    setConfirmDelete(false);
    onDelete(lead.id);
  };

  const openChatwitChat = () => {
    if (!lead.leadUrl) {
      toast({
        title: "Erro",
        description: "Link do chat não encontrado.",
        variant: "destructive",
      });
      return;
    }
    window.open(lead.leadUrl, "_blank");
  };
  
  const openWhatsApp = () => {
    if (!lead.phoneNumber) {
      toast({
        title: "Erro",
        description: "Número de telefone não encontrado.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = lead.phoneNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  const openFile = (url: string) => {
    window.open(url, "_blank");
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="h-3.5 w-3.5 text-red-500" />;
      case "image":
      case "jpg":
      case "jpeg":
      case "png":
        return <ImageIcon className="h-3.5 w-3.5 text-green-500" />;
      case "doc":
      case "docx":
      case "xls":
      case "xlsx":
      case "ppt":
      case "pptx":
        return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <File className="h-3.5 w-3.5" />;
    }
  };

  const handleDeleteFile = async (fileId: string, type: "arquivo" | "pdf" | "imagem") => {
    try {
      setIsDeletedFile(fileId);
      const params = new URLSearchParams();
      
      if (type === "arquivo") {
        params.append("id", fileId);
        params.append("type", "arquivo");
      } else if (type === "pdf" || type === "imagem") {
        params.append("leadId", lead.id);
        params.append("type", type);
      }
      
      const response = await fetch(`/api/admin/leads-chatwit/arquivos?${params.toString()}`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Atualiza o estado local imediatamente
        if (typeof onEdit === 'function') {
          onEdit({
            ...lead,
            _skipDialog: true, // Adiciona flag para evitar abrir o dialog
            _internal: true // Evita reabrir o dialog
          });
        }
        return Promise.resolve();
      } else {
        throw new Error(data.error || "Erro ao excluir arquivo");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o arquivo. Tente novamente.",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsDeletedFile(null);
    }
  };
  
  // Função para recarregar dados do lead após a exclusão
  const reloadAfterDelete = () => {
    // A atualização acontecerá em dois momentos:
    // 1. Atualização imediata local (para feedback rápido ao usuário)
    // 2. Atualização completa via API (para sincronizar com o servidor)
    
    // Atualização local imediata (otimista)
    if (typeof onEdit === 'function') {
      // Chama onEdit para recarregar o lead atual
      onEdit({
        ...lead,
        _skipDialog: true // Flag para evitar abrir o dialog
      });
    }
    
    // Atualização completa via API após um pequeno atraso
    window.setTimeout(() => {
      if (typeof onEdit === 'function') {
        // Força uma atualização completa da lista de leads
        onEdit({
          ...lead,
          _skipDialog: true // Flag para evitar abrir o dialog
        });
      }
      
      // Exibe feedback ao usuário
      toast({
        title: "Atualizado",
        description: "Lista de arquivos atualizada com sucesso",
      });
    }, 500);
  };
  
  const handleContextMenuAction = async (action: ContextAction, data?: any) => {
    // Forçamos o fechamento do menu de contexto antes de qualquer ação
    // Isso evita que o menu permaneça aberto quando um diálogo é aberto
    document.body.click(); // Força o fechamento de qualquer menu aberto
    
    // Pequeno delay para garantir que o menu fechou antes de executar a ação
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (action) {
      case 'atualizarLista':
        toast({
          title: "Atualizando",
          description: "Atualizando lista de leads...",
        });
        // Chame aqui a função de recarregar lista, se houver
        break;
      case 'abrirLead':
        setDetailsOpen(true);
        break;
      case 'reunificarArquivos':
        handleUnificarArquivos(lead.id);
        break;
      case 'reconverterImagem':
        handlePdfToImages();
        break;
      case 'excluirArquivo':
        if (data) {
          handleDeleteFile(data.id, data.type);
        }
        break;
      // Adicionar os casos para o manuscrito
      case 'editarManuscrito':
        if (lead.manuscritoProcessado) {
          setShowManuscritoDialog(true);
        }
        break;
      case 'reenviarManuscrito':
        // Delegar para a função específica de manuscrito
        if (data && data.id) {
          handleManuscritoContextAction(action, data);
        }
        break;
      case 'excluirManuscrito':
        // Delegar para a função específica de manuscrito
        if (data && data.id) {
          handleManuscritoContextAction(action, data);
        }
        break;
      default:
        break;
    }
  };

  const handleEditLead = async (leadData: any) => {
    try {
      setIsSaving(true);
      
      // Se for uma edição que não deve abrir o dialog, apenas atualiza
      if (leadData._skipDialog) {
        await onEdit(leadData);
        return;
      }
      
      await onEdit({
        ...leadData,
        _internal: true // Indicando que é uma edição interna
      });
      
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Houve um erro ao atualizar o lead",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailsOpen(true);
  };

  // Função para obter as imagens convertidas do PDF
  const getConvertedImages = () => {
    // Verificar se o lead tem imagensConvertidas
    if (lead.imagensConvertidas) {
      try {
        // Desserializar a string JSON para obter o array de URLs
        const imageUrls = JSON.parse(lead.imagensConvertidas);
        // Verificar se é um array e retorna somente URLs válidas
        if (Array.isArray(imageUrls)) {
          return imageUrls.filter(url => typeof url === 'string' && url.trim().length > 0);
        }
      } catch (error) {
        console.error("Erro ao processar URLs de imagens convertidas:", error);
      }
    }
    
    // Fallback: se não tiver imagensConvertidas ou ocorrer erro, tenta pegar pelas propriedades dos arquivos
    return lead.arquivos
      .filter(a => a.pdfConvertido)
      .map(a => a.pdfConvertido || "")
      .filter(url => url.length > 0);
  };
  
  // Função para fazer download de todas as imagens como ZIP
  const handleDownloadAllImages = async () => {
    const images = getConvertedImages();
    
    if (images.length === 0) {
      toast({
        title: "Erro",
        description: "Não há imagens para baixar",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar novamente" onClick={() => handlePdfToImages()}>
            Converter PDF
          </ToastAction>
        ),
      });
      return;
    }
    
    setIsDownloading(true);
    
    try {
      toast({
        title: "Preparando download",
        description: "Aguarde enquanto preparamos suas imagens...",
      });
      
      const result = await downloadImagesAsZip(images, `lead-${lead.id.substring(0, 8)}`);
      
      if (result && typeof result === 'object' && result.success) {
        toast({
          title: "Download concluído",
          description: `${result.success} de ${result.total} imagens baixadas com sucesso.`,
        });
      } else {
        throw new Error("Falha ao criar o arquivo ZIP");
      }
    } catch (error: any) {
      console.error("Erro ao baixar imagens:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível baixar as imagens",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar novamente" onClick={() => handleDownloadAllImages()}>
            Tentar novamente
          </ToastAction>
        ),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUnificarArquivos = (leadId: string) => {
    // Configurar para exibir o dialog de unificação
    setProcessType("unify");
    setShowProcessDialog(true);
    setProcessStartTime(Date.now());
    
    // Chamar a função de unificação após um pequeno delay
    setTimeout(() => {
      onUnificar(leadId);
    }, 500);
  };

  const handlePdfToImages = async () => {
    // Configurar para exibir o dialog de conversão
    setProcessType("convert");
    setShowProcessDialog(true);
    setProcessStartTime(Date.now());
    
    try {
      setIsLoadingImages(true);
      
      // Pequeno delay para garantir que o dialog apareça
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Chama a função de conversão que foi passada como prop
      await onConverter(lead.id);

      // Aguarda um pequeno delay para a atualização ser processada
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Sucesso",
        description: "Conversão de PDF para imagens concluída",
      });
      
    } catch (error: any) {
      console.error("Erro ao converter PDF para imagens:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível converter o PDF para imagens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingImages(false);
      // Fecha o dialog apenas após iniciar o processo de atualização
      setTimeout(() => {
        setShowProcessDialog(false);
      }, 500);
    }
  };

  const handleDigitarClick = async () => {
    // Se o manuscrito já estiver processado, abre o dialog de edição independente de outros estados
    if (lead.manuscritoProcessado) {
      setIsDigitando(false); // Importante: desativa o estado de digitação antes de abrir o diálogo
      setShowManuscritoDialog(true);
      return;
    }
    
    // Para criar novo manuscrito, verifica se já está processando
    if (isDigitando || lead.aguardandoManuscrito) return;
    
    // Verifica se há um diálogo aberto e fecha se necessário
    if (showManuscritoDialog) {
      setShowManuscritoDialog(false);
      return;
    }
    
    setIsDigitando(true);
    try {
      // Marca o lead como aguardando manuscrito antes de enviar para o processamento
      // Isso evita múltiplos cliques enquanto está em processamento
      await onEdit({
        ...lead,
        aguardandoManuscrito: true,
        _skipDialog: true
      });

      // Exibe o toast antes de chamar a API
      toast({
        title: "Iniciando processo",
        description: "Iniciando processo de digitação do manuscrito...",
      });

      // Preparar o payload para envio
      const payload = {
        leadID: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        telefone: lead.phoneNumber,
        manuscrito: true,
        arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
          id: a.id,
          url: a.dataUrl,
          tipo: a.fileType,
          nome: a.fileType
        })),
        arquivos_pdf: lead.pdfUnificado ? [{
          id: lead.id,
          url: lead.pdfUnificado,
          nome: "PDF Unificado"
        }] : [],
        arquivos_imagens: lead.imagensConvertidas ? JSON.parse(lead.imagensConvertidas).map((url: string, index: number) => ({
          id: `${lead.id}-img-${index}`,
          url: url,
          nome: `Página ${index + 1}`
        })) : [],
        metadata: {
          leadUrl: lead.leadUrl,
          sourceId: lead.sourceId,
          concluido: lead.concluido,
          fezRecurso: lead.fezRecurso
        }
      };

      // Enviar para a nova rota de processamento
      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Se houver erro, desmarcar o estado de aguardando manuscrito
        await onEdit({
          ...lead,
          aguardandoManuscrito: false,
          _skipDialog: true
        });
        
        throw new Error(data.error || "Erro ao enviar manuscrito para processamento");
      }

      // Se chegou aqui, deu sucesso
      toast({
        title: "Processo iniciado com sucesso",
        description: "O processo de digitação foi iniciado e você será notificado quando estiver concluído.",
        variant: "default",
        action: (
          <ToastAction altText="Atualizar" onClick={handleRefreshList}>
            Atualizar lista
          </ToastAction>
        ),
      });
      
      // Mantém o estado de digitação por 3 segundos para mostrar a animação
      setTimeout(() => {
        setIsDigitando(false);
      }, 3000);
      
    } catch (error: any) {
      setIsDigitando(false);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar processo",
        description: error.message || "Não foi possível iniciar o processo de digitação. Tente novamente.",
      });
    }
  };

  // Função para fechar o diálogo do manuscrito
  const handleCloseManuscritoDialog = () => {
    // Desativa imediatamente o estado de digitação
    setIsDigitando(false);
    
    // Fecha o diálogo com um pequeno delay para evitar problemas de estado
    // Este padrão evita problemas de corrida entre abrir/fechar diálogos
    setTimeout(() => {
      setShowManuscritoDialog(false);
    }, 50);
  };

  const handleSaveManuscrito = async (texto: string) => {
    try {
      const response = await fetch("/api/admin/leads-chatwit/manuscrito", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          texto,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao atualizar manuscrito");
      }

      // Atualizar o lead localmente
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          provaManuscrita: texto,
          _skipDialog: true,
        });
      }
    } catch (error: any) {
      throw error;
    }
  };

  // Função para cancelar o processamento do manuscrito
  const handleCancelarProcessamentoManuscrito = async () => {
    try {
      // Exibir um toast informando que está cancelando o processamento
      toast({
        title: "Cancelando processamento",
        description: "Cancelando o processamento do manuscrito...",
      });
      
      // Atualizar o lead para marcar como não aguardando mais
      await onEdit({
        ...lead,
        aguardandoManuscrito: false,
        _skipDialog: true
      });
      
      toast({
        title: "Processamento cancelado",
        description: "O processamento do manuscrito foi cancelado com sucesso.",
        variant: "default",
        action: (
          <ToastAction altText="Tentar novamente" onClick={handleDigitarClick}>
            Tentar novamente
          </ToastAction>
        ),
      });
    } catch (error: any) {
      console.error("Erro ao cancelar processamento:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar o processamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleManuscritoContextAction = async (action: ContextAction, data?: any) => {
    if (!data || !data.id) return;
    
    // Forçamos o fechamento do menu de contexto antes de qualquer ação
    // Isso evita que o menu permaneça aberto quando um diálogo é aberto
    document.body.click(); // Força o fechamento de qualquer menu aberto
    
    // Pequeno delay para garantir que o menu fechou antes de executar a ação
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (action) {
      case 'editarManuscrito':
        if (lead.manuscritoProcessado) {
          setShowManuscritoDialog(true);
        }
        break;
        
      case 'cancelarProcessamentoManuscrito':
        if (lead.aguardandoManuscrito) {
          handleCancelarProcessamentoManuscrito();
        }
        break;
        
      case 'reenviarManuscrito':
        // Verifica se está aguardando manuscrito
        if (lead.aguardandoManuscrito) {
          toast({
            title: "Processamento em andamento",
            description: "Este manuscrito já está sendo processado. Aguarde a conclusão.",
            variant: "default",
          });
          return;
        }
        
        // Para reenviar manuscrito, precisamos evitar que ele abra o diálogo
        // se o manuscrito já estiver processado
        if (lead.manuscritoProcessado) {
          // Desativa a flag de manuscrito processado temporariamente para forçar o reenvio
          // Esta abordagem modifica temporariamente o estado local para permitir reenvio
          await onEdit({
            ...lead,
            manuscritoProcessado: false,
            aguardandoManuscrito: true,
            _internal: true,
            _skipDialog: true
          });
          
          // Pequeno delay para garantir que o estado foi atualizado
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          // Se não estiver processado, marca como aguardando
          await onEdit({
            ...lead,
            aguardandoManuscrito: true,
            _skipDialog: true
          });
        }
        
        // Agora que o estado foi atualizado, podemos enviar o manuscrito
        // sem abrir o diálogo de edição
        setIsDigitando(true);
        try {
          const payload = {
            leadID: lead.id,
            nome: lead.nomeReal || lead.name || "Lead sem nome",
            telefone: lead.phoneNumber,
            manuscrito: true,
            arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
              id: a.id,
              url: a.dataUrl,
              tipo: a.fileType,
              nome: a.fileType
            })),
            arquivos_pdf: lead.pdfUnificado ? [{
              id: lead.id,
              url: lead.pdfUnificado,
              nome: "PDF Unificado"
            }] : [],
            arquivos_imagens: lead.imagensConvertidas ? JSON.parse(lead.imagensConvertidas).map((url: string, index: number) => ({
              id: `${lead.id}-img-${index}`,
              url: url,
              nome: `Página ${index + 1}`
            })) : [],
            metadata: {
              leadUrl: lead.leadUrl,
              sourceId: lead.sourceId,
              concluido: lead.concluido,
              fezRecurso: lead.fezRecurso
            }
          };

          const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const data = await response.json();
            
            // Se houver erro, desmarcar o estado de aguardando manuscrito
            await onEdit({
              ...lead,
              aguardandoManuscrito: false,
              _skipDialog: true
            });
            
            throw new Error(data.error || "Erro ao enviar manuscrito para processamento");
          }

          toast({
            title: "Manuscrito reenviado",
            description: "O processo de digitação foi reiniciado com sucesso.",
            variant: "default",
          });
          
          // Mantém o estado de digitação por alguns segundos para feedback
          setTimeout(() => {
            setIsDigitando(false);
          }, 2000);
        } catch (error: any) {
          setIsDigitando(false);
          toast({
            variant: "destructive",
            title: "Erro ao reenviar manuscrito",
            description: error.message || "Não foi possível reenviar o manuscrito. Tente novamente.",
          });
        }
        break;
        
      case 'excluirManuscrito':
        // Verifica se está aguardando manuscrito
        if (lead.aguardandoManuscrito) {
          toast({
            title: "Processamento em andamento",
            description: "Este manuscrito está sendo processado e não pode ser excluído neste momento.",
            variant: "default",
          });
          return;
        }
        handleExcluirManuscrito(data.id);
        break;
        
      default:
        break;
    }
  };

  const handleExcluirManuscrito = async (leadId: string) => {
    // Garantir que todos os estados estejam limpos antes de abrir o diálogo
    setIsDigitando(false);
    setShowManuscritoDialog(false);
    
    // Pequeno delay para garantir que os estados sejam limpos
    setTimeout(() => {
      setManuscritoToDelete(leadId);
      setConfirmDeleteManuscrito(true);
    }, 100);
  };

  const executeManuscritoDelete = async () => {
    if (!manuscritoToDelete) return;

    try {
      const response = await fetch(`/api/admin/leads-chatwit/manuscrito?leadId=${manuscritoToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir manuscrito");
      }

      // Atualizar o lead localmente
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          provaManuscrita: null,
          manuscritoProcessado: false,
          _skipDialog: true,
          _forceUpdate: true
        });
      }

      toast({
        title: "Sucesso",
        description: "Manuscrito excluído com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao excluir manuscrito:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o manuscrito. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      // Limpar todos os estados
      setConfirmDeleteManuscrito(false);
      setManuscritoToDelete(null);
      setIsDigitando(false);
    }
  };

  // Recarregar a lista explicitamente
  const handleRefreshList = () => {
    // Fazer reload da página ou atualizar a lista via API
    onEdit({
      ...lead,
      _skipDialog: true,
      _forceUpdate: true
    });
    
    toast({
      title: "Lista atualizada",
      description: "Os dados foram atualizados com sucesso",
    });
  };

  // Função para lidar com a seleção de imagens para o espelho de correção
  const handleToggleEspelhoImage = (imageUrl: string) => {
    setSelectedEspelhoImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      } else {
        return [...prev, imageUrl];
      }
    });
  };

  // Função para abrir o seletor de espelho
  const handleOpenEspelhoSeletor = () => {
    // Resetar a seleção antes de abrir
    setSelectedEspelhoImages([]);
    setShowEspelhoSeletor(true);
  };

  // Função para enviar as imagens selecionadas como espelho de correção
  const handleEnviarEspelho = async () => {
    if (selectedEspelhoImages.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos uma imagem para o espelho de correção.",
        variant: "default",
      });
      return;
    }

    setIsEnviandoEspelho(true);
    try {
      // Salvar as imagens selecionadas no lead primeiro
      await onEdit({
        ...lead,
        espelhoCorrecao: JSON.stringify(selectedEspelhoImages),
        _skipDialog: true
      });

      // Preparar o payload para o webhook
      const payload = {
        leadID: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        telefone: lead.phoneNumber,
        espelho: true,
        arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
          id: a.id,
          url: a.dataUrl,
          tipo: a.fileType,
          nome: a.fileType
        })),
        arquivos_pdf: lead.pdfUnificado ? [{
          id: lead.id,
          url: lead.pdfUnificado,
          nome: "PDF Unificado"
        }] : [],
        arquivos_imagens_espelho: selectedEspelhoImages.map((url: string, index: number) => ({
          id: `${lead.id}-espelho-${index}`,
          url: url,
          nome: `Espelho ${index + 1}`
        })),
        metadata: {
          leadUrl: lead.leadUrl,
          sourceId: lead.sourceId,
          concluido: lead.concluido,
          fezRecurso: lead.fezRecurso,
          manuscritoProcessado: lead.manuscritoProcessado
        }
      };

      // Enviar para a API de espelho
      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar espelho de correção");
      }

      toast({
        title: "Sucesso",
        description: "Espelho de correção enviado com sucesso!",
        variant: "default",
      });

      // Fechar o seletor após o envio bem-sucedido
      setShowEspelhoSeletor(false);
    } catch (error: any) {
      console.error("Erro ao enviar espelho de correção:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o espelho de correção. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsEnviandoEspelho(false);
    }
  };

  // Função para lidar com o menu de contexto do espelho
  const handleEspelhoContextAction = async (action: ContextAction, data?: any) => {
    // Forçamos o fechamento do menu de contexto antes de qualquer ação
    document.body.click(); // Força o fechamento de qualquer menu aberto
    
    // Pequeno delay para garantir que o menu fechou antes de executar a ação
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (action) {
      case 'selecionarEspelho':
        handleOpenEspelhoSeletor();
        break;
      case 'verEspelho':
        if (lead.espelhoCorrecao) {
          // Abrir o visualizador de imagens com as imagens do espelho
          try {
            const imagens = JSON.parse(lead.espelhoCorrecao);
            if (Array.isArray(imagens) && imagens.length > 0) {
              // Dando preferência ao visualizador existente
              setSelectedEspelhoImages(imagens);
              setShowEspelhoSeletor(true);
            }
          } catch (error) {
            console.error("Erro ao processar espelho:", error);
            toast({
              title: "Erro",
              description: "Não foi possível carregar o espelho de correção.",
              variant: "destructive",
            });
          }
        }
        break;
      case 'excluirEspelho':
        if (lead.espelhoCorrecao) {
          handleExcluirEspelho();
        }
        break;
      default:
        break;
    }
  };

  // Função para excluir o espelho de correção
  const handleExcluirEspelho = async () => {
    try {
      // Atualizar o lead para remover o espelho
      await onEdit({
        ...lead,
        espelhoCorrecao: null,
        _skipDialog: true
      });
      
      toast({
        title: "Sucesso",
        description: "Espelho de correção excluído com sucesso!",
        variant: "default",
      });
      
      setHasEspelho(false);
    } catch (error: any) {
      console.error("Erro ao excluir espelho de correção:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o espelho de correção. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para enviar imagens selecionadas como prova
  const handleSendSelectedImages = async (selectedImages: string[]) => {
    if (selectedImages.length === 0) {
      toast({
        title: "Aviso", 
        description: "Selecione pelo menos uma imagem para enviar.",
        variant: "default",
      });
      return;
    }

    try {
      // Preparar o payload para o webhook
      const payload = {
        leadID: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        telefone: lead.phoneNumber,
        prova: true, // Este é um envio de prova
        arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
          id: a.id,
          url: a.dataUrl,
          tipo: a.fileType,
          nome: a.fileType
        })),
        arquivos_pdf: lead.pdfUnificado ? [{
          id: lead.id,
          url: lead.pdfUnificado,
          nome: "PDF Unificado"
        }] : [],
        arquivos_imagens_prova: selectedImages.map((url: string, index: number) => ({
          id: `${lead.id}-prova-${index}`,
          url: url,
          nome: `Prova ${index + 1}`
        })),
        metadata: {
          manuscrito: true,
          leadUrl: lead.leadUrl,
          sourceId: lead.sourceId,
          concluido: lead.concluido,
          fezRecurso: lead.fezRecurso,
          manuscritoProcessado: lead.manuscritoProcessado
        }
      };

      // Enviar para a API
      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar imagens da prova");
      }

      toast({
        title: "Sucesso",
        description: "Imagens da prova enviadas com sucesso!",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Erro ao enviar imagens da prova:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar as imagens da prova. Tente novamente.",
        variant: "destructive",
      });
      throw error; // Re-lançar o erro para que o componente ImageGalleryDialog possa tratá-lo
    }
  };

  return (
    <>
      <TableRow className="group hover:bg-secondary/30">
        <TableCell className="w-[40px] p-2">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={(checked) => onSelect(lead.id, checked as boolean)}
            aria-label="Selecionar lead"
          />
        </TableCell>
        
        <TableCell className="w-[250px] p-2 align-top">
          <div className="flex items-start gap-2">
            <Avatar className="h-9 w-9 mt-1 cursor-pointer" onClick={() => setShowFullImage(true)}>
              {lead.thumbnail ? (
                <AvatarImage src={lead.thumbnail} alt={displayName} />
              ) : null}
              <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div 
                className="font-medium hover:text-primary hover:underline cursor-pointer" 
                onClick={handleViewDetails}
              >
                {lead.name || "Lead sem nome"}
              </div>
              {lead.nomeReal && lead.nomeReal !== lead.name && (
                <div className="text-xs text-muted-foreground">
                   {lead.nomeReal}
                </div>
              )}
              <div className="mt-1">
                {lead.phoneNumber && (
                  <p className="text-sm">
                    <Phone className="inline-block h-3 w-3 mr-1" />
                    {lead.phoneNumber}
                  </p>
                )}
                <p className="text-sm">{formattedDate}</p>
              </div>
            </div>
          </div>
        </TableCell>
        
        <TableCell className="w-[100px] p-2">
          <div className="flex flex-col">
            <div className="font-medium">{lead.usuario.name}</div>
            <Badge variant="outline" className="w-fit">
              {lead.usuario.channel}
            </Badge>
          </div>
        </TableCell>
        
        <TableCell className="w-[150px] p-2">
          <div className="flex flex-wrap gap-2">
            {lead.arquivos.length > 0 ? (
              lead.arquivos.map((arquivo) => (
                <LeadContextMenu
                  key={arquivo.id}
                  contextType="arquivo"
                  onAction={handleContextMenuAction}
                  data={{ id: arquivo.id, type: "arquivo" }}
                >
                  <div 
                    className="relative rounded-md border p-1 hover:bg-accent hover:text-accent-foreground min-w-[40px] min-h-[40px] flex items-center justify-center group cursor-pointer"
                    onClick={() => openFile(arquivo.dataUrl)}
                  >
                    {getFileTypeIcon(arquivo.fileType)}
                    <span className="text-xs ml-1">{arquivo.fileType}</span>
                    <DeleteFileButton 
                      onDelete={() => handleDeleteFile(arquivo.id, "arquivo")}
                      fileType="arquivo"
                      fileName={arquivo.fileType}
                      onSuccess={reloadAfterDelete}
                    />
                  </div>
                </LeadContextMenu>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Sem arquivos</span>
            )}
          </div>
        </TableCell>
        
        <TableCell className="w-[80px] p-2">
          {lead.pdfUnificado ? (
            <LeadContextMenu
              contextType="pdf"
              onAction={handleContextMenuAction}
              data={{ id: lead.id, type: "pdf" }}
            >
              <div 
                className="relative rounded-md border p-2 hover:bg-accent hover:text-accent-foreground flex items-center w-[60px] h-[60px] justify-center group mx-auto cursor-pointer"
                onClick={() => openFile(lead.pdfUnificado || "")}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center">
                        <FileText className="h-6 w-6 text-red-500" />
                        <span className="text-xs mt-1">PDF</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>PDF Unificado</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DeleteFileButton 
                  onDelete={() => handleDeleteFile(lead.id, "pdf")}
                  fileType="pdf"
                  onSuccess={reloadAfterDelete}
                />
              </div>
            </LeadContextMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnificarArquivos(lead.id)}
              disabled={isUnifying}
              className="w-full"
            >
              <FileUp className="h-4 w-4 mr-1" />
              Unificar
            </Button>
          )}
        </TableCell>

        <TableCell className="w-[80px] p-2">
          {lead.pdfUnificado && (
            lead.arquivos.some(a => a.pdfConvertido) ? (
              <LeadContextMenu
                contextType="imagem"
                onAction={handleContextMenuAction}
                data={{ id: lead.id, type: "imagem" }}
              >
                <div 
                  className="relative rounded-md border p-2 hover:bg-accent hover:text-accent-foreground flex items-center w-[60px] h-[60px] justify-center group mx-auto cursor-pointer"
                  onClick={() => setShowGallery(true)}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <ImageIcon className="h-6 w-6 text-green-500" />
                          <span className="text-xs mt-1">Imagens</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>PDF Convertido em Imagens</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DeleteFileButton 
                    onDelete={() => handleDeleteFile(lead.id, "imagem")}
                    fileType="imagem"
                    onSuccess={reloadAfterDelete}
                  />
                </div>
              </LeadContextMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePdfToImages()}
                disabled={isConverting === lead.id}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isConverting === lead.id ? "animate-spin" : ""}`} />
                Converter
              </Button>
            )
          )}
        </TableCell>

        <TableCell className="w-[100px] p-2">
          <LeadContextMenu
            contextType="manuscrito"
            onAction={handleManuscritoContextAction}
            data={{
              id: lead.id,
              manuscritoProcessado: !!lead.manuscritoProcessado,
              aguardandoManuscrito: !!lead.aguardandoManuscrito
            }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleDigitarClick}
              disabled={lead.manuscritoProcessado ? false : (isDigitando || lead.aguardandoManuscrito)}
              className="whitespace-nowrap w-full"
            >
              {lead.manuscritoProcessado ? (
                <>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Editar Manuscrito
                </>
              ) : lead.aguardandoManuscrito ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Aguardando processamento...
                </>
              ) : (
                <>
                  <Edit3 className={`h-4 w-4 mr-1 ${isDigitando ? "animate-spin" : ""}`} />
                  {isDigitando ? "Processando..." : "Digitar Manuscrito"}
                </>
              )}
            </Button>
          </LeadContextMenu>
        </TableCell>
        
        <TableCell className="w-[120px] p-2">
          {lead.manuscritoProcessado && (
            <LeadContextMenu
              contextType="espelho"
              onAction={handleEspelhoContextAction}
              data={{
                id: lead.id,
                hasEspelho: hasEspelho
              }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEspelhoSeletor}
                disabled={isEnviandoEspelho}
                className="whitespace-nowrap w-full"
              >
                {hasEspelho ? (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Espelho
                  </>
                ) : (
                  <>
                    <ImageIcon className={`h-4 w-4 mr-1 ${isEnviandoEspelho ? "animate-spin" : ""}`} />
                    {isEnviandoEspelho ? "Enviando..." : "Selecionar Espelho"}
                  </>
                )}
              </Button>
            </LeadContextMenu>
          )}
        </TableCell>
        
        <TableCell className="w-[60px] p-2">
          <div className="flex items-center justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleViewDetails}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver detalhes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleViewDetails}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {lead.leadUrl && (
                  <DropdownMenuItem onClick={openChatwitChat}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Abrir chat
                  </DropdownMenuItem>
                )}
                {lead.phoneNumber && (
                  <DropdownMenuItem onClick={openWhatsApp}>
                    <Phone className="h-4 w-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Diálogos */}
      <DialogDetalheLead
        lead={lead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEditLead}
        isSaving={isSaving}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o lead "{displayName}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageGalleryDialog
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        images={getConvertedImages()}
        leadId={lead.id}
        title={`Imagens de ${displayName}`}
        description="Selecione as imagens da prova para enviar. Clique em uma miniatura para ver a imagem completa."
        selectionMode={true}
        onSend={handleSendSelectedImages}
      />

      <ProcessDialog
        isOpen={showProcessDialog}
        onClose={() => setShowProcessDialog(false)}
        processType={processType}
        leadName={displayName}
        numFiles={lead.arquivos.length}
      />

      <ManuscritoDialog
        isOpen={showManuscritoDialog}
        onClose={handleCloseManuscritoDialog}
        leadId={lead.id}
        textoManuscrito={lead.provaManuscrita || ""}
        onSave={handleSaveManuscrito}
      />

      <Dialog open={confirmDeleteManuscrito} onOpenChange={(open) => {
        if (!open) {
          setConfirmDeleteManuscrito(false);
          setManuscritoToDelete(null);
          // Resetar também o estado de digitação
          setIsDigitando(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o manuscrito do lead "{displayName}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmDeleteManuscrito(false);
              setManuscritoToDelete(null);
              setIsDigitando(false);
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeManuscritoDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para seleção das imagens do espelho de correção */}
      <Dialog open={showEspelhoSeletor} onOpenChange={(open) => !open && setShowEspelhoSeletor(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Espelho de Correção</DialogTitle>
            <DialogDescription>
              Selecione as imagens que serão utilizadas como espelho de correção. Você pode selecionar mais de uma imagem.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4 text-sm text-muted-foreground">
              {selectedEspelhoImages.length === 0 ? (
                "Nenhuma imagem selecionada"
              ) : (
                `${selectedEspelhoImages.length} ${selectedEspelhoImages.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}`
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {getConvertedImages().map((imageUrl, index) => (
                <div 
                  key={index} 
                  className={`cursor-pointer border rounded-md overflow-hidden relative group ${
                    selectedEspelhoImages.includes(imageUrl) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleToggleEspelhoImage(imageUrl)}
                >
                  <div className="w-full h-40 flex items-center justify-center relative">
                    <img 
                      src={imageUrl}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                    
                    {selectedEspelhoImages.includes(imageUrl) && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="text-white bg-black/60 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Imagem {index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEspelhoSeletor(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleEnviarEspelho}
              disabled={selectedEspelhoImages.length === 0 || isEnviandoEspelho}
            >
              {isEnviandoEspelho ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Espelho'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
