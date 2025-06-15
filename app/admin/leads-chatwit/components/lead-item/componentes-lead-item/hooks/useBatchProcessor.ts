import { useState, useCallback } from "react";
import { toast } from "sonner";
import { LeadChatwit } from "@/app/admin/leads-chatwit/types";

export interface BatchProcessState {
  isProcessing: boolean;
  currentStep: string;
  currentLead: string | null;
  processedCount: number;
  totalCount: number;
  leadsNeedingManuscrito: LeadChatwit[];
  leadsNeedingEspelho: LeadChatwit[];
  isPaused: boolean;
  pauseReason: 'manuscrito' | 'espelho' | null;
}

export interface BatchProcessorOptions {
  onManuscritoDialogNeeded: (lead: LeadChatwit, index: number, total: number) => Promise<boolean>;
  onEspelhoDialogNeeded: (lead: LeadChatwit, index: number, total: number) => Promise<boolean>;
  onLeadUpdated: (leadId: string) => void;
}

export function useBatchProcessor({
  onManuscritoDialogNeeded,
  onEspelhoDialogNeeded,
  onLeadUpdated,
}: BatchProcessorOptions) {

  const [state, setState] = useState<BatchProcessState>({
    isProcessing: false,
    currentStep: '',
    currentLead: null,
    processedCount: 0,
    totalCount: 0,
    leadsNeedingManuscrito: [],
    leadsNeedingEspelho: [],
    isPaused: false,
    pauseReason: null
  });

  const updateState = useCallback((updates: Partial<BatchProcessState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const processarLeadsEmLote = useCallback(async (leadsSelecionados: LeadChatwit[]) => {
    console.log('Iniciando processamento em lote para:', leadsSelecionados);

    updateState({
      isProcessing: true,
      currentStep: 'Iniciando processamento',
      processedCount: 0,
      totalCount: leadsSelecionados.length,
      leadsNeedingManuscrito: [],
      leadsNeedingEspelho: [],
      isPaused: false,
      pauseReason: null
    });

    toast("Processamento Iniciado", {
      description: `Iniciando processamento para ${leadsSelecionados.length} leads.`,
    });

    const leadsParaManuscrito: LeadChatwit[] = [];
    const leadsParaEspelho: LeadChatwit[] = [];
    let processedCount = 0;

    try {
      for (const lead of leadsSelecionados) {
        processedCount++;
        
        if (lead.consultoriaFase2) {
          updateState({
            currentStep: `Ignorando lead "${lead.nomeReal || lead.name}" (consultoria ativa)`,
            currentLead: lead.id,
            processedCount
          });
          toast("Lead Ignorado", { description: `Lead "${lead.nomeReal || lead.name}" ignorado: Consultoria já iniciada.` });
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        let leadAtualizado = { ...lead };
        const displayName = leadAtualizado.nomeReal || leadAtualizado.name || "Lead sem nome";

        console.log(`[BatchProcessor] === PROCESSANDO LEAD ${processedCount}/${leadsSelecionados.length} ===`);
        console.log(`[BatchProcessor] Lead ID: ${leadAtualizado.id}`);
        console.log(`[BatchProcessor] Nome: ${displayName}`);
        
        updateState({
          currentStep: `Processando "${displayName}"`,
          currentLead: leadAtualizado.id,
          processedCount
        });

        // --- ETAPA 1: Unificar PDF ---
        if (!leadAtualizado.pdfUnificado && leadAtualizado.arquivos && leadAtualizado.arquivos.length > 0) {
          updateState({ currentStep: `Unificando PDFs para "${displayName}"` });
          try {
            const response = await fetch('/api/admin/leads-chatwit/unify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: leadAtualizado.id })
            });
            const data = await response.json();
            if (response.ok) {
              leadAtualizado.pdfUnificado = data.pdfUrl || 'sim_presente';
              await fetch('/api/admin/leads-chatwit/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: leadAtualizado.id, pdfUnificado: leadAtualizado.pdfUnificado })
              });
              toast("PDF Unificado", { description: `PDF de "${displayName}" unificado com sucesso.` });
            } else {
              throw new Error(data.error || "Erro ao unificar PDFs");
            }
          } catch (error: any) {
            console.error(`[BatchProcessor] ERRO ETAPA 1 para ${displayName}:`, error);
            toast.error("Erro na Unificação", { description: `Erro ao unificar PDFs de "${displayName}": ${error.message}` });
            continue;
          }
        }

        // --- ETAPA 2: Gerar Imagens ---
        const imagensExistem = leadAtualizado.imagensConvertidas && JSON.parse(leadAtualizado.imagensConvertidas || '[]').length > 0;
        if (leadAtualizado.pdfUnificado && !imagensExistem) {
          updateState({ currentStep: `Gerando imagens para "${displayName}"` });
          try {
            const response = await fetch('/api/admin/leads-chatwit/convert-to-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: leadAtualizado.id })
            });
            const data = await response.json();
            if (response.ok) {
              const imageUrls = data.imageUrls || data.convertedUrls || [];
              leadAtualizado.imagensConvertidas = JSON.stringify(imageUrls);
              const saveResponse = await fetch('/api/admin/leads-chatwit/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: leadAtualizado.id, imagensConvertidas: leadAtualizado.imagensConvertidas })
              });
              if (!saveResponse.ok) console.error(`[BatchProcessor] Erro ao salvar imagensConvertidas para ${displayName}`);
              toast("Imagens Geradas", { description: `${imageUrls.length} imagens de "${displayName}" geradas com sucesso.` });
            } else {
              throw new Error(data.error || "Erro ao gerar imagens");
            }
          } catch (error: any) {
            console.error(`[BatchProcessor] ERRO ETAPA 2 para ${displayName}:`, error);
            toast.error("Erro na Conversão", { description: `Erro ao gerar imagens de "${displayName}": ${error.message}` });
            continue;
          }
        }
        
        // --- Recarregar dados do lead ---
        try {
          const refreshResponse = await fetch(`/api/admin/leads-chatwit/leads?id=${leadAtualizado.id}`);
          if (refreshResponse.ok) {
            const refreshedLead = await refreshResponse.json();
            leadAtualizado = { ...leadAtualizado, ...refreshedLead };
          }
        } catch (error) {
          console.log(`[BatchProcessor] Aviso: Não foi possível recarregar dados do lead ${displayName}`);
        }
        
        // --- ETAPA 3: Verificar Manuscrito ---
        const temImagens = leadAtualizado.imagensConvertidas && JSON.parse(leadAtualizado.imagensConvertidas || '[]').length > 0;
        if (temImagens && !leadAtualizado.provaManuscrita && !leadAtualizado.manuscritoProcessado) {
          leadsParaManuscrito.push(leadAtualizado);
        }
        
        // --- ETAPA 4: Verificar Espelho ---
        if (leadAtualizado.provaManuscrita && !leadAtualizado.textoDOEspelho && (!leadAtualizado.espelhoCorrecao || leadAtualizado.espelhoCorrecao === '[]')) {
          leadsParaEspelho.push(leadAtualizado);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // --- PAUSA 1: Manuscritos ---
      if (leadsParaManuscrito.length > 0) {
        updateState({
          currentStep: 'Aguardando processamento de manuscritos',
          leadsNeedingManuscrito: leadsParaManuscrito,
          isPaused: true,
          pauseReason: 'manuscrito'
        });
        toast("Ação Necessária", { description: `${leadsParaManuscrito.length} leads precisam de manuscrito.` });
        for (const [index, lead] of leadsParaManuscrito.entries()) {
          await onManuscritoDialogNeeded(lead, index + 1, leadsParaManuscrito.length);
        }
        toast("Fluxo Pausado", { description: "Aguardando processamento externo. Execute novamente quando estiver pronto." });
        updateState({ isProcessing: false });
        return;
      }

      // --- PAUSA 2: Espelhos ---
      if (leadsParaEspelho.length > 0) {
        updateState({
          currentStep: 'Aguardando processamento de espelhos',
          leadsNeedingEspelho: leadsParaEspelho,
          isPaused: true,
          pauseReason: 'espelho'
        });
        toast("Ação Necessária", { description: `${leadsParaEspelho.length} leads precisam de espelho.` });
        for (const [index, lead] of leadsParaEspelho.entries()) {
          await onEspelhoDialogNeeded(lead, index + 1, leadsParaEspelho.length);
        }
        toast("Fluxo Pausado", { description: "Aguardando processamento externo. Execute novamente quando estiver pronto." });
        updateState({ isProcessing: false });
        return;
      }

      // --- ETAPA FINAL: Pré-Análise ---
      let analiseEnviadas = 0;
      for (const lead of leadsSelecionados) {
        const displayName = lead.nomeReal || lead.name || "Lead sem nome";
        if (lead.provaManuscrita && (lead.textoDOEspelho || (lead.espelhoCorrecao && lead.espelhoCorrecao !== '[]')) && !lead.analiseUrl && !lead.aguardandoAnalise) {
          updateState({ currentStep: `Enviando "${displayName}" para pré-análise`, currentLead: lead.id });
          try {
            const response = await fetch('/api/admin/leads-chatwit/enviar-analise', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: lead.id, sourceId: lead.sourceId })
            });
            if (response.ok) {
              analiseEnviadas++;
              onLeadUpdated(lead.id);
              toast("Análise Enviada", { description: `"${displayName}" enviado para pré-análise.` });
            } else {
              const data = await response.json();
              throw new Error(data.error || "Erro ao enviar para análise");
            }
          } catch (error: any) {
            toast.error("Erro na Análise", { description: `Erro ao enviar "${displayName}" para análise: ${error.message}` });
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Finalização
      updateState({ currentStep: 'Processamento concluído', isProcessing: false });
      onLeadUpdated('final');
      toast("Processamento Concluído", { description: `Processamento em lote concluído! ${analiseEnviadas} leads enviados para análise.` });

    } catch (error: any) {
      console.error('Erro no processamento em lote:', error);
      toast.error("Erro no Processamento", { description: `Erro durante o processamento em lote: ${error.message}` });
      updateState({ isProcessing: false });
    }
  }, [updateState, onManuscritoDialogNeeded, onEspelhoDialogNeeded, onLeadUpdated]);

  const cancelarProcessamento = useCallback(() => {
    updateState({
      isProcessing: false,
      isPaused: false,
      currentStep: 'Processamento cancelado'
    });
    toast("Processamento Cancelado", { description: "O processamento em lote foi cancelado pelo usuário." });
  }, [updateState]);

  const continuarProcessamento = useCallback(async (leadsSelecionados: LeadChatwit[]) => {
    await processarLeadsEmLote(leadsSelecionados);
  }, [processarLeadsEmLote]);

  const handleSendManuscrito = async (lead: LeadChatwit, selectedImages: string[]) => {
    try {
      const displayName = lead.nomeReal || lead.name || "Lead sem nome";
      console.log(`[BatchProcessor] Enviando ${selectedImages.length} imagens do manuscrito para ${displayName}`);

      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadID: lead.id,
          nome: lead.name || "Lead sem nome",
          telefone: lead.phoneNumber,
          arquivos: lead.arquivos?.map((a: any) => ({
            id: a.id, url: a.dataUrl, tipo: a.fileType, nome: a.fileType
          })) || [],
          arquivos_pdf: lead.pdfUnificado ? [{
            id: lead.id, url: lead.pdfUnificado, nome: "PDF Unificado"
          }] : [],
          arquivos_imagens_manuscrito: selectedImages.map((url: string, index: number) => ({
            id: `${lead.id}-manuscrito-${index}`, url: url, nome: `Manuscrito ${index + 1}`
          })),
          metadata: {
            leadUrl: lead.leadUrl, sourceId: lead.sourceId, concluido: lead.concluido, fezRecurso: lead.fezRecurso
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar manuscrito");
      }
      console.log(`[BatchProcessor] Manuscrito enviado com sucesso para ${displayName}`);
    } catch (error: any) {
      console.error(`[BatchProcessor] Erro ao enviar manuscrito:`, error);
      throw error;
    }
  };

  const handleSendEspelho = async (lead: LeadChatwit, selectedImages: string[]) => {
    try {
      const displayName = lead.nomeReal || lead.name || "Lead sem nome";
      console.log(`[BatchProcessor] Enviando ${selectedImages.length} imagens do espelho para ${displayName}`);

      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadID: lead.id,
          nome: lead.name || "Lead sem nome",
          telefone: lead.phoneNumber,
          arquivos: lead.arquivos?.map((a: any) => ({
            id: a.id, url: a.dataUrl, tipo: a.fileType, nome: a.fileType
          })) || [],
          arquivos_pdf: lead.pdfUnificado ? [{
            id: lead.id, url: lead.pdfUnificado, nome: "PDF Unificado"
          }] : [],
          arquivos_imagens_espelho: selectedImages.map((url: string, index: number) => ({
            id: `${lead.id}-espelho-${index}`, url: url, nome: `Espelho ${index + 1}`
          })),
          metadata: {
            leadUrl: lead.leadUrl, sourceId: lead.sourceId, concluido: lead.concluido, fezRecurso: lead.fezRecurso
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar espelho");
      }
      console.log(`[BatchProcessor] Espelho enviado com sucesso para ${displayName}`);
    } catch (error: any) {
      console.error(`[BatchProcessor] Erro ao enviar espelho:`, error);
      throw error;
    }
  };

  const verificarProntoParaAnalise = (lead: LeadChatwit) => {
    const temManuscrito = lead.provaManuscrita && 
      (typeof lead.provaManuscrita === 'string' ? lead.provaManuscrita.length > 0 : 
      Array.isArray(lead.provaManuscrita) ? lead.provaManuscrita.length > 0 : 
      typeof lead.provaManuscrita === 'object' && lead.provaManuscrita !== null);

    const temEspelho = lead.textoDOEspelho && 
      (typeof lead.textoDOEspelho === 'string' ? lead.textoDOEspelho.length > 0 : 
      Array.isArray(lead.textoDOEspelho) ? lead.textoDOEspelho.length > 0 : 
      typeof lead.textoDOEspelho === 'object' && lead.textoDOEspelho !== null);

    return temManuscrito && temEspelho;
  };

  const processarLead = async (lead: LeadChatwit) => {
    try {
      console.log(`[BatchProcessor] Iniciando processamento do lead: ${lead.name}`);
      updateState({
        currentStep: 'Processando lead',
        currentLead: lead.id
      });
      
      if (!lead.pdfUnificado && lead.arquivos && lead.arquivos.length > 0) {
        updateState({ currentStep: 'Unificando PDFs' });
        const response = await fetch("/api/admin/leads-chatwit/unify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao unificar PDFs");
        }
        const data = await response.json();
        lead.pdfUnificado = data.pdfUrl;
      }

      if (!lead.imagensConvertidas && lead.pdfUnificado) {
        updateState({ currentStep: 'Gerando imagens' });
        const response = await fetch("/api/admin/leads-chatwit/convert-to-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id })
        });
        if (response.ok) {
          const data = await response.json();
          const imageUrls = data.imageUrls || data.convertedUrls || [];
          lead.imagensConvertidas = JSON.stringify(imageUrls);
          const saveResponse = await fetch('/api/admin/leads-chatwit/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: lead.id, imagensConvertidas: lead.imagensConvertidas })
          });
          if (!saveResponse.ok) console.error(`[BatchProcessor] Erro ao salvar imagensConvertidas no banco para ${lead.name}`);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao gerar imagens");
        }
      }

      const prontoParaAnalise = verificarProntoParaAnalise(lead);
      if (!prontoParaAnalise) {
        updateState({ currentStep: 'Aguardando digitação' });
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(async () => {
            const response = await fetch(`/api/admin/leads-chatwit/leads?id=${lead.id}`);
            if (response.ok) {
              const data = await response.json();
              const leadAtualizado = data.lead;
              if (verificarProntoParaAnalise(leadAtualizado)) {
                clearInterval(checkInterval);
                resolve();
              }
            }
          }, 2000);
        });
      }

      if (verificarProntoParaAnalise(lead)) {
        updateState({ currentStep: 'Enviando para pré-análise' });
        const response = await fetch("/api/admin/leads-chatwit/enviar-analise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id, sourceId: lead.sourceId })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao enviar para pré-análise");
        }
      } else {
        throw new Error("Lead não está pronto para pré-análise - manuscrito ou espelho não digitados");
      }
      return true;
    } catch (error: any) {
      console.error(`[BatchProcessor] Erro ao processar lead ${lead.name}:`, error);
      throw error;
    }
  };

  return {
    state,
    processarLeadsEmLote,
    cancelarProcessamento,
    continuarProcessamento,
    handleSendManuscrito,
    handleSendEspelho,
  };
}