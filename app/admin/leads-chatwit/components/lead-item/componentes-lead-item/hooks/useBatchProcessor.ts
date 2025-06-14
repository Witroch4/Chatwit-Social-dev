import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  
  const [state, setState] = useState<BatchProcessState>({
    isProcessing: false,
    currentStep: '',
    currentLead: null,
    processedCount: 0,
    totalCount: 0,
    leadsNeedingManuscrito: [],
    leadsNeedingEspelho: [],
    isPaused: false,
    pauseReason: null,
  });

  const updateState = useCallback((updates: Partial<BatchProcessState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const processarLeadsEmLote = useCallback(async (leadsSelecionados: LeadChatwit[]) => {
    console.log('Iniciando processamento em lote para:', leadsSelecionados);
    
    // Resetar estado
    updateState({
      isProcessing: true,
      currentStep: 'Iniciando processamento',
      processedCount: 0,
      totalCount: leadsSelecionados.length,
      leadsNeedingManuscrito: [],
      leadsNeedingEspelho: [],
      isPaused: false,
      pauseReason: null,
    });

    toast({
      title: "Processamento Iniciado",
      description: `Iniciando processamento para ${leadsSelecionados.length} leads.`,
    });

    const leadsParaManuscrito: LeadChatwit[] = [];
    const leadsParaEspelho: LeadChatwit[] = [];
    let processedCount = 0;

    try {
      // Fase 1: Processamento automático sequencial
      for (const lead of leadsSelecionados) {
        processedCount++;
        
        // 1. CONDIÇÃO DE IGNORE: Pular lead se a consultoria estiver ativa
        if (lead.consultoriaFase2) {
          updateState({
            currentStep: `Ignorando lead "${lead.nomeReal || lead.name}" (consultoria ativa)`,
            currentLead: lead.id,
            processedCount,
          });
          
          toast({
            title: "Lead Ignorado",
            description: `Lead "${lead.nomeReal || lead.name}" ignorado: Consultoria já iniciada.`,
          });
          
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa visual
          continue;
        }

        let leadAtualizado = { ...lead };
        const displayName = leadAtualizado.nomeReal || leadAtualizado.name || "Lead sem nome";

        console.log(`[BatchProcessor] === PROCESSANDO LEAD ${processedCount}/${leadsSelecionados.length} ===`);
        console.log(`[BatchProcessor] Lead ID: ${leadAtualizado.id}`);
        console.log(`[BatchProcessor] Nome: ${displayName}`);
        console.log(`[BatchProcessor] PDF Unificado: ${leadAtualizado.pdfUnificado}`);
        console.log(`[BatchProcessor] Imagens Convertidas: ${leadAtualizado.imagensConvertidas}`);
        console.log(`[BatchProcessor] Prova Manuscrita: ${leadAtualizado.provaManuscrita}`);
        console.log(`[BatchProcessor] Manuscrito Processado: ${leadAtualizado.manuscritoProcessado}`);
        console.log(`[BatchProcessor] Texto do Espelho: ${leadAtualizado.textoDOEspelho}`);
        console.log(`[BatchProcessor] Espelho Correção: ${leadAtualizado.espelhoCorrecao}`);

        updateState({
          currentStep: `Processando "${displayName}"`,
          currentLead: leadAtualizado.id,
          processedCount,
        });

        // --- ETAPA 1: Unificar PDF ---
        if (!leadAtualizado.pdfUnificado && leadAtualizado.arquivos && leadAtualizado.arquivos.length > 0) {
          console.log(`[BatchProcessor] ETAPA 1: Unificando PDFs para ${displayName}`);
          updateState({
            currentStep: `Unificando PDFs para "${displayName}"`,
          });
          
          try {
            const response = await fetch('/api/admin/leads-chatwit/unify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: leadAtualizado.id }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              leadAtualizado.pdfUnificado = data.pdfUrl || 'sim_presente';
              console.log(`[BatchProcessor] ETAPA 1 CONCLUÍDA: PDF unificado gerado para ${displayName} - URL: ${leadAtualizado.pdfUnificado}`);
              
              // Salvar atualização no banco
              await fetch('/api/admin/leads-chatwit/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  id: leadAtualizado.id,
                  pdfUnificado: leadAtualizado.pdfUnificado,
                }),
              });
              
              toast({
                title: "PDF Unificado",
                description: `PDF de "${displayName}" unificado com sucesso.`,
              });
            } else {
              throw new Error(data.error || "Erro ao unificar PDFs");
            }
          } catch (error: any) {
            console.error(`[BatchProcessor] ERRO ETAPA 1: Erro ao unificar PDFs para ${displayName}:`, error);
            toast({
              title: "Erro na Unificação",
              description: `Erro ao unificar PDFs de "${displayName}": ${error.message}`,
              variant: "destructive",
            });
            continue; // Pula para o próximo lead
          }
        } else {
          console.log(`[BatchProcessor] ETAPA 1 IGNORADA: ${displayName} já tem PDF unificado`);
        }

        // --- ETAPA 2: Gerar Imagens ---
        const imagensExistem = leadAtualizado.imagensConvertidas && 
                              JSON.parse(leadAtualizado.imagensConvertidas || '[]').length > 0;
        
        console.log(`[BatchProcessor] ETAPA 2: Verificando imagens para ${displayName}...`);
        console.log(`[BatchProcessor] imagensConvertidas string: "${leadAtualizado.imagensConvertidas}"`);
        console.log(`[BatchProcessor] imagensExistem: ${imagensExistem}`);
        
        if (leadAtualizado.pdfUnificado && !imagensExistem) {
          console.log(`[BatchProcessor] ETAPA 2: Gerando imagens para ${displayName}...`);
          
          updateState({
            currentStep: `Gerando imagens para "${displayName}"`,
          });
          
          try {
            const response = await fetch('/api/admin/leads-chatwit/convert-to-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: leadAtualizado.id }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              const imageUrls = data.imageUrls || data.convertedUrls || [];
              leadAtualizado.imagensConvertidas = JSON.stringify(imageUrls);
              console.log(`[BatchProcessor] ETAPA 2 CONCLUÍDA: ${imageUrls.length} imagens geradas para ${displayName}`);
              console.log(`[BatchProcessor] URLs das imagens: ${JSON.stringify(imageUrls)}`);
              console.log(`[BatchProcessor] imagensConvertidas atualizado: "${leadAtualizado.imagensConvertidas}"`);
              
              // Salvar atualização no banco - aguardar para garantir que foi salvo
              const saveResponse = await fetch('/api/admin/leads-chatwit/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  id: leadAtualizado.id,
                  imagensConvertidas: leadAtualizado.imagensConvertidas,
                }),
              });
              
              if (!saveResponse.ok) {
                console.error(`[BatchProcessor] Erro ao salvar imagensConvertidas no banco para ${displayName}`);
                const errorData = await saveResponse.json();
                console.error(`[BatchProcessor] Erro detalhado:`, errorData);
              } else {
                console.log(`[BatchProcessor] imagensConvertidas salvo no banco com sucesso para ${displayName}`);
              }
              
              toast({
                title: "Imagens Geradas",
                description: `${imageUrls.length} imagens de "${displayName}" geradas com sucesso.`,
              });
            } else {
              throw new Error(data.error || "Erro ao gerar imagens");
            }
          } catch (error: any) {
            console.error(`[BatchProcessor] ERRO ETAPA 2: Erro ao gerar imagens para ${displayName}:`, error);
            toast({
              title: "Erro na Conversão",
              description: `Erro ao gerar imagens de "${displayName}": ${error.message}`,
              variant: "destructive",
            });
            continue; // Pula para o próximo lead
          }
        } else {
          console.log(`[BatchProcessor] ETAPA 2 IGNORADA: ${displayName} - PDF: ${!!leadAtualizado.pdfUnificado}, Imagens: ${imagensExistem}`);
        }
        
        // --- ETAPA 3: Verificar se precisa de Manuscrito ---
        // Recarregar dados mais recentes do lead para garantir consistência
        try {
          const refreshResponse = await fetch(`/api/admin/leads-chatwit/leads?id=${leadAtualizado.id}`);
          if (refreshResponse.ok) {
            const refreshedLead = await refreshResponse.json();
            leadAtualizado = { ...leadAtualizado, ...refreshedLead };
            console.log(`[BatchProcessor] Lead ${displayName} recarregado com sucesso`);
          }
        } catch (error) {
          console.log(`[BatchProcessor] Aviso: Não foi possível recarregar dados do lead ${displayName}`);
        }
        
        const temImagens = leadAtualizado.imagensConvertidas && 
                          JSON.parse(leadAtualizado.imagensConvertidas || '[]').length > 0;
        
        console.log(`[BatchProcessor] ETAPA 3: Verificando manuscrito para ${displayName}...`);
        console.log(`[BatchProcessor] temImagens: ${temImagens}`);
        console.log(`[BatchProcessor] provaManuscrita: ${!!leadAtualizado.provaManuscrita}`);
        console.log(`[BatchProcessor] manuscritoProcessado: ${!!leadAtualizado.manuscritoProcessado}`);
        
        if (temImagens && !leadAtualizado.provaManuscrita && !leadAtualizado.manuscritoProcessado) {
          console.log(`[BatchProcessor] ADICIONANDO ${displayName} para lista de manuscritos`);
          leadsParaManuscrito.push(leadAtualizado);
        } else {
          console.log(`[BatchProcessor] IGNORANDO manuscrito para ${displayName} - Imagens: ${temImagens}, Manuscrita: ${!!leadAtualizado.provaManuscrita}, Processado: ${!!leadAtualizado.manuscritoProcessado}`);
        }
        
        // --- ETAPA 4: Verificar se precisa de Espelho ---
        console.log(`[BatchProcessor] ETAPA 4: Verificando espelho para ${displayName}...`);
        console.log(`[BatchProcessor] provaManuscrita: ${!!leadAtualizado.provaManuscrita}`);
        console.log(`[BatchProcessor] textoDOEspelho: ${!!leadAtualizado.textoDOEspelho}`);
        console.log(`[BatchProcessor] espelhoCorrecao: "${leadAtualizado.espelhoCorrecao}"`);
        
        if (leadAtualizado.provaManuscrita && 
            !leadAtualizado.textoDOEspelho && 
            (!leadAtualizado.espelhoCorrecao || leadAtualizado.espelhoCorrecao === '[]')) {
          console.log(`[BatchProcessor] ADICIONANDO ${displayName} para lista de espelhos`);
          leadsParaEspelho.push(leadAtualizado);
        } else {
          console.log(`[BatchProcessor] IGNORANDO espelho para ${displayName}`);
        }

        console.log(`[BatchProcessor] === FIM DO PROCESSAMENTO DO LEAD ${displayName} ===\n`);
        
        // Pequena pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[BatchProcessor] === RESUMO FASE AUTOMÁTICA ===`);
      console.log(`[BatchProcessor] Leads para manuscrito: ${leadsParaManuscrito.length}`);
      console.log(`[BatchProcessor] Leads para espelho: ${leadsParaEspelho.length}`);
      console.log(`[BatchProcessor] Manuscritos: ${leadsParaManuscrito.map(l => l.nomeReal || l.name).join(', ')}`);
      console.log(`[BatchProcessor] Espelhos: ${leadsParaEspelho.map(l => l.nomeReal || l.name).join(', ')}`);

      // --- PAUSA 1: Processar Dialogs de Manuscrito ---
      if (leadsParaManuscrito.length > 0) {
        console.log(`[BatchProcessor] INICIANDO PAUSA 1: Processamento de manuscritos`);
        updateState({
          currentStep: 'Aguardando processamento de manuscritos',
          leadsNeedingManuscrito: leadsParaManuscrito,
          isPaused: true,
          pauseReason: 'manuscrito',
        });
        
        toast({
          title: "Ação Necessária",
          description: `${leadsParaManuscrito.length} leads precisam de manuscrito. Processando dialogs...`,
          duration: 5000,
        });
        
        for (const [index, lead] of leadsParaManuscrito.entries()) {
          const success = await onManuscritoDialogNeeded(lead, index + 1, leadsParaManuscrito.length);
          if (!success) {
            console.log(`Usuário cancelou o manuscrito para ${lead.nomeReal || lead.name}`);
          }
        }
        
        toast({
          title: "Fluxo Pausado",
          description: "Fluxo pausado. Aguardando processamento externo dos manuscritos. Execute novamente quando estiver pronto.",
          duration: 8000,
        });
        
        updateState({ isProcessing: false });
        return; // O fluxo PARA AQUI intencionalmente
      }

      // --- PAUSA 2: Processar Dialogs de Espelho ---
      if (leadsParaEspelho.length > 0) {
        updateState({
          currentStep: 'Aguardando processamento de espelhos',
          leadsNeedingEspelho: leadsParaEspelho,
          isPaused: true,
          pauseReason: 'espelho',
        });
        
        toast({
          title: "Ação Necessária",
          description: `${leadsParaEspelho.length} leads precisam de espelho. Processando dialogs...`,
          duration: 5000,
        });
        
        for (const [index, lead] of leadsParaEspelho.entries()) {
          const success = await onEspelhoDialogNeeded(lead, index + 1, leadsParaEspelho.length);
          if (!success) {
            console.log(`Usuário cancelou o espelho para ${lead.nomeReal || lead.name}`);
          }
        }
        
        toast({
          title: "Fluxo Pausado",
          description: "Fluxo pausado. Aguardando processamento externo dos espelhos. Execute novamente quando estiver pronto.",
          duration: 8000,
        });
        
        updateState({ isProcessing: false });
        return; // O fluxo PARA AQUI intencionalmente
      }

      // --- ETAPA FINAL: Pré-Análise ---
      let analiseEnviadas = 0;
      for (const lead of leadsSelecionados) {
        const displayName = lead.nomeReal || lead.name || "Lead sem nome";
        
        // Se tem manuscrito e espelho, mas não tem análise
        if (lead.provaManuscrita && 
            (lead.textoDOEspelho || (lead.espelhoCorrecao && lead.espelhoCorrecao !== '[]')) &&
            !lead.analiseUrl && !lead.aguardandoAnalise) {
          
          updateState({
            currentStep: `Enviando "${displayName}" para pré-análise`,
            currentLead: lead.id,
          });
          
          try {
            const response = await fetch('/api/admin/leads-chatwit/enviar-analise', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                leadId: lead.id,
                sourceId: lead.sourceId 
              }),
            });
            
            if (response.ok) {
              analiseEnviadas++;
              onLeadUpdated(lead.id);
              
              toast({
                title: "Análise Enviada",
                description: `"${displayName}" enviado para pré-análise.`,
              });
            } else {
              const data = await response.json();
              throw new Error(data.error || "Erro ao enviar para análise");
            }
          } catch (error: any) {
            console.error(`Erro ao enviar análise para ${displayName}:`, error);
            toast({
              title: "Erro na Análise",
              description: `Erro ao enviar "${displayName}" para análise: ${error.message}`,
              variant: "destructive",
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Finalização
      updateState({
        currentStep: 'Processamento concluído',
        isProcessing: false,
      });
      
      // Atualizar a lista de leads apenas no final
      onLeadUpdated('final');
      
      toast({
        title: "Processamento Concluído",
        description: `Processamento em lote concluído! ${analiseEnviadas} leads enviados para análise.`,
        duration: 6000,
      });

    } catch (error: any) {
      console.error('Erro no processamento em lote:', error);
      
      toast({
        title: "Erro no Processamento",
        description: `Erro durante o processamento em lote: ${error.message}`,
        variant: "destructive",
      });
      
      updateState({ isProcessing: false });
    }
  }, [toast, updateState, onManuscritoDialogNeeded, onEspelhoDialogNeeded, onLeadUpdated]);

  const cancelarProcessamento = useCallback(() => {
    updateState({
      isProcessing: false,
      isPaused: false,
      currentStep: 'Processamento cancelado',
    });
    
    toast({
      title: "Processamento Cancelado",
      description: "O processamento em lote foi cancelado pelo usuário.",
    });
  }, [updateState, toast]);

  const continuarProcessamento = useCallback(async (leadsSelecionados: LeadChatwit[]) => {
    // Reinicia o processamento, mas pula as etapas já concluídas
    await processarLeadsEmLote(leadsSelecionados);
  }, [processarLeadsEmLote]);

  // Função para enviar manuscrito
  const handleSendManuscrito = async (lead: LeadChatwit, selectedImages: string[]) => {
    try {
      const displayName = lead.nomeReal || lead.name || "Lead sem nome";
      console.log(`[BatchProcessor] Enviando ${selectedImages.length} imagens do manuscrito para ${displayName}`);

      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadID: lead.id,
          nome: lead.name || "Lead sem nome",
          telefone: lead.phoneNumber,
          arquivos: lead.arquivos?.map((a: any) => ({
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
          arquivos_imagens_manuscrito: selectedImages.map((url: string, index: number) => ({
            id: `${lead.id}-manuscrito-${index}`,
            url: url,
            nome: `Manuscrito ${index + 1}`
          })),
          metadata: {
            leadUrl: lead.leadUrl,
            sourceId: lead.sourceId,
            concluido: lead.concluido,
            fezRecurso: lead.fezRecurso
          }
        }),
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

  // Função para enviar espelho
  const handleSendEspelho = async (lead: LeadChatwit, selectedImages: string[]) => {
    try {
      const displayName = lead.nomeReal || lead.name || "Lead sem nome";
      console.log(`[BatchProcessor] Enviando ${selectedImages.length} imagens do espelho para ${displayName}`);

      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadID: lead.id,
          nome: lead.name || "Lead sem nome",
          telefone: lead.phoneNumber,
          arquivos: lead.arquivos?.map((a: any) => ({
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
        }),
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

  // Função para verificar se o lead está pronto para pré-análise
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

  // Função para processar um lead
  const processarLead = async (lead: LeadChatwit) => {
    try {
      console.log(`[BatchProcessor] Iniciando processamento do lead: ${lead.name}`);
      updateState({
        currentStep: 'Processando lead',
        currentLead: lead.id,
      });
      
      // ETAPA 1: Unificar PDFs (se necessário)
      if (!lead.pdfUnificado && lead.arquivos && lead.arquivos.length > 0) {
        console.log(`[BatchProcessor] ETAPA 1: Unificando PDFs para ${lead.name}`);
        updateState({
          currentStep: 'Unificando PDFs',
        });
        
        const response = await fetch("/api/admin/leads-chatwit/unify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao unificar PDFs");
        }

        const data = await response.json();
        lead.pdfUnificado = data.pdfUrl;
        console.log(`[BatchProcessor] ETAPA 1 CONCLUÍDA: PDF unificado gerado para ${lead.name}`);
      }

      // ETAPA 2: Gerar imagens (se necessário)
      if (!lead.imagensConvertidas && lead.pdfUnificado) {
        console.log(`[BatchProcessor] ETAPA 2: Gerando imagens para ${lead.name}`);
        updateState({
          currentStep: 'Gerando imagens',
        });
        
        const response = await fetch("/api/admin/leads-chatwit/convert-to-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id }),
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrls = data.imageUrls || data.convertedUrls || [];
          lead.imagensConvertidas = JSON.stringify(imageUrls);
          console.log(`[BatchProcessor] ETAPA 2 CONCLUÍDA: ${imageUrls.length} imagens geradas para ${lead.name}`);
          
          // Salvar atualização no banco
          const saveResponse = await fetch('/api/admin/leads-chatwit/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: lead.id,
              imagensConvertidas: lead.imagensConvertidas
            })
          });
          
          if (!saveResponse.ok) {
            console.error(`[BatchProcessor] Erro ao salvar imagensConvertidas no banco para ${lead.name}`);
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao gerar imagens");
        }
      }

      // ETAPA 3: Verificar se manuscrito e espelho já foram digitados
      const prontoParaAnalise = verificarProntoParaAnalise(lead);

      if (!prontoParaAnalise) {
        console.log(`[BatchProcessor] ETAPA 3: Aguardando digitação do manuscrito/espelho para ${lead.name}`);
        updateState({
          currentStep: 'Aguardando digitação',
        });
        
        // Abrir diálogo para seleção de imagens
        // Implemente a lógica para abrir o diálogo de seleção de imagens
        
        // Aguardar até que o usuário selecione e envie as imagens
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(async () => {
            // Buscar lead atualizado
            const response = await fetch(`/api/admin/leads-chatwit/leads?id=${lead.id}`);
            if (response.ok) {
              const data = await response.json();
              const leadAtualizado = data.lead;
              
              if (verificarProntoParaAnalise(leadAtualizado)) {
                clearInterval(checkInterval);
                resolve();
              }
            }
          }, 2000); // Verificar a cada 2 segundos
        });
      }

      // ETAPA 4: Enviar para pré-análise (apenas se tiver manuscrito e espelho)
      if (verificarProntoParaAnalise(lead)) {
        console.log(`[BatchProcessor] ETAPA 4: Enviando para pré-análise ${lead.name}`);
        updateState({
          currentStep: 'Enviando para pré-análise',
        });
        
        const response = await fetch("/api/admin/leads-chatwit/enviar-analise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            sourceId: lead.sourceId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao enviar para pré-análise");
        }

        console.log(`[BatchProcessor] ETAPA 4 CONCLUÍDA: Lead enviado para pré-análise ${lead.name}`);
      } else {
        console.log(`[BatchProcessor] Lead ${lead.name} não está pronto para pré-análise`);
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