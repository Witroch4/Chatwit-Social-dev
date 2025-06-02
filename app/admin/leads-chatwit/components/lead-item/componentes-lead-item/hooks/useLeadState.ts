import { useState, useEffect } from "react";
import { LeadChatwit } from "../../../../types";
import { hasEspelhoData } from "../utils";

export function useLeadState(lead: LeadChatwit) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [manuscritoProcessadoLocal, setManuscritoProcessadoLocal] = useState(!!lead.manuscritoProcessado);
  const [hasEspelho, setHasEspelho] = useState(hasEspelhoData(lead));
  const [consultoriaAtiva, setConsultoriaAtiva] = useState(!!lead.consultoriaFase2);
  
  // Estado para a análise
  const [localAnaliseState, setLocalAnaliseState] = useState({
    analiseUrl: lead.analiseUrl,
    aguardandoAnalise: !!lead.aguardandoAnalise,
    analisePreliminar: lead.analisePreliminar,
    analiseValidada: !!lead.analiseValidada
  });

  // Efeitos para sincronizar com mudanças no lead
  useEffect(() => {
    const novoHasEspelho = hasEspelhoData(lead);
    setHasEspelho(novoHasEspelho);
    setRefreshKey(prev => prev + 1);
  }, [lead.espelhoCorrecao, lead.textoDOEspelho]);

  useEffect(() => {
    setManuscritoProcessadoLocal(!!lead.manuscritoProcessado);
    setRefreshKey(prev => prev + 1);
  }, [lead.manuscritoProcessado]);

  useEffect(() => {
    setLocalAnaliseState({
      analiseUrl: lead.analiseUrl,
      aguardandoAnalise: !!lead.aguardandoAnalise,
      analisePreliminar: lead.analisePreliminar,
      analiseValidada: !!lead.analiseValidada
    });
  }, [lead.analiseUrl, lead.aguardandoAnalise, lead.analisePreliminar, lead.analiseValidada, refreshKey]);

  useEffect(() => {
    setConsultoriaAtiva(!!lead.consultoriaFase2);
  }, [lead.consultoriaFase2]);

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const updateEspelhoState = (value: boolean) => {
    setHasEspelho(value);
    forceRefresh();
  };

  const updateManuscritoState = (value: boolean) => {
    setManuscritoProcessadoLocal(value);
    forceRefresh();
  };

  const updateAnaliseState = (updates: Partial<typeof localAnaliseState>) => {
    setLocalAnaliseState(prev => ({ ...prev, ...updates }));
    forceRefresh();
  };

  const updateConsultoriaState = (value: boolean) => {
    setConsultoriaAtiva(value);
    forceRefresh();
  };

  return {
    refreshKey,
    manuscritoProcessadoLocal,
    hasEspelho,
    consultoriaAtiva,
    localAnaliseState,
    forceRefresh,
    updateEspelhoState,
    updateManuscritoState,
    updateAnaliseState,
    updateConsultoriaState
  };
} 