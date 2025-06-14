"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast, useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { LeadItem } from "./lead-item/lead-item";
import { RefreshCw, FileUp, Edit3, Zap, Play } from "lucide-react";
import { DialogDetalheLead } from "./dialog-detalhe-lead";
import { BatchProgressDialog } from "./batch-progress-dialog";
import { ManuscritoDialog } from "./manuscrito-dialog";
import { EspelhoDialog } from "./espelho-dialog";
import { ImageGalleryDialog } from "./image-gallery-dialog";
import { SSEConnectionManager } from "./sse-connection-manager";
import { useBatchProcessor } from "./lead-item/componentes-lead-item/hooks/useBatchProcessor";
import { LeadChatwit } from "../types";

interface LeadsListProps {
  searchQuery: string;
  onRefresh: () => void;
  initialLoading: boolean;
  refreshCounter?: number;
}

export function LeadsList({ searchQuery, onRefresh, initialLoading, refreshCounter = 0 }: LeadsListProps) {
  const [leads, setLeads] = useState<LeadChatwit[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnifying, setIsUnifying] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<LeadChatwit | null>(null);
  
  // Estados para processamento em lote
  const [showBatchProgress, setShowBatchProgress] = useState(false);
  const [showBatchManuscritoDialog, setShowBatchManuscritoDialog] = useState(false);
  const [showBatchEspelhoDialog, setShowBatchEspelhoDialog] = useState(false);
  const [showBatchImageSelector, setShowBatchImageSelector] = useState(false);
  const [currentBatchLead, setCurrentBatchLead] = useState<LeadChatwit | null>(null);
  const [batchDialogMode, setBatchDialogMode] = useState<'manuscrito' | 'espelho' | null>(null);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchLeadsList, setBatchLeadsList] = useState<LeadChatwit[]>([]);
  const [batchDialogResolve, setBatchDialogResolve] = useState<((success: boolean) => void) | null>(null);

  const { toast } = useToast();

  // Callback para quando um manuscrito é necessário no processamento em lote
  const handleBatchManuscritoNeeded = async (lead: LeadChatwit, index: number, total: number): Promise<boolean> => {
    return new Promise((resolve) => {
      setCurrentBatchLead(lead);
      setBatchCurrentIndex(index);
      setBatchLeadsList(Array(total).fill(null).map((_, i) => i === index - 1 ? lead : {} as LeadChatwit));
      setBatchDialogMode('manuscrito');
      setBatchDialogResolve(() => resolve);
      setShowBatchImageSelector(true);
    });
  };

  // Callback para quando um espelho é necessário no processamento em lote
  const handleBatchEspelhoNeeded = async (lead: LeadChatwit, index: number, total: number): Promise<boolean> => {
    return new Promise((resolve) => {
      setCurrentBatchLead(lead);
      setBatchCurrentIndex(index);
      setBatchLeadsList(Array(total).fill(null).map((_, i) => i === index - 1 ? lead : {} as LeadChatwit));
      setBatchDialogMode('espelho');
      setBatchDialogResolve(() => resolve);
      setShowBatchImageSelector(true);
    });
  };

  // Callback para atualizar um lead após processamento
  const handleLeadUpdated = (leadId: string) => {
    console.log(`[BatchProcessor] handleLeadUpdated chamado para lead: ${leadId}`);
    // Recarregar a lista de leads para mostrar as mudanças
    fetchLeads();
  };

  // Inicializar o hook de processamento em lote
  const batchProcessor = useBatchProcessor({
    onManuscritoDialogNeeded: handleBatchManuscritoNeeded,
    onEspelhoDialogNeeded: handleBatchEspelhoNeeded,
    onLeadUpdated: handleLeadUpdated,
  });

  useEffect(() => {
    fetchLeads();
  }, [searchQuery, pagination.page, pagination.limit, refreshCounter]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/admin/leads-chatwit/leads?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setLeads(data.leads);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || "Erro ao buscar leads");
      }
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os leads. Tente novamente.",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar novamente" onClick={fetchLeads}>
            Tentar novamente
          </ToastAction>
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnificarArquivos = async (leadId: string) => {
    setIsUnifying(true);
    try {
      const response = await fetch("/api/admin/leads-chatwit/unify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Arquivos unificados com sucesso!",
        });
        fetchLeads(); // Recarrega a lista para mostrar o PDF unificado
      } else {
        throw new Error(data.error || "Erro ao unificar arquivos");
      }
    } catch (error) {
      console.error("Erro ao unificar arquivos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível unificar os arquivos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUnifying(false);
    }
  };

  const handleConverterEmImagens = async (leadId: string) => {
    setIsConverting(leadId);
    try {
      const response = await fetch("/api/admin/leads-chatwit/convert-to-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "PDF convertido em imagens com sucesso!",
        });
        fetchLeads(); // Recarrega a lista para mostrar as imagens
      } else {
        throw new Error(data.error || "Erro ao converter PDF em imagens");
      }
    } catch (error) {
      console.error("Erro ao converter PDF em imagens:", error);
      toast({
        title: "Erro",
        description: "Não foi possível converter o PDF em imagens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(null);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/leads-chatwit/leads?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Lead excluído com sucesso!",
        });
        setLeads(leads.filter(lead => lead.id !== id));
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir lead");
      }
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lead. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditLead = (lead: any) => {
    if (!lead || !lead.id) {
      toast({
        title: "Erro",
        description: "Não foi possível obter os dados do lead",
        variant: "destructive",
      });
      return;
    }
    
    // Se for uma edição interna (flag _internal = true) ou tiver _skipDialog, não abrimos o diálogo
    if (lead._internal || lead._skipDialog) {
      handleSaveLead(lead);
      return;
    }
    
    setCurrentLead(lead);
    setDetailsOpen(true);
  };

  const handleSaveLead = async (leadData: any) => {
    // Verificar se a edição é interna (do diálogo) ou externa (de outra parte da aplicação)
    const isInternalEdit = leadData._internal;
    const forceUpdate = leadData._forceUpdate;
    
    // Remover flags temporárias antes de enviar para a API
    const { _internal, _forceUpdate, _refresh, ...dataToSend } = leadData;
    
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        // Se for uma edição interna, apenas atualizar o lead atual sem recarregar tudo
        if (isInternalEdit && !forceUpdate) {
          // Atualizar apenas o lead atual no estado
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === leadData.id ? { ...lead, ...dataToSend } : lead
            )
          );
          
          // Atualizar o currentLead também para manter o dialog sincronizado
          if (currentLead && currentLead.id === leadData.id) {
            setCurrentLead((prev: LeadChatwit | null) => prev ? { ...prev, ...dataToSend } : null);
          }
        } 
        // Se forçar atualização ou não for uma edição interna, recarregar a lista completa
        else if (forceUpdate || !isInternalEdit) {
          fetchLeads();
        }
        
        return Promise.resolve();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao atualizar lead");
      }
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o lead. Tente novamente.",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleToggleLead = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, id]);
    } else {
      setSelectedLeads(prev => prev.filter(leadId => leadId !== id));
    }
  };

  const handleDigitarManuscrito = async (lead: any) => {
    try {
      // Obter as imagens convertidas
      let imagensConvertidas: string[] = [];
      if (lead.imagensConvertidas) {
        try {
          imagensConvertidas = JSON.parse(lead.imagensConvertidas);
        } catch (error) {
          console.error("Erro ao processar URLs de imagens convertidas:", error);
        }
      }

      // Se não houver imagens no campo imagensConvertidas, buscar dos arquivos
      if (!imagensConvertidas || imagensConvertidas.length === 0) {
        imagensConvertidas = lead.arquivos
          .filter((a: { pdfConvertido: string | null }) => a.pdfConvertido)
          .map((a: { pdfConvertido: string }) => a.pdfConvertido)
          .filter((url: string | null) => url && url.length > 0);
      }

      // Preparar os dados para enviar ao webhook
      const webhookData = {
        lead_chatwit: true,// Campo booleano para identificação
        manuscrito: true, // Campo booleano para identificação
        id: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        email: lead.email,
        telefone: lead.phoneNumber,
        status: lead.status,
        data_criacao: lead.createdAt,
        usuario: {
          id: lead.usuario.id,
          nome: lead.usuario.name,
          email: lead.usuario.email,
          channel: lead.usuario.channel
        },
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
        arquivos_imagens: imagensConvertidas.map((url: string, index: number) => ({
          id: `${lead.id}-img-${index}`,
          url: url,
          nome: `Página ${index + 1}`
        })),
        recursos: lead.datasRecurso ? JSON.parse(lead.datasRecurso).map((data: string, index: number) => ({
          id: `${lead.id}-recurso-${index}`,
          tipo: "recurso",
          status: "realizado",
          data_criacao: data
        })) : [],
        observacoes: lead.anotacoes || "",
        metadata: {
          leadUrl: lead.leadUrl,
          sourceId: lead.sourceId,
          concluido: lead.concluido,
          fezRecurso: lead.fezRecurso
        }
      };

      const response = await fetch("/api/admin/leads-chatwit/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Solicitação de digitação enviada com sucesso!",
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar solicitação de digitação");
      }
    } catch (error: any) {
      console.error("Erro ao enviar solicitação de digitação:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a solicitação de digitação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para iniciar o processamento em lote
  const handleStartBatchProcessing = async () => {
    if (selectedLeads.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecione pelo menos um lead para processar.",
      });
      return;
    }

    const leadsToProcess = leads.filter(lead => selectedLeads.includes(lead.id));
    
    setShowBatchProgress(true);
    await batchProcessor.processarLeadsEmLote(leadsToProcess);
  };

  // Função para lidar com imagens selecionadas no seletor batch
  const handleBatchImageSelection = async (selectedImages: string[]) => {
    setShowBatchImageSelector(false);
    
    if (!currentBatchLead || !batchDialogResolve) return;

    if (selectedImages.length === 0) {
      // Usuário cancelou, resolve com false
      batchDialogResolve(false);
      setBatchDialogResolve(null);
      return;
    }

    if (batchDialogMode === 'manuscrito') {
      // Enviar imagens para processamento de manuscrito
      try {
        await handleEnviarManuscritoParaLead(currentBatchLead, selectedImages);
        setShowBatchManuscritoDialog(true);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao enviar manuscrito",
          variant: "destructive",
        });
        batchDialogResolve(false);
        setBatchDialogResolve(null);
      }
    } else if (batchDialogMode === 'espelho') {
      // Enviar imagens para processamento de espelho
      try {
        await handleEnviarEspelhoParaLead(currentBatchLead, selectedImages);
        setShowBatchEspelhoDialog(true);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao enviar espelho",
          variant: "destructive",
        });
        batchDialogResolve(false);
        setBatchDialogResolve(null);
      }
    }
  };

  // Função auxiliar para enviar manuscrito para um lead específico
  const handleEnviarManuscritoParaLead = async (lead: LeadChatwit, selectedImages: string[]) => {
    const payload = {
      leadID: lead.id,
      nome: lead.nomeReal || lead.name || "Lead sem nome",
      telefone: lead.phoneNumber,
      manuscrito: true,
      arquivos: lead.arquivos?.map((a: { id: string; dataUrl: string; fileType: string }) => ({
        id: a.id,
        url: a.dataUrl,
        tipo: a.fileType,
        nome: a.fileType
      })) || [],
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Erro ao enviar manuscrito");
    }
  };

  // Função auxiliar para enviar espelho para um lead específico
  const handleEnviarEspelhoParaLead = async (lead: LeadChatwit, selectedImages: string[]) => {
    const payload = {
      leadID: lead.id,
      nome: lead.nomeReal || lead.name || "Lead sem nome",
      telefone: lead.phoneNumber,
      espelho: true,
      arquivos: lead.arquivos?.map((a: { id: string; dataUrl: string; fileType: string }) => ({
        id: a.id,
        url: a.dataUrl,
        tipo: a.fileType,
        nome: a.fileType
      })) || [],
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
        fezRecurso: lead.fezRecurso
      }
    };

    const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Erro ao enviar espelho");
    }
  };

  // Função para prosseguir no diálogo batch após salvar
  const handleBatchNext = () => {
    if (batchDialogResolve) {
      batchDialogResolve(true);
      setBatchDialogResolve(null);
    }
    setShowBatchManuscritoDialog(false);
    setShowBatchEspelhoDialog(false);
    setCurrentBatchLead(null);
    setBatchDialogMode(null);
  };

  // Função para pular um lead no processamento batch
  const handleBatchSkip = () => {
    if (batchDialogResolve) {
      batchDialogResolve(false);
      setBatchDialogResolve(null);
    }
    setShowBatchManuscritoDialog(false);
    setShowBatchEspelhoDialog(false);
    setCurrentBatchLead(null);
    setBatchDialogMode(null);
  };

  // Obter imagens convertidas de um lead
  const getConvertedImagesFromLead = (lead: LeadChatwit): string[] => {
    let imagensConvertidas: string[] = [];
    
    if (lead.imagensConvertidas) {
      try {
        imagensConvertidas = JSON.parse(lead.imagensConvertidas);
      } catch (error) {
        console.error("Erro ao processar URLs de imagens convertidas:", error);
      }
    }

    // Se não houver imagens no campo imagensConvertidas, buscar dos arquivos
    if (!imagensConvertidas || imagensConvertidas.length === 0) {
      imagensConvertidas = lead.arquivos
        .filter((a: { pdfConvertido?: string | null | undefined }) => a.pdfConvertido)
        .map((a: { pdfConvertido?: string | null | undefined }) => a.pdfConvertido as string)
        .filter((url: string | null) => url && url.length > 0);
    }

    return imagensConvertidas;
  };

  return (
    <div className="space-y-4">
      {/* Gerenciador de Conexões SSE */}
      <SSEConnectionManager 
        leads={leads}
        onLeadUpdate={handleEditLead}
      />
      
      {selectedLeads.length > 0 && (
        <div className="flex items-center justify-between bg-muted p-2 rounded-md">
          <div className="flex items-center gap-3">
            <span className="font-medium">{selectedLeads.length} leads selecionados</span>
            {batchProcessor.state.isProcessing && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Processando em lote...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedLeads([])}
              disabled={batchProcessor.state.isProcessing}
            >
              Limpar seleção
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleStartBatchProcessing}
              disabled={batchProcessor.state.isProcessing}
              className="flex items-center gap-2"
            >
              {batchProcessor.state.isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {batchProcessor.state.isProcessing ? "Processando..." : "Processamento em Lote"}
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => toast({
                title: "Não implementado",
                description: "Esta funcionalidade será adicionada em breve.",
              })}
              disabled={batchProcessor.state.isProcessing}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      )}

      {(isLoading || initialLoading) ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum lead encontrado.
        </div>
      ) : (
        <div className="overflow-auto">
          {/* Removemos a classe "table-fixed" para que as colunas se ajustem naturalmente */}
          <Table className="w-full border">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] align-middle">
                  <Checkbox
                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                    onCheckedChange={handleToggleAllLeads}
                    aria-label="Selecionar todos os leads"
                  />
                </TableHead>
                <TableHead className="w-[250px] align-middle">Lead</TableHead>
                <TableHead className="w-[100px] align-middle">Usuário</TableHead>
                <TableHead className="w-[150px] align-middle">Arquivos</TableHead>
                <TableHead className="w-[80px] align-middle">PDF</TableHead>
                <TableHead className="w-[80px] align-middle">Imagens</TableHead>
                <TableHead className="w-[100px] align-middle">Manuscrito</TableHead>
                <TableHead className="w-[120px] align-middle">Espelho de Correção</TableHead>
                <TableHead className="w-[120px] align-middle">Análise</TableHead>
                <TableHead className="w-[80px] align-middle">Consultoria</TableHead>
                <TableHead className="w-[60px] align-middle">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <LeadItem
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={handleToggleLead}
                  onDelete={handleDeleteLead}
                  onEdit={handleEditLead}
                  onUnificar={handleUnificarArquivos}
                  onConverter={handleConverterEmImagens}
                  onDigitarManuscrito={handleDigitarManuscrito}
                  onRefresh={fetchLeads}
                  isUnifying={isUnifying}
                  isConverting={isConverting}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {leads.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Exibindo {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} leads
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || isLoading}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages || isLoading}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {currentLead && (
        <DialogDetalheLead
          lead={currentLead}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onEdit={handleSaveLead}
          isSaving={isSaving}
        />
      )}

      {/* Diálogos de Processamento em Lote */}
      <BatchProgressDialog
        isOpen={showBatchProgress}
        onClose={() => setShowBatchProgress(false)}
        state={batchProcessor.state}
        onCancel={batchProcessor.cancelarProcessamento}
        onContinue={() => {
          setShowBatchProgress(false);
          handleStartBatchProcessing();
        }}
      />

      {/* Seletor de Imagens para Processamento Batch */}
      {currentBatchLead && (
        <ImageGalleryDialog
          isOpen={showBatchImageSelector}
          onClose={() => {
            setShowBatchImageSelector(false);
            if (batchDialogResolve) {
              batchDialogResolve(false);
              setBatchDialogResolve(null);
            }
          }}
          images={getConvertedImagesFromLead(currentBatchLead)}
          leadId={currentBatchLead.id}
          title={`Selecionar Imagens - ${batchDialogMode === 'manuscrito' ? 'Manuscrito' : 'Espelho'}`}
          description={`Selecione as imagens para processar o ${batchDialogMode} do lead "${currentBatchLead.nomeReal || currentBatchLead.name}"`}
          selectionMode={true}
          onSend={handleBatchImageSelection}
        />
      )}

      {/* Diálogo de Manuscrito em Lote */}
      {currentBatchLead && (
        <ManuscritoDialog
          isOpen={showBatchManuscritoDialog}
          onClose={() => {
            setShowBatchManuscritoDialog(false);
            if (batchDialogResolve) {
              batchDialogResolve(false);
              setBatchDialogResolve(null);
            }
          }}
          leadId={currentBatchLead.id}
          textoManuscrito={currentBatchLead.provaManuscrita || ""}
          aguardandoManuscrito={currentBatchLead.aguardandoManuscrito || false}
          onSave={async (texto: string) => {
            // Salvar manuscrito usando a API existente
            const response = await fetch('/api/admin/leads-chatwit/manuscrito', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                leadId: currentBatchLead.id,
                textoManuscrito: texto,
              }),
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Erro ao salvar manuscrito');
            }

            handleLeadUpdated(currentBatchLead.id);
          }}
          batchMode={true}
          batchInfo={{
            current: batchCurrentIndex,
            total: batchLeadsList.length,
            leadName: currentBatchLead.nomeReal || currentBatchLead.name || "Lead sem nome",
          }}
          onBatchNext={handleBatchNext}
          onBatchSkip={handleBatchSkip}
        />
      )}

      {/* Diálogo de Espelho em Lote */}
      {currentBatchLead && (
        <EspelhoDialog
          isOpen={showBatchEspelhoDialog}
          onClose={() => {
            setShowBatchEspelhoDialog(false);
            if (batchDialogResolve) {
              batchDialogResolve(false);
              setBatchDialogResolve(null);
            }
          }}
          leadId={currentBatchLead.id}
          leadData={currentBatchLead}
          textoEspelho={currentBatchLead.textoDOEspelho || null}
          imagensEspelho={(() => {
            try {
              const espelhoCorrecao = currentBatchLead.espelhoCorrecao;
              if (espelhoCorrecao && espelhoCorrecao !== '[]') {
                return JSON.parse(espelhoCorrecao);
              }
            } catch (error) {
              console.error('Erro ao parsear espelhoCorrecao:', error);
            }
            return [];
          })()}
          aguardandoEspelho={currentBatchLead.aguardandoEspelho || false}
          onSave={async (texto: any, imagens: string[]) => {
            // Salvar espelho usando a API existente
            const response = await fetch('/api/admin/leads-chatwit/associar-espelho', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                leadId: currentBatchLead.id,
                texto: texto,
                imagens: imagens,
              }),
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Erro ao salvar espelho');
            }

            handleLeadUpdated(currentBatchLead.id);
          }}
          batchMode={true}
          batchInfo={{
            current: batchCurrentIndex,
            total: batchLeadsList.length,
            leadName: currentBatchLead.nomeReal || currentBatchLead.name || "Lead sem nome",
          }}
          onBatchNext={handleBatchNext}
          onBatchSkip={handleBatchSkip}
        />
      )}
    </div>
  );
}
