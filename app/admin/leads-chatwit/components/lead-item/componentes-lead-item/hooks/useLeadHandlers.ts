import { useToast } from "@/hooks/use-toast";
import { getConvertedImages } from "@/app/admin/leads-chatwit/components/lead-item/componentes-lead-item/utils";
import { LeadChatwit } from "@/app/admin/leads-chatwit/types";
import { ContextAction } from "@/app/admin/leads-chatwit/components/lead-context-menu";

interface UseLeadHandlersProps {
  lead: LeadChatwit;
  onEdit: (lead: LeadChatwit) => void;
  onDelete: (id: string) => void;
  onUnificar: (id: string) => void;
  onConverter: (id: string) => void;
  onDigitarManuscrito: (lead: LeadChatwit) => void;
  
  // Estados dos diálogos
  setDetailsOpen: (open: boolean) => void;
  setConfirmDelete: (open: boolean) => void;
  setShowGallery: (open: boolean) => void;
  setShowProcessDialog: (open: boolean) => void;
  setProcessType: (type: "unify" | "convert") => void;
  setProcessStartTime: (time: number | null) => void;
  setShowManuscritoDialog: (open: boolean) => void;
  setShowManuscritoImageSeletor: (open: boolean) => void;
  setIsDigitando: (loading: boolean) => void;
  setShowEspelhoSeletor: (open: boolean) => void;
  setShowEspelhoDialog: (open: boolean) => void;
  setConfirmDeleteEspelho: (open: boolean) => void;
  setShowAnaliseDialog: (open: boolean) => void;
  setShowAnalisePreviewDrawer: (open: boolean) => void;
  setConfirmDeleteAllFiles: (open: boolean) => void;
  setConfirmDeleteManuscrito: (open: boolean) => void;
  setManuscritoToDelete: (id: string | null) => void;
  manuscritoToDelete: string | null;
  setIsEnviandoEspelho: (loading: boolean) => void;
  setIsUploadingEspelho: (loading: boolean) => void;
  setIsEnviandoAnalise: (loading: boolean) => void;
  setIsEnviandoPdf: (loading: boolean) => void;
  setIsEnviandoAnaliseValidada: (loading: boolean) => void;
  setIsDownloading: (loading: boolean) => void;
  setIsLoadingImages: (loading: boolean) => void;
  setSelectedEspelhoImages: (images: string[]) => void;
  setUploadingFile: (file: File | null) => void;
  setIsSaving: (loading: boolean) => void;
  setShowFullImage: (show: boolean) => void;
  setIsDeletedFile: (fileId: string | null) => void;
  isDeletedFile: string | null;
  
  // Estados locais
  manuscritoProcessadoLocal: boolean;
  hasEspelho: boolean;
  consultoriaAtiva: boolean;
  localAnaliseState: {
    analiseUrl?: string;
    aguardandoAnalise: boolean;
    analisePreliminar?: any;
    analiseValidada: boolean;
  };
  
  // Métodos de atualização de estado
  updateEspelhoState: (value: boolean) => void;
  updateManuscritoState: (value: boolean) => void;
  updateAnaliseState: (updates: any) => void;
  updateConsultoriaState: (value: boolean) => void;
  forceRefresh: () => void;
}

