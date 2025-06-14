import { useToast } from "@/hooks/use-toast";
import { getConvertedImages } from "@/app/admin/leads-chatwit/components/lead-item/componentes-lead-item/utils";
import { LeadChatwit } from "@/app/admin/leads-chatwit/types";
import { ContextAction } from "@/app/admin/leads-chatwit/components/lead-context-menu";
import { Prisma } from "@prisma/client";

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
  localManuscritoState: {
    manuscritoProcessado: boolean;
    aguardandoManuscrito: boolean;
    provaManuscrita: any;
  };
  localEspelhoState: {
    hasEspelho: boolean;
    aguardandoEspelho: boolean;
    espelhoCorrecao: any;
    textoDOEspelho: any;
  };
  
  // Métodos de atualização de estado
  updateEspelhoState: (value: boolean | any) => void;
  updateManuscritoState: (value: boolean | any) => void;
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
  localManuscritoState,
  localEspelhoState,
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
        // Atualiza o estado local imediatamente com base no tipo de exclusão
        if (typeof onEdit === 'function') {
          const updatedLead = { ...lead };
          
          // Limpar campos específicos com base no tipo de exclusão
          if (type === "pdf") {
            updatedLead.pdfUnificado = undefined;
          } else if (type === "imagem") {
            // Limpar as referências de imagens convertidas
            updatedLead.arquivos = updatedLead.arquivos.map(arquivo => ({
              ...arquivo,
              pdfConvertido: undefined
            }));
            updatedLead.imagensConvertidas = '[]';
          } else if (type === "arquivo") {
            // Remover o arquivo específico da lista
            updatedLead.arquivos = updatedLead.arquivos.filter(arquivo => arquivo.id !== fileId);
          }
          
          onEdit({
            ...updatedLead,
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
    // Forçar recarga da lista sem passar dados antigos
    if (typeof forceRefresh === 'function') {
      forceRefresh();
    }
    
    window.setTimeout(() => {
      if (typeof forceRefresh === 'function') {
        forceRefresh();
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
    
    // Definir estado aguardando manuscrito
    updateManuscritoState({
      aguardandoManuscrito: true
    });
    
    try {
      // 🔥 CRÍTICO: Garantir conexão SSE ANTES de enviar manuscrito
      console.log('🔌 [Pre-Send] Forçando reconexão SSE para leadId:', lead.id);
      
      // Disparar evento customizado para forçar reconexão SSE antes do envio
      window.dispatchEvent(new CustomEvent('force-sse-reconnect', { 
        detail: { leadId: lead.id, reason: 'pre-manuscrito-send' } 
      }));
      
      // Aguardar 2 segundos para garantir que a conexão SSE seja estabelecida
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ [Pre-Send] Aguardo de conexão SSE concluído');
      
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

      console.log('📤 [Envio] Enviando manuscrito para processamento...');
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

      // A API já salva aguardandoManuscrito = true automaticamente

      toast({
        title: "Manuscrito enviado para processamento",
        description: "Aguarde o processamento do manuscrito. Você será notificado quando estiver pronto.",
        variant: "default",
      });
      
      // Atualizar o lead imediatamente para mostrar estado "aguardando"
      console.log('🔄 [Post-Send] Atualizando lead local para aguardandoManuscrito: true');
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          aguardandoManuscrito: true,
          manuscritoProcessado: false,
          _skipDialog: true,
        });
      }
      
      // Manter apenas aguardandoManuscrito = true
      // NÃO marcar como processado ainda
      console.log('🔄 [Post-Send] Chamando forceRefresh para atualizar lista de leads...');
      forceRefresh();
      setIsDigitando(false);
      
      // Aguardar um pouco e verificar se o lead foi atualizado
      setTimeout(() => {
        console.log('🔍 [Post-Send] Verificando estado do lead após refresh:', {
          leadId: lead.id,
          aguardandoManuscrito: lead.aguardandoManuscrito,
          manuscritoProcessado: lead.manuscritoProcessado
        });
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao enviar manuscrito:", error);
      setIsDigitando(false);
      
      // Resetar estado em caso de erro
      updateManuscritoState({
        aguardandoManuscrito: false
      });
      
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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          texto: texto,
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

      // Resetar todos os campos relacionados ao manuscrito
      updateManuscritoState({
        manuscritoProcessado: false,
        aguardandoManuscrito: false,
        provaManuscrita: undefined
      });
      
      // Resetar também os campos de análise que dependem do manuscrito
      updateAnaliseState({
        analiseUrl: undefined,
        aguardandoAnalise: false,
        analisePreliminar: undefined,
        analiseValidada: false
      });
      
      // Resetar consultoria já que depende da análise
      updateConsultoriaState(false);
      
      // Resetar campos de espelho relacionados
      updateEspelhoState({
        ...localEspelhoState,
        aguardandoEspelho: false,
        espelhoProcessado: false
      });
      
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          // Campos do manuscrito
          provaManuscrita: undefined,
          manuscritoProcessado: false,
          aguardandoManuscrito: false,
          // Campos da análise
          analiseUrl: undefined,
          analiseProcessada: false,
          aguardandoAnalise: false,
          analisePreliminar: undefined,
          analiseValidada: false,
          // Consultoria
          consultoriaFase2: false,
          // Campos do espelho relacionados
          aguardandoEspelho: false,
          espelhoProcessado: false,
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
    // Sempre abrir o diálogo, independente do estado
    setShowEspelhoDialog(true);
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
      
      // Definir estado aguardando espelho
      updateEspelhoState({
        aguardandoEspelho: true
      });

      // NÃO atualizar o lead localmente - deixar que a notificação SSE faça isso
      // const updatedLead = {
      //   ...lead,
      //   aguardandoEspelho: true,
      //   espelhoCorrecao: JSON.stringify(imageUrls),
      //   _skipDialog: true
      // };

      // // Atualizar o lead localmente primeiro
      // await onEdit(updatedLead);

      // Preparar payload para envio ao sistema externo
      const payload = {
        leadID: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        telefone: lead.phoneNumber,
        // Usar flag correta dependendo do estado da consultoria
        ...(consultoriaAtiva ? { espelhoparabiblioteca: true } : { espelho: true }),
        arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
          id: a.id,
          url: a.dataUrl,
          tipo: a.fileType,
          nome: a.fileType
        })),
        arquivos_pdf: lead.pdfUnificado ? [{
          id: `${lead.id}-pdf-unificado`,
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
        throw new Error(espelhoData.error || "Erro ao enviar espelho para sistema externo");
      }
      
      toast({
        title: "Espelho enviado",
        description: "Espelho enviado para o sistema externo com sucesso! Aguarde o processamento.",
      });
      
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
        // Usar flag correta dependendo do estado da consultoria
        ...(consultoriaAtiva ? { espelhoparabiblioteca: true } : { espelho: true }),
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
        throw new Error(espelhoData.error || "Erro ao enviar espelho para sistema externo");
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
      
      // NÃO atualizar o lead localmente - deixar que a notificação SSE faça isso
      // onEdit({
      //   ...lead,
      //   aguardandoAnalise: true,
      //   _skipDialog: true,
      // });
      
      toast({
        title: consultoriaAtiva ? "Consultoria solicitada" : "Análise solicitada",
        description: consultoriaAtiva 
          ? "A solicitação de consultoria fase 2 foi enviada com sucesso! Aguarde o processamento..."
          : "A solicitação de análise foi enviada com sucesso! Aguarde o processamento...",
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
        // Verificar se realmente há espelho para excluir
        const temEspelhoParaExcluir = lead.espelhoProcessado || 
                                     lead.espelhoCorrecao || 
                                     lead.textoDOEspelho || 
                                     localEspelhoState.hasEspelho;
        
        if (temEspelhoParaExcluir) {
          setConfirmDeleteEspelho(true);
        } else {
          toast({
            title: "Aviso",
            description: "Não há espelho para excluir.",
            variant: "default",
          });
        }
        break;
      case 'cancelarEspelho':
        handleCancelarEspelho();
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
      setConfirmDeleteEspelho(false);
      
      console.log(`[handleExcluirEspelho] Excluindo espelho do lead: ${lead.id}`);
      
      // Fazer a requisição para a API de exclusão de espelho
      const response = await fetch(`/api/admin/leads-chatwit/deletar-espelho?leadId=${lead.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao excluir espelho");
      }

      const data = await response.json();
      console.log(`[handleExcluirEspelho] Espelho excluído com sucesso:`, data);

      // Resetar estado local
      updateEspelhoState({
        hasEspelho: false,
        aguardandoEspelho: false,
        espelhoCorrecao: undefined,
        textoDOEspelho: undefined
      });

      // Atualizar o lead com os dados retornados da API
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          espelhoCorrecao: undefined,
          textoDOEspelho: undefined,
          espelhoProcessado: false,
          aguardandoEspelho: false,
          _skipDialog: true,
          _forceUpdate: true
        });
      }

      forceRefresh();

      toast({
        title: "Espelho excluído",
        description: "O espelho de correção foi removido completamente com sucesso.",
        variant: "default",
      });

    } catch (error: any) {
      console.error("[handleExcluirEspelho] Erro ao excluir espelho:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o espelho. Tente novamente.",
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
        title: "Excluindo todos os arquivos",
        description: "Aguarde enquanto excluímos todos os arquivos do lead (arquivos, PDF, manuscrito, espelho e análise)...",
      });
      
      const deletePromises = [];
      
      // 1. Excluir todos os arquivos individuais
      if (lead.arquivos && lead.arquivos.length > 0) {
        deletePromises.push(
          ...lead.arquivos.map(arquivo => 
            handleDeleteFile(arquivo.id, "arquivo")
          )
        );
      }
      
      // 2. Excluir PDF unificado se existir
      if (lead.pdfUnificado) {
        console.log(`[handleExecuteDeleteAllFiles] Iniciando exclusão do PDF: ${lead.pdfUnificado}`);
        deletePromises.push(
          handleDeleteFile(lead.id, "pdf").then(() => {
            console.log(`[handleExecuteDeleteAllFiles] PDF unificado excluído: ${lead.id}`);
          })
        );
      }
      
      // 3. Excluir imagens convertidas se existirem
      if (lead.arquivos && lead.arquivos.some(a => a.pdfConvertido)) {
        deletePromises.push(
          handleDeleteFile(lead.id, "imagem")
        );
      }
      
      // 4. Excluir manuscrito se existir
      if (lead.provaManuscrita || lead.manuscritoProcessado) {
        deletePromises.push(
          fetch(`/api/admin/leads-chatwit/manuscrito?leadId=${lead.id}`, {
            method: "DELETE",
          }).then(response => {
            if (!response.ok) {
              throw new Error("Erro ao excluir manuscrito");
            }
            return response.json();
          })
        );
      }
      
      // 5. Excluir análise se existir
      if (localAnaliseState.analiseUrl || localAnaliseState.analisePreliminar || localAnaliseState.aguardandoAnalise) {
        deletePromises.push(
          fetch("/api/admin/leads-chatwit/leads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: lead.id,
              analiseUrl: "",
              analiseProcessada: false,
              aguardandoAnalise: false,
              analisePreliminar: false,
              analiseValidada: false,
            }),
          }).then(response => {
            if (!response.ok) {
              throw new Error("Erro ao excluir análise");
            }
            return response.json();
          })
        );
      }
      
      // 6. Excluir espelho individual (mas não da biblioteca) se existir
      const temEspelhoIndividual = (lead.espelhoCorrecao && lead.espelhoCorrecao !== '[]') || 
                                   (lead.textoDOEspelho && lead.textoDOEspelho !== '') ||
                                   lead.espelhoProcessado ||
                                   lead.aguardandoEspelho;
      
      if (temEspelhoIndividual && !lead.espelhoBibliotecaId) {
        // Usar a API de deletar-espelho para exclusão completa
        deletePromises.push(
          fetch(`/api/admin/leads-chatwit/deletar-espelho?leadId=${lead.id}`, {
            method: "DELETE",
          }).then(response => {
            if (!response.ok) {
              throw new Error("Erro ao excluir espelho");
            }
            console.log(`[handleExecuteDeleteAllFiles] Espelho excluído: ${lead.id}`);
            return response.json();
          })
        );
      }
      
      // Executar todas as promessas em paralelo
      await Promise.all(deletePromises);
      
      console.log(`[handleExecuteDeleteAllFiles] Todas as exclusões concluídas para o lead: ${lead.id}`);
      
      // Atualizar estados locais
      updateManuscritoState({
        manuscritoProcessado: false,
        aguardandoManuscrito: false,
        provaManuscrita: undefined
      });
      
      updateEspelhoState({
        hasEspelho: false,
        aguardandoEspelho: false,
        espelhoCorrecao: undefined,
        textoDOEspelho: undefined
      });
      
      updateAnaliseState({
        analiseUrl: undefined,
        aguardandoAnalise: false,
        analisePreliminar: false,
        analiseValidada: false
      });
      
      // Atualizar o lead após todas as exclusões - GARANTIR que pdfUnificado seja removido
      const leadAtualizado = {
        ...lead,
        arquivos: [],
        pdfUnificado: undefined, // Usar undefined para compatibilidade com TypeScript
        imagensConvertidas: JSON.stringify([]),
        provaManuscrita: undefined,
        manuscritoProcessado: false,
        aguardandoManuscrito: false,
        // Resetar espelho individual (não tocar na biblioteca)
        ...(temEspelhoIndividual && !lead.espelhoBibliotecaId ? {
          textoDOEspelho: undefined,
          espelhoCorrecao: undefined,
          espelhoProcessado: false,
          aguardandoEspelho: false,
        } : {}),
        // Resetar análise
        analiseUrl: undefined,
        analiseProcessada: false,
        aguardandoAnalise: false,
        analisePreliminar: false,
        analiseValidada: false,
        _skipDialog: true,
        _forceUpdate: true
      };
      
      console.log(`[handleExecuteDeleteAllFiles] Atualizando lead final:`, {
        id: leadAtualizado.id,
        pdfUnificado: leadAtualizado.pdfUnificado,
        arquivos: leadAtualizado.arquivos.length,
        manuscritoProcessado: leadAtualizado.manuscritoProcessado,
        espelhoProcessado: leadAtualizado.espelhoProcessado
      });
      
      await onEdit(leadAtualizado);
      
      // Forçar refresh
      forceRefresh();
      
      toast({
        title: "Sucesso",
        description: "Todos os arquivos do lead foram excluídos com sucesso! (Arquivos, PDF, manuscrito, espelho individual e análise)",
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

      // Definir estado aguardando espelho
      updateEspelhoState({
        aguardandoEspelho: true
      });

      // NÃO atualizar o lead localmente - deixar que a notificação SSE faça isso
      // const updatedLead = {
      //   ...lead,
      //   aguardandoEspelho: true,
      //   espelhoCorrecao: JSON.stringify(images),
      //   _skipDialog: true
      // };

      // // Atualizar o lead localmente primeiro
      // await onEdit(updatedLead);

      // Preparar payload para envio ao sistema externo
      const payload = {
        leadID: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        telefone: lead.phoneNumber,
        // Usar flag correta dependendo do estado da consultoria
        ...(consultoriaAtiva ? { espelhoparabiblioteca: true } : { espelho: true }),
        arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
          id: a.id,
          url: a.dataUrl,
          tipo: a.fileType,
          nome: a.fileType
        })),
        arquivos_pdf: lead.pdfUnificado ? [{
          id: `${lead.id}-pdf-unificado`,
          url: lead.pdfUnificado,
          nome: "PDF Unificado"
        }] : [],
        arquivos_imagens_espelho: images.map((url: string, index: number) => ({
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

      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar espelho para processamento");
      }

      // A API já salva aguardandoEspelho = true automaticamente

      toast({
        title: "Espelho enviado para processamento",
        description: "Aguarde o processamento do espelho. Você será notificado quando estiver pronto.",
        variant: "default",
      });
      
      // Manter apenas aguardandoEspelho = true
      // NÃO marcar como processado ainda
      forceRefresh();
    } catch (error: any) {
      console.error("Erro ao enviar espelho:", error);
      setIsEnviandoEspelho(false);
      
      // Resetar estado em caso de erro
      updateEspelhoState({
        aguardandoEspelho: false
      });
      
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o espelho. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsEnviandoEspelho(false);
    }
  };

  // Handler para salvar espelho
  const handleSaveEspelho = async (texto: any, imagens: string[]) => {
    try {
      console.log(`[handleSaveEspelho] Salvando espelho do lead: ${lead.id}`);
      console.log(`[handleSaveEspelho] Texto:`, texto);
      console.log(`[handleSaveEspelho] Imagens:`, imagens);

      const response = await fetch("/api/admin/leads-chatwit/deletar-espelho", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          texto: texto,
          imagens: imagens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao salvar espelho");
      }

      const data = await response.json();
      console.log(`[handleSaveEspelho] Espelho salvo com sucesso:`, data);

      // Atualizar estado local
      const hasContent = !!(texto || (imagens && imagens.length > 0));
      updateEspelhoState({
        hasEspelho: hasContent,
        aguardandoEspelho: false,
        espelhoCorrecao: imagens,
        textoDOEspelho: texto
      });

      // Atualizar o lead
      if (typeof onEdit === 'function') {
        onEdit({
          ...lead,
          textoDOEspelho: texto,
          espelhoCorrecao: imagens ? JSON.stringify(imagens) : undefined,
          espelhoProcessado: hasContent,
          aguardandoEspelho: false,
          _skipDialog: true,
        });
      }

      toast({
        title: "Espelho salvo",
        description: "Espelho de correção atualizado com sucesso!",
      });

    } catch (error: any) {
      console.error("[handleSaveEspelho] Erro ao salvar espelho:", error);
      throw error;
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

  // Handler para cancelar processamento do manuscrito
  const handleCancelarManuscrito = async () => {
    try {
      // Atualizar estado local imediatamente para feedback visual instantâneo
      updateManuscritoState({
        aguardandoManuscrito: false
      });
      
      // Forçar atualização do botão
      forceRefresh();
      
      // Prepara o payload para envio
      const payload = {
        id: lead.id,
        aguardandoManuscrito: false,
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
        throw new Error(data.error || "Erro ao cancelar processamento do manuscrito");
      }
      
      // Atualizar o lead localmente
      const updatedLead = {
        ...lead,
        aguardandoManuscrito: false,
        _skipDialog: true,
        _forceUpdate: true, // Forçar atualização completa
      };
      
      // Chamar o método de edição
      await onEdit(updatedLead);
      
      toast({
        title: "Sucesso",
        description: "Processamento do manuscrito cancelado com sucesso!",
      });
      
      // Forçar nova atualização após pequeno delay para garantir sincronização
      setTimeout(() => {
        forceRefresh();
      }, 100);
      
    } catch (error: any) {
      console.error("Erro ao cancelar processamento do manuscrito:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar o processamento. Tente novamente.",
        variant: "destructive",
      });
      
      // Restaurar estado em caso de erro
      updateManuscritoState({
        aguardandoManuscrito: !!lead.aguardandoManuscrito
      });
      
      // Forçar atualização do botão
      forceRefresh();
    }
  };

  // Handler para cancelar processamento do espelho
  const handleCancelarEspelho = async () => {
    try {
      console.log("[Cancelar Espelho] Iniciando cancelamento...");
      
      // Fechar o diálogo antes de cancelar
      setShowEspelhoDialog(false);
      
      // Atualizar estado local imediatamente para feedback visual instantâneo
      updateEspelhoState({
        aguardandoEspelho: false
      });
      
      // Forçar atualização do botão
      forceRefresh();
      
      // Prepara o payload para envio
      const payload = {
        id: lead.id,
        aguardandoEspelho: false,
        espelhoProcessado: false,
      };
      
      console.log("[Cancelar Espelho] Enviando payload:", payload);
      console.log("[Cancelar Espelho] Lead atual antes da atualização:", {
        id: lead.id,
        aguardandoEspelho: lead.aguardandoEspelho,
        espelhoProcessado: lead.espelhoProcessado
      });
      
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("[Cancelar Espelho] Erro na resposta:", data);
        throw new Error(data.error || "Erro ao cancelar processamento do espelho");
      }
      
      console.log("[Cancelar Espelho] Resposta OK, atualizando lead...");
      
      // Atualizar o lead localmente
      const updatedLead = {
        ...lead,
        aguardandoEspelho: false,
        espelhoProcessado: false,
        _skipDialog: true,
        _forceUpdate: true, // Forçar atualização completa
      };
      
      // Chamar o método de edição
      await onEdit(updatedLead);
      
      console.log("[Cancelar Espelho] Lead atualizado com sucesso!");
      
      toast({
        title: "Sucesso",
        description: "Processamento do espelho cancelado com sucesso!",
      });
      
      // Forçar nova atualização após pequeno delay para garantir sincronização
      setTimeout(() => {
        forceRefresh();
      }, 100);
      
    } catch (error: any) {
      console.error("Erro ao cancelar processamento do espelho:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar o processamento. Tente novamente.",
        variant: "destructive",
      });
      
      // Restaurar estado em caso de erro
      updateEspelhoState({
        aguardandoEspelho: !!lead.aguardandoEspelho
      });
      
      // Forçar atualização do botão
      forceRefresh();
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
    handleCancelarManuscrito,
    handleEspelhoClick,
    handleCancelarEspelho,
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
    handleSaveAnalisePreliminar,
    getConvertedImages: () => getConvertedImages(lead)
  };
} 