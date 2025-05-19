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
  Edit3,
  FileCheck
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
import { EspelhoDialog } from "./espelho-dialog";
import { AnaliseDialog } from "./analise-dialog";
import { AnalisePreviewDrawer } from "./analise-preliminar-drawer";

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
  const [showEspelhoSeletor, setShowEspelhoSeletor] = useState(false);
  const [selectedEspelhoImages, setSelectedEspelhoImages] = useState<string[]>([]);
  const [isEnviandoEspelho, setIsEnviandoEspelho] = useState(false);
  const [confirmDeleteAllFiles, setConfirmDeleteAllFiles] = useState(false);
  const temImagensEspelho = lead.espelhoCorrecao && 
                            lead.espelhoCorrecao !== '[]' && 
                            lead.espelhoCorrecao !== '""';
  const temTextoEspelho = !!lead.textoDOEspelho && (
    (typeof lead.textoDOEspelho === 'string' && lead.textoDOEspelho.trim() !== '') ||
    (Array.isArray(lead.textoDOEspelho) && lead.textoDOEspelho.length > 0) ||
    (typeof lead.textoDOEspelho === 'object' && lead.textoDOEspelho !== null)
  );
  const [hasEspelho, setHasEspelho] = useState(temImagensEspelho || temTextoEspelho);
  const [showEspelhoDialog, setShowEspelhoDialog] = useState(false);
  const [confirmDeleteEspelho, setConfirmDeleteEspelho] = useState(false);
  const [showManuscritoImageSeletor, setShowManuscritoImageSeletor] = useState(false);
  const [manuscritoProcessadoLocal, setManuscritoProcessadoLocal] = useState(!!lead.manuscritoProcessado);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Estados para a análise
  const [showAnaliseDialog, setShowAnaliseDialog] = useState(false);
  const [isEnviandoAnalise, setIsEnviandoAnalise] = useState(false);
  const [isEnviandoPdf, setIsEnviandoPdf] = useState(false);
  const [localAnaliseState, setLocalAnaliseState] = useState({
    analiseUrl: lead.analiseUrl,
    aguardandoAnalise: !!lead.aguardandoAnalise,
    analisePreliminar: lead.analisePreliminar,
    analiseValidada: !!lead.analiseValidada
  });
  
  // Estado para controlar o Drawer de pré-análise
  const [showAnalisePreviewDrawer, setShowAnalisePreviewDrawer] = useState(false);
  const [isEnviandoAnaliseValidada, setIsEnviandoAnaliseValidada] = useState(false);
  // Remover estado para o diálogo de análise validada
  const [showAnaliseValidadaDialog, setShowAnaliseValidadaDialog] = useState(false);

  const displayName = lead.nomeReal || lead.name || "Lead sem nome";
  const formattedDate = format(new Date(lead.createdAt ?? new Date()), "dd/MM/yyyy HH:mm", { locale: ptBR });
  
  useEffect(() => {
    // Verificar corretamente se há espelho (imagens ou texto)
    const temImagens = lead.espelhoCorrecao && 
                      lead.espelhoCorrecao !== '[]' && 
                      lead.espelhoCorrecao !== '""';
    const temTexto = !!lead.textoDOEspelho && (
      (typeof lead.textoDOEspelho === 'string' && lead.textoDOEspelho.trim() !== '') ||
      (Array.isArray(lead.textoDOEspelho) && lead.textoDOEspelho.length > 0) ||
      (typeof lead.textoDOEspelho === 'object' && lead.textoDOEspelho !== null)
    );
    
    // Log para depuração
    console.log('Estado do espelho atualizado:', {
      leadId: lead.id,
      temImagens,
      temTexto,
      espelhoCorrecao: lead.espelhoCorrecao,
      textoDOEspelho: lead.textoDOEspelho
    });
    
    // Atualizar o estado local
    setHasEspelho(temImagens || temTexto);
    
    // Força re-renderização do componente quando o estado do espelho for atualizado
    setRefreshKey(prev => prev + 1);
  }, [lead.espelhoCorrecao, lead.textoDOEspelho]);

  useEffect(() => {
    setManuscritoProcessadoLocal(!!lead.manuscritoProcessado);
    setRefreshKey(prev => prev + 1);
  }, [lead.manuscritoProcessado]);

  useEffect(() => {
    // Força re-renderização do componente quando o estado de manuscrito for atualizado
    setRefreshKey(prev => prev + 1);
  }, [manuscritoProcessadoLocal]);

  // Adicionar um useEffect específico para o hasEspelho
  useEffect(() => {
    // Força re-renderização do componente quando o estado do espelho for atualizado
    setRefreshKey(prev => prev + 1);
  }, [hasEspelho]);

  // Sincronizar estado local com props sempre que o lead mudar
  useEffect(() => {
    setLocalAnaliseState({
      analiseUrl: lead.analiseUrl,
      aguardandoAnalise: !!lead.aguardandoAnalise,
      analisePreliminar: lead.analisePreliminar,
      analiseValidada: !!lead.analiseValidada
    });
  }, [lead.analiseUrl, lead.aguardandoAnalise, lead.analisePreliminar, lead.analiseValidada, refreshKey]);

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
      case 'excluirTodosArquivos':
        handleDeleteAllFiles();
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
    // Se já tiver manuscrito processado, apenas abra o diálogo de edição
    if (manuscritoProcessadoLocal || lead.manuscritoProcessado) {
      setShowManuscritoDialog(true);
      return;
    }
    
    // Se estiver processando, não faça nada
    if (isDigitando) return;
    
    // Abre o seletor de imagens para o manuscrito
    setShowManuscritoImageSeletor(true);
  };

  // Função para processar o envio do manuscrito após seleção das imagens
  const handleEnviarManuscrito = async (selectedImages: string[]) => {
    if (selectedImages.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos uma imagem para o manuscrito.",
        variant: "default",
      });
      return;
    }

    // Fechar o seletor de imagens
    setShowManuscritoImageSeletor(false);
    
    // Mostrar o estado de carregamento
    setIsDigitando(true);
    
    try {
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
        // Usa apenas as imagens selecionadas pelo usuário
        arquivos_imagens: selectedImages.map((url: string, index: number) => ({
          id: `${lead.id}-img-${index}`,
          url: url,
          nome: `Página ${index + 1}`
        })),
        metadata: {
          leadUrl: lead.leadUrl,
          sourceId: lead.sourceId,
          concluido: lead.concluido,
          fezRecurso: lead.fezRecurso
        }
      };

      // Enviar para a rota de processamento
      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar manuscrito para processamento");
      }

      // Se chegou aqui, deu sucesso
      toast({
        title: "Manuscrito processado com sucesso",
        description: "Você já pode editar o manuscrito.",
        variant: "default",
      });
      
      // Atualizar o estado local do componente
      setManuscritoProcessadoLocal(true);
      
      // Forçar refresh do componente para garantir que a UI seja atualizada
      setRefreshKey(prev => prev + 1);
      
      // Limpar o estado de digitação
      setIsDigitando(false);
      
      // Abrir o diálogo de edição imediatamente
      setShowManuscritoDialog(true);
      
    } catch (error: any) {
      setIsDigitando(false);
      toast({
        variant: "destructive",
        title: "Erro ao enviar manuscrito",
        description: error.message || "Não foi possível enviar o manuscrito. Tente novamente.",
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

  const handleManuscritoContextAction = async (action: ContextAction, data?: any) => {
    // Forçamos o fechamento do menu de contexto antes de qualquer ação
    document.body.click(); // Força o fechamento de qualquer menu aberto
    
    // Pequeno delay para garantir que o menu fechou antes de executar a ação
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (action) {
      case 'editarManuscrito':
        // Abrir o diálogo de edição de manuscrito
        setShowManuscritoDialog(true);
        break;
        
      case 'reenviarManuscrito':
        // Implementação simplificada: apenas abrir o seletor de imagens novamente
        setShowManuscritoImageSeletor(true);
        break;
        
      case 'excluirManuscrito':
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
      
      // Atualizar o estado local do manuscrito processado
      setManuscritoProcessadoLocal(false);

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
  const handleEnviarEspelho = async (selectedImages: string[]) => {
    if (selectedImages.length === 0) {
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
        espelhoCorrecao: JSON.stringify(selectedImages),
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
        arquivos_imagens_espelho: selectedImages.map((url: string, index: number) => ({
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

      // Fecha o diálogo de confirmação
      setConfirmDeleteEspelho(false);

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
        // Abrir o dialog de edição do espelho mesmo se apenas o textoDoEspelho existir
        if (lead.espelhoCorrecao || lead.textoDOEspelho) {
          setShowEspelhoDialog(true);
        } else {
          // Caso nenhum dos dois exista, mostrar mensagem informativa
          toast({
            title: "Espelho não encontrado",
            description: "Não foi possível encontrar o espelho de correção. Crie um novo selecionando imagens.",
            variant: "default",
          });
        }
        break;
      case 'excluirEspelho':
        // Verificar se existe espelho (imagens ou texto)
        const temImagens = lead.espelhoCorrecao && lead.espelhoCorrecao !== '[]';
        const temTexto = !!lead.textoDOEspelho && (
          (typeof lead.textoDOEspelho === 'string' && lead.textoDOEspelho.trim() !== '') ||
          (Array.isArray(lead.textoDOEspelho) && lead.textoDOEspelho.length > 0) ||
          (typeof lead.textoDOEspelho === 'object' && lead.textoDOEspelho !== null)
        );
        
        if (temImagens || temTexto) {
          // Abrir diálogo de confirmação
          setConfirmDeleteEspelho(true);
        } else {
          // Se não existe espelho, apenas definir hasEspelho como false
          // e forçar a atualização do botão
          setHasEspelho(false);
          setRefreshKey(prev => prev + 1);
          
          toast({
            title: "Aviso",
            description: "Não há espelho para excluir.",
            variant: "default",
          });
        }
        break;
      default:
        break;
    }
  };

  // Função para excluir o espelho de correção
  const handleExcluirEspelho = async () => {
    try {
      // Antes de realizar a exclusão, guardamos os estados atuais
      const estadoAtual = {
        textoDOEspelho: lead.textoDOEspelho,
        espelhoCorrecao: lead.espelhoCorrecao
      };
      
      // Primeiro atualizamos o estado local para feedback imediato ao usuário
      setHasEspelho(false);
      
      // Atualizar também o estado do objeto lead local
      // Garantimos que o textoDOEspelho será uma string vazia independente do tipo original
      lead.textoDOEspelho = ""; 
      lead.espelhoCorrecao = JSON.stringify([]);
      
      // Forçar refresh do componente para atualizar o botão
      setRefreshKey(prev => prev + 1);
      
      // Criamos um lead atualizado com campos vazios para o espelho
      const updatedLead = {
        ...lead,
        textoDOEspelho: "", // String vazia para o texto
        espelhoCorrecao: JSON.stringify([]), // Array vazio para as imagens
      };
      
      // Enviamos para a API
      try {
        await onEdit({
          ...updatedLead,
          _skipDialog: true,
          _forceUpdate: true
        });
        
        // Garantir que o estado local seja atualizado
        setTimeout(() => {
          // Força uma segunda atualização para garantir que a UI esteja sincronizada
          setHasEspelho(false);
          setRefreshKey(prev => prev + 1);
        }, 100);
        
        toast({
          title: "Espelho excluído",
          description: "O espelho de correção foi removido com sucesso.",
          variant: "default",
        });
      } catch (error: any) {
        // Em caso de erro, restauramos os estados originais
        console.error("Erro ao excluir espelho:", error);
        
        // Restaurar o estado local e do objeto lead
        lead.textoDOEspelho = estadoAtual.textoDOEspelho;
        lead.espelhoCorrecao = estadoAtual.espelhoCorrecao;
        
        // Verificar novamente se há espelho
        const temImagens = estadoAtual.espelhoCorrecao && 
                           estadoAtual.espelhoCorrecao !== '[]' && 
                           estadoAtual.espelhoCorrecao !== '""';
        const temTexto = !!estadoAtual.textoDOEspelho && (
          (typeof estadoAtual.textoDOEspelho === 'string' && estadoAtual.textoDOEspelho.trim() !== '') ||
          (Array.isArray(estadoAtual.textoDOEspelho) && estadoAtual.textoDOEspelho.length > 0) ||
          (typeof estadoAtual.textoDOEspelho === 'object' && estadoAtual.textoDOEspelho !== null)
        );
        
        setHasEspelho(temImagens || temTexto);
        
        // Exibimos uma mensagem de erro
        toast({
          title: "Erro",
          description: "Não foi possível excluir o espelho. Tente novamente.",
          variant: "destructive",
        });
      }

      // Fecha o diálogo de confirmação
      setConfirmDeleteEspelho(false);
    } catch (error: any) {
      console.error("Erro ao processar exclusão do espelho:", error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao processar a exclusão.",
        variant: "destructive",
      });
    }
  };

  // Função para editar/salvar o espelho
  const handleSaveEspelho = async (textoEspelho: any, imagensEspelho: string[]) => {
    try {
      // Atualizar o lead com o texto e imagens do espelho
      await onEdit({
        ...lead,
        espelhoCorrecao: JSON.stringify(imagensEspelho),
        textoDOEspelho: textoEspelho,
        _skipDialog: true
      });
      
      toast({
        title: "Sucesso",
        description: "Espelho de correção atualizado com sucesso!",
        variant: "default",
      });
      
      // Determinar se há espelho com base nas mesmas regras rigorosas
      const temImagensNovas = imagensEspelho && imagensEspelho.length > 0;
      const temTextoNovo = !!textoEspelho && (
        // Se for string, verifica se não está vazia
        (typeof textoEspelho === 'string' && textoEspelho.trim() !== '') ||
        // Se for array, verifica se tem elementos
        (Array.isArray(textoEspelho) && textoEspelho.length > 0) ||
        // Se for objeto, considera como tendo conteúdo
        (typeof textoEspelho === 'object' && textoEspelho !== null)
      );
      
      // Atualizar o estado local
      setHasEspelho(temImagensNovas || temTextoNovo);
      
      // Atualizar também o lead local
      lead.textoDOEspelho = textoEspelho;
      lead.espelhoCorrecao = JSON.stringify(imagensEspelho);
      
      // Forçar atualização da interface
      setRefreshKey(prev => prev + 1);
      
      // Fechar o dialog
      setShowEspelhoDialog(false);
    } catch (error: any) {
      console.error("Erro ao atualizar espelho de correção:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o espelho de correção. Tente novamente.",
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

  const handleAnaliseClick = async () => {
    // Se já tem análise final (URL do PDF), abre o diálogo normal
    if (lead.analiseUrl) {
      setShowAnaliseDialog(true);
      return;
    }
    
    // Se tem análise preliminar, abre o drawer
    if (lead.analisePreliminar) {
      setShowAnalisePreviewDrawer(true);
      return;
    }
    
    // Se está aguardando análise, apenas mostra o diálogo de aguardando
    if (lead.aguardandoAnalise) {
      setShowAnaliseDialog(true);
      return;
    }
    
    // Se não tem nada, envia solicitação
    try {
      setIsEnviandoAnalise(true);
      
      const response = await fetch("/api/admin/leads-chatwit/enviar-analise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadID: lead.id,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao solicitar análise");
      }
      
      // Atualizar o lead localmente para aguardando análise
      onEdit({
        ...lead,
        aguardandoAnalise: true,
        _skipDialog: true,
      });
      
      toast({
        title: "Análise solicitada",
        description: "A solicitação de análise foi enviada com sucesso!",
      });
      
      // Abre o diálogo após a solicitação ser enviada
      setShowAnaliseDialog(true);
    } catch (error: any) {
      console.error("Erro ao solicitar análise:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível solicitar a análise. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsEnviandoAnalise(false);
    }
  };
  
  const handleSaveAnotacoes = async (anotacoes: string): Promise<void> => {
    try {
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: lead.id,
          anotacoes,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao salvar anotações");
      }
      
      // Atualizar o lead localmente
      onEdit({
        ...lead,
        anotacoes,
        _skipDialog: true,
      });
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };
  
  const handleEnviarPdf = async (sourceId: string): Promise<void> => {
    if (!sourceId) {
      throw new Error("ID de origem não encontrado");
    }
    
    try {
      setIsEnviandoPdf(true);
      
      const response = await fetch(`/api/admin/leads-chatwit/enviar-pdf-analise-lead?sourceId=${sourceId}`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar PDF para o chat");
      }
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      setIsEnviandoPdf(false);
    }
  };

  // Função para lidar com as ações do menu de contexto de análise
  const handleAnaliseContextAction = async (action: ContextAction, data?: any) => {
    // Forçamos o fechamento do menu de contexto antes de qualquer ação
    document.body.click(); // Força o fechamento de qualquer menu aberto
    
    // Pequeno delay para garantir que o menu fechou antes de executar a ação
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (action) {
      case 'verAnalise':
        setShowAnaliseDialog(true);
        break;
        
      case 'verAnaliseValidada':
        setShowAnalisePreviewDrawer(true);
        break;
        
      case 'excluirAnalise':
        handleExcluirAnalise();
        break;
        
      default:
        break;
    }
  };

  // Função para excluir análise
  const handleExcluirAnalise = async () => {
    try {
      // Atualizar estado local imediatamente para feedback visual instantâneo
      setLocalAnaliseState({
        analiseUrl: undefined,
        aguardandoAnalise: false,
        analisePreliminar: false,
        analiseValidada: false
      });
      
      // Forçar atualização do botão
      setRefreshKey(prev => prev + 1);
      
      // Prepara o payload para envio
      const payload = {
        id: lead.id,
        analiseUrl: "", // String vazia em vez de null
        analiseProcessada: false,
        aguardandoAnalise: false,
        analisePreliminar: false,
        analiseValidada: false,
      };
      
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir análise");
      }
      
      // Atualizar o lead localmente
      const updatedLead = {
        ...lead,
        analiseUrl: undefined,
        analiseProcessada: false,
        aguardandoAnalise: false,
        analisePreliminar: false,
        analiseValidada: false,
        _skipDialog: true,
        _forceUpdate: true, // Forçar atualização completa
      };
      
      // Chamar o método de edição
      await onEdit(updatedLead);
      
      toast({
        title: "Sucesso",
        description: "Análise excluída com sucesso!",
      });
      
      // Forçar nova atualização após pequeno delay para garantir sincronização
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 100);
      
    } catch (error: any) {
      console.error("Erro ao excluir análise:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a análise. Tente novamente.",
        variant: "destructive",
      });
      
      // Restaurar estado em caso de erro
      setLocalAnaliseState({
        analiseUrl: lead.analiseUrl,
        aguardandoAnalise: !!lead.aguardandoAnalise,
        analisePreliminar: lead.analisePreliminar,
        analiseValidada: !!lead.analiseValidada
      });
      
      // Forçar atualização do botão
      setRefreshKey(prev => prev + 1);
    }
  };

  // Função para cancelar análise
  const handleCancelarAnalise = async () => {
    try {
      console.log("[Cancelar Análise] Iniciando cancelamento para o lead:", lead.id);
      console.log("[Cancelar Análise] Estado anterior:", {
        analiseUrl: lead.analiseUrl,
        aguardandoAnalise: lead.aguardandoAnalise,
        analisePreliminar: lead.analisePreliminar ? "Presente" : "Ausente",
        analiseValidada: lead.analiseValidada
      });
      
      // Atualizar estado local imediatamente para feedback visual instantâneo
      setLocalAnaliseState({
        analiseUrl: undefined,
        aguardandoAnalise: false,
        analisePreliminar: undefined,
        analiseValidada: false
      });
      
      // Forçar atualização do botão
      setRefreshKey(prev => prev + 1);
      
      // Prepara o payload para envio - garantir que todos os campos sejam definidos explicitamente
      const payload = {
        id: lead.id,
        analiseUrl: "", // String vazia em vez de null
        analiseProcessada: false,
        aguardandoAnalise: false, // Esta é a chave principal que precisamos atualizar
        analisePreliminar: null,
        analiseValidada: false,
      };
      
      console.log("[Cancelar Análise] Enviando payload para API:", payload);
      
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("[Cancelar Análise] Erro da API:", data);
        throw new Error(data.error || "Erro ao cancelar análise");
      }
      
      const responseData = await response.json();
      console.log("[Cancelar Análise] Resposta da API:", responseData);
      
      // Atualizar o lead localmente com exatamente os mesmos dados enviados para a API
      const updatedLead = {
        ...lead,
        ...payload, // Usar o mesmo payload que foi enviado para a API
        _skipDialog: true,
        _forceUpdate: true, // Forçar atualização completa
      };
      
      // Atualizamos também o objeto lead original para garantir consistência
      lead.aguardandoAnalise = false;
      lead.analiseProcessada = false;
      lead.analiseUrl = "";
      lead.analisePreliminar = null;
      lead.analiseValidada = false;
      
      console.log("[Cancelar Análise] Atualizando o lead com:", updatedLead);
      
      // Chamar o método de edição
      await onEdit(updatedLead);
      
      // Fechar o diálogo de análise se estiver aberto
      setShowAnaliseDialog(false);
      setShowAnalisePreviewDrawer(false);
      
      // Fazer uma pausa para garantir que todas as atualizações foram processadas
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Forçar uma nova atualização do estado local após pequeno delay
      setTimeout(() => {
        setLocalAnaliseState({
          analiseUrl: undefined,
          aguardandoAnalise: false,
          analisePreliminar: undefined,
          analiseValidada: false
        });
        
        // Forçar atualização do componente
        setRefreshKey(prev => prev + 1);
        
        console.log("[Cancelar Análise] Estado final atualizado");
      }, 200);
      
      return Promise.resolve();
    } catch (error: any) {
      console.error("[Cancelar Análise] Erro ao cancelar análise:", error);
      
      // Exibir toast apenas se não for chamado do diálogo
      // (o diálogo já exibe seu próprio toast)
      if (!error._suppressToast) {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível cancelar a análise. Tente novamente.",
          variant: "destructive",
        });
      }
      
      // Restaurar estado em caso de erro
      setLocalAnaliseState({
        analiseUrl: lead.analiseUrl,
        aguardandoAnalise: !!lead.aguardandoAnalise,
        analisePreliminar: lead.analisePreliminar,
        analiseValidada: !!lead.analiseValidada
      });
      
      // Forçar atualização do botão
      setRefreshKey(prev => prev + 1);
      
      return Promise.reject(error);
    }
  };

  // Funções para lidar com análise preliminar
  const handleSaveAnalisePreliminar = async (analiseData: any) => {
    try {
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: lead.id,
          analisePreliminar: analiseData
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao salvar análise preliminar");
      }
      
      // Atualizar o lead localmente
      onEdit({
        ...lead,
        analisePreliminar: analiseData,
        _skipDialog: true,
      });
      
      // Atualizar estado local
      setLocalAnaliseState(prev => ({
        ...prev,
        analisePreliminar: analiseData
      }));
      
      return Promise.resolve();
    } catch (error: any) {
      return Promise.reject(error);
    }
  };

  const handleValidarAnalise = async (analiseData: any) => {
    try {
      setIsEnviandoAnaliseValidada(true);
      
      const response = await fetch("/api/admin/leads-chatwit/enviar-analise-validada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadID: lead.id,
          analiseData: analiseData
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao validar análise");
      }
      
      // Atualizar o lead localmente
      onEdit({
        ...lead,
        analiseValidada: true,
        analisePreliminar: analiseData,
        _skipDialog: true,
      });
      
      // Atualizar estado local
      setLocalAnaliseState(prev => ({
        ...prev,
        analiseValidada: true,
        analisePreliminar: analiseData
      }));
      
      // Fechar o drawer
      setShowAnalisePreviewDrawer(false);
      
      toast({
        title: "Análise validada",
        description: "A análise foi validada e enviada para gerar o PDF final.",
      });
      
      return Promise.resolve();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível validar a análise. Tente novamente.",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsEnviandoAnaliseValidada(false);
    }
  };

  // Modificar a função handleDeleteAllFiles para usar o diálogo personalizado
  const handleDeleteAllFiles = async () => {
    // Abrir o diálogo de confirmação em vez de usar window.confirm
    setConfirmDeleteAllFiles(true);
  };
  
  // Função para executar a exclusão após a confirmação
  const executeDeleteAllFiles = async () => {
    try {
      // Mostrar toast de carregamento
      toast({
        title: "Excluindo arquivos",
        description: "Aguarde enquanto excluímos todos os arquivos...",
      });
      
      // Criar um array com as promessas de exclusão para cada arquivo
      const deletePromises = lead.arquivos.map(arquivo => 
        handleDeleteFile(arquivo.id, "arquivo")
      );
      
      // Executar todas as promessas em paralelo
      await Promise.all(deletePromises);
      
      // Atualizar o lead após todas as exclusões
      onEdit({
        ...lead,
        arquivos: [],
        _skipDialog: true,
        _forceUpdate: true
      });
      
      toast({
        title: "Sucesso",
        description: "Todos os arquivos foram excluídos com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao excluir todos os arquivos:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir todos os arquivos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      // Fechar o diálogo de confirmação
      setConfirmDeleteAllFiles(false);
    }
  };

  return (
    <>
      <TableRow className="group hover:bg-secondary/30">
        <TableCell className="w-[40px] p-2 align-middle">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={(checked) => onSelect(lead.id, checked as boolean)}
            aria-label="Selecionar lead"
          />
        </TableCell>
        
        <TableCell className="w-[250px] p-2 align-middle">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 cursor-pointer" onClick={() => setShowFullImage(true)}>
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
        
        <TableCell className="w-[100px] p-2 align-middle">
          <div className="flex flex-col">
            <div className="font-medium">{lead.usuario.name}</div>
            <Badge variant="outline" className="w-fit">
              {lead.usuario.channel}
            </Badge>
          </div>
        </TableCell>
        
        <TableCell className="w-[150px] p-2 align-middle">
          <div className="grid grid-cols-3 gap-2">
            {lead.arquivos.length > 0 ? (
              lead.arquivos.map((arquivo) => (
                <LeadContextMenu
                  key={arquivo.id}
                  contextType="arquivo"
                  onAction={handleContextMenuAction}
                  data={{ id: arquivo.id, type: "arquivo" }}
                >
                  <div 
                    className="relative rounded-md border p-1 hover:bg-accent hover:text-accent-foreground min-w-[36px] min-h-[36px] flex items-center justify-center group cursor-pointer"
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
              <span className="text-sm text-muted-foreground col-span-3">Sem arquivos</span>
            )}
          </div>
        </TableCell>
        
        <TableCell className="w-[80px] p-2 align-middle">
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

        <TableCell className="w-[80px] p-2 align-middle">
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

        <TableCell className="w-[100px] p-2 align-middle">
          <LeadContextMenu
            contextType="manuscrito"
            onAction={handleManuscritoContextAction}
            data={{
              id: lead.id,
              manuscritoProcessado: manuscritoProcessadoLocal,
              aguardandoManuscrito: !!lead.aguardandoManuscrito
            }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleDigitarClick}
              disabled={isDigitando}
              className="whitespace-nowrap w-full"
              key={`manuscrito-btn-${refreshKey}`}
            >
              {manuscritoProcessadoLocal ? (
                <>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Editar Manuscrito
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
        
        <TableCell className="w-[120px] p-2 align-middle">
          {manuscritoProcessadoLocal && (
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
                onClick={hasEspelho ? () => setShowEspelhoDialog(true) : handleOpenEspelhoSeletor}
                disabled={isEnviandoEspelho}
                className="whitespace-nowrap w-full"
                key={`espelho-btn-${refreshKey}-${hasEspelho ? 'edit' : 'select'}`}
              >
                {(() => {
                  if (hasEspelho) {
                    return (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Editar Espelho
                      </>
                    );
                  } else {
                    return (
                      <>
                        <ImageIcon className={`h-4 w-4 mr-1 ${isEnviandoEspelho ? "animate-spin" : ""}`} />
                        {isEnviandoEspelho ? "Enviando..." : "Selecionar Espelho"}
                      </>
                    );
                  }
                })()}
              </Button>
            </LeadContextMenu>
          )}
        </TableCell>
        
        <TableCell className="w-[120px] p-2 align-middle">
          <LeadContextMenu
            contextType="analise"
            onAction={handleAnaliseContextAction}
            data={{
              id: lead.id,
              analiseUrl: localAnaliseState.analiseUrl,
              aguardandoAnalise: localAnaliseState.aguardandoAnalise
            }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnaliseClick}
              disabled={isEnviandoAnalise}
              className="whitespace-nowrap w-full"
              key={`analise-btn-${refreshKey}`}
            >
              {isEnviandoAnalise ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processando...
                </>
              ) : localAnaliseState.analiseUrl ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Análise
                </>
              ) : localAnaliseState.analiseValidada ? (
                <>
                  <FileCheck className="h-4 w-4 mr-1" />
                  Análise Validada Espere
                </>
              ) : localAnaliseState.analisePreliminar ? (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  Pré-Análise
                </>
              ) : localAnaliseState.aguardandoAnalise ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1" />
                  Aguardando
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  Analisar Prova
                </>
              )}
            </Button>
          </LeadContextMenu>
        </TableCell>
        
        <TableCell className="w-[60px] p-2 align-middle">
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
      <ImageGalleryDialog
        isOpen={showEspelhoSeletor}
        onClose={() => setShowEspelhoSeletor(false)}
        images={getConvertedImages()}
        leadId={lead.id}
        title="Selecionar Espelho de Correção"
        description="Selecione as imagens que serão utilizadas como espelho de correção. Você pode selecionar mais de uma imagem."
        selectionMode={true}
        onSend={handleEnviarEspelho}
      />

      <EspelhoDialog
        isOpen={showEspelhoDialog}
        onClose={() => setShowEspelhoDialog(false)}
        leadId={lead.id}
        textoEspelho={lead.textoDOEspelho || null}
        imagensEspelho={lead.espelhoCorrecao ? JSON.parse(lead.espelhoCorrecao) : []}
        onSave={handleSaveEspelho}
      />

      {/* Diálogo de confirmação para excluir o espelho */}
      <Dialog open={confirmDeleteEspelho} onOpenChange={(open) => {
        if (!open) {
          setConfirmDeleteEspelho(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir completamente o espelho de correção do lead "{displayName}"? 
              Esta ação irá remover tanto o texto quanto as imagens do espelho e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteEspelho(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => {
              setConfirmDeleteEspelho(false);
              handleExcluirEspelho();
            }}>
              Excluir Espelho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adicione um novo ImageGalleryDialog para seleção de imagens do manuscrito */}
      <ImageGalleryDialog
        isOpen={showManuscritoImageSeletor}
        onClose={() => setShowManuscritoImageSeletor(false)}
        images={getConvertedImages()}
        leadId={lead.id}
        title="Selecionar Imagens para Manuscrito"
        description="Selecione as imagens que serão usadas para o processo de digitação do manuscrito."
        selectionMode={true}
        onSend={handleEnviarManuscrito}
      />

      {/* Diálogo de Análise */}
      <AnaliseDialog
        isOpen={showAnaliseDialog}
        onClose={() => setShowAnaliseDialog(false)}
        leadId={lead.id}
        sourceId={lead.sourceId}
        analiseUrl={localAnaliseState.analiseUrl || null}
        anotacoes={lead.anotacoes || null}
        aguardandoAnalise={localAnaliseState.aguardandoAnalise}
        onSaveAnotacoes={handleSaveAnotacoes}
        onEnviarPdf={handleEnviarPdf}
        onCancelarAnalise={handleCancelarAnalise}
      />

      {/* Drawer de Pré-Análise */}
      <AnalisePreviewDrawer
        isOpen={showAnalisePreviewDrawer}
        onClose={() => setShowAnalisePreviewDrawer(false)}
        analisePreliminar={localAnaliseState.analisePreliminar}
        leadId={lead.id}
        onSave={handleSaveAnalisePreliminar}
        onValidar={handleValidarAnalise}
      />

      {/* Diálogo de Análise Validada */}
      <AnaliseDialog
        isOpen={showAnaliseValidadaDialog}
        onClose={() => setShowAnaliseValidadaDialog(false)}
        leadId={lead.id}
        sourceId={lead.sourceId}
        analiseUrl={lead.analiseUrl || null}
        anotacoes={lead.anotacoes || null}
        aguardandoAnalise={false}
        onSaveAnotacoes={handleSaveAnotacoes}
        onEnviarPdf={handleEnviarPdf}
        onCancelarAnalise={handleCancelarAnalise}
        isAnaliseValidada={true}
      />

      {/* Adicionar o diálogo de confirmação para excluir todos os arquivos */}
      <Dialog open={confirmDeleteAllFiles} onOpenChange={setConfirmDeleteAllFiles}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão em massa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir TODOS os arquivos do lead "{displayName}"? 
              Esta ação não pode ser desfeita e irá remover {lead.arquivos.length} arquivo(s).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAllFiles(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeDeleteAllFiles}>
              Excluir Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