export function useLeadHandlers({
  lead,
  onEdit,
  onDelete,
  onUnificar,
  onConverter,
  setDetailsOpen,
  setConfirmDelete,
  setShowGallery,
  setShowProcessDialog,
  setProcessType,
  setProcessStartTime,
  setShowManuscritoDialog,
  setShowManuscritoImageSeletor,
  setIsDigitando,
  setShowEspelhoSeletor,
  setShowEspelhoDialog,
  setConfirmDeleteEspelho,
  setShowAnaliseDialog,
  setShowAnalisePreviewDrawer,
  setConfirmDeleteAllFiles,
  setConfirmDeleteManuscrito,
  setManuscritoToDelete,
  manuscritoToDelete,
  setIsEnviandoEspelho,
  setIsUploadingEspelho,
  setIsEnviandoAnalise,
  setIsEnviandoPdf,
  setIsEnviandoAnaliseValidada,
  setIsDownloading,
  setIsLoadingImages,
  setSelectedEspelhoImages,
  setUploadingFile,
  setIsSaving,
  setShowFullImage,
  setIsDeletedFile,
  isDeletedFile,
  manuscritoProcessadoLocal,
  hasEspelho,
  consultoriaAtiva,
  localAnaliseState,
  updateEspelhoState,
  updateManuscritoState,
  updateAnaliseState,
  updateConsultoriaState,
  forceRefresh
}: UseLeadHandlersProps) {
  const { toast } = useToast();

  // Handler principal de edição do lead
  const handleEditLead = async (leadData: any) => {
    try {
      setIsSaving(true);
      
      if (leadData._skipDialog) {
        await onEdit(leadData);
        return;
      }
      
      await onEdit({
        ...leadData,
        _internal: true
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

  // Handler de exclusão do lead
  const handleDelete = () => {
    setConfirmDelete(false);
    onDelete(lead.id);
  };

  // Handler para ver detalhes
  const handleViewDetails = () => {
    setDetailsOpen(true);
  };

  // Handler para mostrar imagem completa
  const handleShowFullImage = () => {
    setShowFullImage(true);
  };

  // Handler para mostrar galeria
  const handleShowGallery = () => {
    setShowGallery(true);
  };

  // Handlers de arquivos
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

  const reloadAfterDelete = () => {
    if (typeof onEdit === 'function') {
      onEdit({
        ...lead,
        _skipDialog: true
      });
    }
    
    window.setTimeout(() => {
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          _skipDialog: true
        });
      }
      
      toast({
        title: "Atualizado",
        description: "Lista de arquivos atualizada com sucesso",
      });
    }, 500);
  };

  const handleUnificarArquivos = (leadId: string) => {
    setProcessType("unify");
    setShowProcessDialog(true);
    setProcessStartTime(Date.now());
    
    setTimeout(() => {
      onUnificar(leadId);
    }, 500);
  };

  const handlePdfToImages = async () => {
    setProcessType("convert");
    setShowProcessDialog(true);
    setProcessStartTime(Date.now());
    
    try {
      setIsLoadingImages(true);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await onConverter(lead.id);
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
      setTimeout(() => {
        setShowProcessDialog(false);
      }, 500);
    }
  };

  // Handlers de manuscrito
  const handleDigitarClick = async () => {
    if (manuscritoProcessadoLocal) {
      setShowManuscritoDialog(true);
    } else {
      setShowManuscritoImageSeletor(true);
    }
  };

  const handleEnviarManuscrito = async (selectedImages: string[]) => {
    if (selectedImages.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos uma imagem para o manuscrito.",
        variant: "default",
      });
      return;
    }

    setShowManuscritoImageSeletor(false);
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

      toast({
        title: "Manuscrito processado com sucesso",
        description: "Você já pode editar o manuscrito.",
        variant: "default",
      });
      
      updateManuscritoState(true);
      forceRefresh();
      setIsDigitando(false);
    } catch (error: any) {
      console.error("Erro ao enviar manuscrito:", error);
      setIsDigitando(false);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o manuscrito. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSaveManuscrito = async (texto: string) => {
    try {
      const response = await fetch("/api/admin/leads-chatwit/manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          manuscrito: texto,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao salvar manuscrito");
      }

      toast({
        title: "Manuscrito salvo",
        description: "Manuscrito atualizado com sucesso!",
      });

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

  const handleExcluirManuscrito = async () => {
    if (!manuscritoToDelete) return;

    try {
      setIsDigitando(true);
      setConfirmDeleteManuscrito(false);

      const response = await fetch(`/api/admin/leads-chatwit/manuscrito?leadId=${manuscritoToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir manuscrito");
      }

      toast({
        title: "Manuscrito excluído",
        description: "Manuscrito excluído com sucesso!",
      });

      updateManuscritoState(false);
      
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          provaManuscrita: null,
          manuscritoProcessado: false,
          _skipDialog: true,
        });
      }
      
      forceRefresh();
      setManuscritoToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir manuscrito:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o manuscrito. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDigitando(false);
    }
  };

  // Handlers de espelho
  const handleEspelhoClick = () => {
    if (consultoriaAtiva) {
      if (hasEspelho) {
        setShowEspelhoDialog(true);
      } else {
        handleOpenFileUpload();
      }
    } else {
      if (hasEspelho) {
        setShowEspelhoDialog(true);
      } else {
        setShowEspelhoSeletor(true);
      }
    }
  };

  const handleOpenFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleEspelhoFileUpload(file);
      }
    };
    input.click();
  };

  const handleEspelhoFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploadingEspelho(true);
    setUploadingFile(file);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'vision');
      formData.append('sessionId', `espelho-${lead.id}`);
      
      const response = await fetch('/api/upload/process-files', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no upload');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Falha no processamento');
      }
      
      const imageUrls = data.image_urls || [];
      
      if (imageUrls.length === 0) {
        throw new Error('Nenhuma imagem foi processada');
      }
      
      await onEdit({
        ...lead,
        espelhoCorrecao: JSON.stringify(imageUrls),
        _skipDialog: true
      });
      
      updateEspelhoState(true);
      forceRefresh();
      
      toast({
        title: "Upload concluído",
        description: `${data.file_type === 'pdf' ? 'PDF convertido em' : 'Processada'} ${imageUrls.length} imagem(ns) para o espelho.`,
      });
      
      if (consultoriaAtiva) {
        await handleEnviarEspelhoAuto(imageUrls);
      }
      
    } catch (error: any) {
      console.error("Erro no upload do espelho:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível fazer upload do espelho. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingEspelho(false);
      setUploadingFile(null);
    }
  };

  const handleEnviarEspelhoAuto = async (imageUrls: string[]) => {
    try {
      const payload = {
        leadID: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        telefone: lead.phoneNumber,
        espelhoconsultoriafase2: true,
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
        arquivos_imagens_espelho: imageUrls.map((url: string, index: number) => ({
          id: `${lead.id}-espelho-${index}`,
          url: url,
          nome: `Espelho ${index + 1}`
        })),
        metadata: {
          leadUrl: lead.leadUrl,
          sourceId: lead.sourceId,
          concluido: lead.concluido,
          fezRecurso: lead.fezRecurso
        }
      };
      
      const espelhoResponse = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!espelhoResponse.ok) {
        const espelhoData = await espelhoResponse.json();
        throw new Error(espelhoData.error || "Erro ao enviar espelho para processamento");
      }
      
      toast({
        title: "Espelho enviado",
        description: "Espelho enviado para o sistema externo com sucesso! Aguarde o processamento.",
      });
      
    } catch (espelhoError: any) {
      console.error("Erro ao enviar espelho para sistema externo:", espelhoError);
      toast({
        title: "Aviso",
        description: "Upload concluído, mas houve erro ao enviar para processamento. Você pode tentar novamente.",
        variant: "default",
      });
    }
  };

  // Handlers de análise
  const handleAnaliseClick = async () => {
    if (lead.analiseUrl) {
      setShowAnaliseDialog(true);
      return;
    }
    
    if (lead.analisePreliminar) {
      setShowAnalisePreviewDrawer(true);
      return;
    }
    
    if (lead.aguardandoAnalise) {
      setShowAnaliseDialog(true);
      return;
    }
    
    try {
      setIsEnviandoAnalise(true);
      
      const apiEndpoint = consultoriaAtiva 
        ? "/api/admin/leads-chatwit/enviar-consultoriafase2"
        : "/api/admin/leads-chatwit/enviar-analise";
      
      const response = await fetch(apiEndpoint, {
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
      
      onEdit({
        ...lead,
        aguardandoAnalise: true,
        _skipDialog: true,
      });
      
      toast({
        title: consultoriaAtiva ? "Consultoria solicitada" : "Análise solicitada",
        description: consultoriaAtiva 
          ? "A solicitação de consultoria fase 2 foi enviada com sucesso!"
          : "A solicitação de análise foi enviada com sucesso!",
      });
      
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

  // Handler de context menu
  const handleContextMenuAction = async (action: ContextAction, data?: any) => {
    document.body.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (action) {
      case 'atualizarLista':
        toast({
          title: "Atualizando",
          description: "Atualizando lista de leads...",
        });
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
        setConfirmDeleteAllFiles(true);
        break;
      case 'editarManuscrito':
        if (lead.manuscritoProcessado) {
          setShowManuscritoDialog(true);
        }
        break;
      case 'reenviarManuscrito':
        if (data && data.id) {
          setShowManuscritoImageSeletor(true);
        }
        break;
      case 'excluirManuscrito':
        if (data && data.id) {
          setManuscritoToDelete(data.id);
          setConfirmDeleteManuscrito(true);
        }
        break;
      case 'selecionarEspelho':
        setShowEspelhoSeletor(true);
        break;
      case 'enviarEspelhoUpload':
        handleOpenFileUpload();
        break;
      case 'verEspelho':
        if (lead.espelhoCorrecao || lead.textoDOEspelho) {
          setShowEspelhoDialog(true);
        } else {
          toast({
            title: "Espelho não encontrado",
            description: "Não foi possível encontrar o espelho de correção. Crie um novo selecionando imagens.",
            variant: "default",
          });
        }
        break;
      case 'excluirEspelho':
        const temImagens = lead.espelhoCorrecao && lead.espelhoCorrecao !== '[]';
        const temTexto = !!lead.textoDOEspelho && (
          (typeof lead.textoDOEspelho === 'string' && lead.textoDOEspelho.trim() !== '') ||
          (Array.isArray(lead.textoDOEspelho) && lead.textoDOEspelho.length > 0) ||
          (typeof lead.textoDOEspelho === 'object' && lead.textoDOEspelho !== null)
        );
        
        if (temImagens || temTexto) {
          setConfirmDeleteEspelho(true);
        } else {
          updateEspelhoState(false);
          forceRefresh();
          
          toast({
            title: "Aviso",
            description: "Não há espelho para excluir.",
            variant: "default",
          });
        }
        break;
      case 'excluirAnalise':
        handleExcluirAnalise();
        break;
      case 'verAnalise':
        if (localAnaliseState.analiseUrl) {
          setShowAnaliseDialog(true);
        } else if (localAnaliseState.analisePreliminar) {
          setShowAnalisePreviewDrawer(true);
        } else {
          toast({
            title: "Análise não encontrada",
            description: "Não foi possível encontrar a análise.",
            variant: "default",
          });
        }
        break;
      default:
        break;
    }
  };

  // Handler de toggle consultoria
  const handleConsultoriaToggle = async (ativo: boolean) => {
    try {
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: lead.id,
          consultoriaFase2: ativo
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao atualizar modo consultoria");
      }
      
      updateConsultoriaState(ativo);
      
      onEdit({
        ...lead,
        consultoriaFase2: ativo,
        _skipDialog: true,
      });
      
      toast({
        title: ativo ? "Consultoria ativada" : "Consultoria desativada",
        description: ativo 
          ? "Modo consultoria fase 2 ativado. Agora você pode fazer upload direto do espelho."
          : "Modo consultoria fase 2 desativado. Voltou ao funcionamento normal.",
      });
    } catch (error: any) {
      console.error("Erro ao alterar modo consultoria:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o modo consultoria.",
        variant: "destructive",
      });
    }
  };

  const handleExcluirEspelho = async () => {
    try {
      const estadoAtual = {
        textoDOEspelho: lead.textoDOEspelho,
        espelhoCorrecao: lead.espelhoCorrecao
      };
      
      updateEspelhoState(false);
      
      lead.textoDOEspelho = "";
      lead.espelhoCorrecao = JSON.stringify([]);
      
      forceRefresh();
      
      const updatedLead = {
        ...lead,
        textoDOEspelho: "",
        espelhoCorrecao: JSON.stringify([]),
      };
      
      try {
        await onEdit({
          ...updatedLead,
          _skipDialog: true,
          _forceUpdate: true
        });
        
        setTimeout(() => {
          updateEspelhoState(false);
          forceRefresh();
        }, 100);
        
        toast({
          title: "Espelho excluído",
          description: "O espelho de correção foi removido com sucesso.",
          variant: "default",
        });
      } catch (error: any) {
        console.error("Erro ao excluir espelho:", error);
        
        lead.textoDOEspelho = estadoAtual.textoDOEspelho;
        lead.espelhoCorrecao = estadoAtual.espelhoCorrecao;
        
        const temImagens = estadoAtual.espelhoCorrecao && 
                           estadoAtual.espelhoCorrecao !== '[]' && 
                           estadoAtual.espelhoCorrecao !== '""';
        const temTexto = !!estadoAtual.textoDOEspelho && (
          (typeof estadoAtual.textoDOEspelho === 'string' && estadoAtual.textoDOEspelho.trim() !== '') ||
          (Array.isArray(estadoAtual.textoDOEspelho) && estadoAtual.textoDOEspelho.length > 0) ||
          (typeof estadoAtual.textoDOEspelho === 'object' && estadoAtual.textoDOEspelho !== null)
        );
        
        updateEspelhoState(temImagens || temTexto);
        
        toast({
          title: "Erro",
          description: "Não foi possível excluir o espelho. Tente novamente.",
          variant: "destructive",
        });
      }

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

  // Handler de validação de análise
  const handleValidarAnalise = async (analiseData: any) => {
    try {
      setIsEnviandoAnaliseValidada(true);
      
      // Detectar se é análise de simulado baseado no estado da consultoria
      const isAnaliseSimulado = consultoriaAtiva;
      
      // Preparar payload para a API de análise validada
      const payload = {
        leadID: lead.id,
        analiseData: {
          ...analiseData,
          // Incluir flags para identificação do tipo
          ...(isAnaliseSimulado 
            ? { analisesimuladovalidado: true }
            : { analiseValidada: true }
          )
        }
      };
      
      console.log("[ValidarAnalise] Enviando payload:", payload);
      
      // Usar a API específica para análise validada
      const response = await fetch("/api/admin/leads-chatwit/enviar-analise-validada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao validar análise");
      }
      
      // Atualizar estado local
      updateAnaliseState({
        analiseValidada: true,
        aguardandoAnalise: true // Mantém aguardando até receber a URL final
      });
      
      toast({
        title: isAnaliseSimulado ? "Análise de simulado validada" : "Análise validada",
        description: isAnaliseSimulado 
          ? "A análise de simulado foi validada e enviada para gerar o PDF final."
          : "A análise foi validada e enviada para gerar o PDF final.",
      });
      
    } catch (error: any) {
      console.error("Erro ao validar análise:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível validar a análise. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsEnviandoAnaliseValidada(false);
    }
  };

  // Handler de exclusão em massa de arquivos
  const handleExecuteDeleteAllFiles = async () => {
    try {
      setConfirmDeleteAllFiles(false);
      
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
    }
  };

  // Handler de exclusão de análise
  const handleExcluirAnalise = async () => {
    try {
      // Atualizar estado local imediatamente para feedback visual instantâneo
      updateAnaliseState({
        analiseUrl: undefined,
        aguardandoAnalise: false,
        analisePreliminar: false,
        analiseValidada: false
      });
      
      // Forçar atualização do botão
      forceRefresh();
      
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
        forceRefresh();
      }, 100);
      
    } catch (error: any) {
      console.error("Erro ao excluir análise:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir a análise. Tente novamente.",
        variant: "destructive",
      });
      
      // Restaurar estado em caso de erro
      updateAnaliseState({
        analiseUrl: lead.analiseUrl,
        aguardandoAnalise: !!lead.aguardandoAnalise,
        analisePreliminar: lead.analisePreliminar,
        analiseValidada: !!lead.analiseValidada
      });
      
      // Forçar atualização do botão
      forceRefresh();
    }
  };

  // Handler para enviar imagens selecionadas
  const handleSendSelectedImages = async (images: string[]) => {
    try {
      if (images.length === 0) {
        toast({
          title: "Aviso", 
          description: "Selecione pelo menos uma imagem.",
          variant: "default",
        });
        return;
      }

      toast({
        title: "Enviando imagens",
        description: `Enviando ${images.length} imagem(ns) selecionada(s)...`,
      });

      // Aqui você pode implementar a lógica específica para envio das imagens
      // Por exemplo, para análise, manuscrito, etc.
      
      toast({
        title: "Sucesso",
        description: "Imagens enviadas com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao enviar imagens:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar as imagens.",
        variant: "destructive",
      });
    }
  };

  // Handler para enviar espelho
  const handleEnviarEspelho = async (images: string[]) => {
    try {
      if (images.length === 0) {
        toast({
          title: "Aviso",
          description: "Selecione pelo menos uma imagem para o espelho.",
          variant: "default",
        });
        return;
      }

      setShowEspelhoSeletor(false);
      setIsEnviandoEspelho(true);

      // Atualizar o lead com as imagens do espelho
      await onEdit({
        ...lead,
        espelhoCorrecao: JSON.stringify(images),
        _skipDialog: true
      });

      updateEspelhoState(true);
      forceRefresh();

      toast({
        title: "Espelho enviado",
        description: `${images.length} imagem(ns) enviada(s) para o espelho de correção.`,
      });
    } catch (error: any) {
      console.error("Erro ao enviar espelho:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o espelho.",
        variant: "destructive",
      });
    } finally {
      setIsEnviandoEspelho(false);
    }
  };

  // Handler para salvar espelho
  const handleSaveEspelho = async (texto: any, imagens: string[]) => {
    try {
      await onEdit({
        ...lead,
        textoDOEspelho: texto,
        espelhoCorrecao: JSON.stringify(imagens),
        _skipDialog: true
      });

      updateEspelhoState(true);
      forceRefresh();

      toast({
        title: "Espelho salvo",
        description: "Espelho de correção salvo com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao salvar espelho:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o espelho.",
        variant: "destructive",
      });
    }
  };

  // Handler para salvar anotações
  const handleSaveAnotacoes = async (anotacoes: string) => {
    try {
      await onEdit({
        ...lead,
        anotacoes,
        _skipDialog: true
      });

      toast({
        title: "Anotações salvas",
        description: "Anotações salvas com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao salvar anotações:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as anotações.",
        variant: "destructive",
      });
    }
  };

  // Handler para enviar PDF
  const handleEnviarPdf = async (sourceId: string) => {
    try {
      setIsEnviandoPdf(true);

      const response = await fetch("/api/admin/leads-chatwit/enviar-analise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadID: lead.id,
          sourceId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar PDF para análise");
      }

      updateAnaliseState({
        aguardandoAnalise: true
      });

      toast({
        title: "PDF enviado",
        description: "PDF enviado para análise com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao enviar PDF:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o PDF.",
        variant: "destructive",
      });
    } finally {
      setIsEnviandoPdf(false);
    }
  };

  // Handler para cancelar análise
  const handleCancelarAnalise = async () => {
    try {
      const response = await fetch(`/api/admin/leads-chatwit/cancelar-analise?leadId=${lead.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao cancelar análise");
      }

      updateAnaliseState({
        aguardandoAnalise: false,
        analiseUrl: undefined
      });

      await onEdit({
        ...lead,
        aguardandoAnalise: false,
        analiseUrl: undefined,
        _skipDialog: true
      });

      toast({
        title: "Análise cancelada",
        description: "Análise cancelada com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao cancelar análise:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar a análise.",
        variant: "destructive",
      });
    }
  };

  // Handler para salvar análise preliminar
  const handleSaveAnalisePreliminar = async (data: any) => {
    try {
      const response = await fetch("/api/admin/leads-chatwit/analise-preliminar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          analisePreliminar: data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao salvar análise preliminar");
      }

      updateAnaliseState({
        analisePreliminar: data
      });

      await onEdit({
        ...lead,
        analisePreliminar: data,
        _skipDialog: true
      });

      toast({
        title: "Análise preliminar salva",
        description: "Análise preliminar salva com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao salvar análise preliminar:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a análise preliminar.",
        variant: "destructive",
      });
    }
  };

  return {
    handleEditLead,
    handleDelete,
    handleViewDetails,
    handleShowFullImage,
    handleShowGallery,
    handleDeleteFile,
    reloadAfterDelete,
    handleUnificarArquivos,
    handlePdfToImages,
    handleDigitarClick,
    handleEnviarManuscrito,
    handleSaveManuscrito,
    handleExcluirManuscrito,
    handleEspelhoClick,
    handleExcluirEspelho,
    handleOpenFileUpload,
    handleEspelhoFileUpload,
    handleAnaliseClick,
    handleContextMenuAction,
    handleConsultoriaToggle,
    handleValidarAnalise,
    handleExecuteDeleteAllFiles,
    handleExcluirAnalise,
    handleSendSelectedImages,
    handleEnviarEspelho,
    handleSaveEspelho,
    handleSaveAnotacoes,
    handleEnviarPdf,
    handleCancelarAnalise,
    handleSaveAnalisePreliminar,
    getConvertedImages: () => getConvertedImages(lead)
  };
} 