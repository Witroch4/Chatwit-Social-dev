'use client';

import { useEffect, useRef, useCallback } from 'react';
import { LeadChatwit } from '../types';
import { toast } from "sonner";

interface SSEConnectionManagerProps {
  leads: LeadChatwit[];
  onLeadUpdate: (lead: LeadChatwit) => void;
}

export function SSEConnectionManager({ leads, onLeadUpdate }: SSEConnectionManagerProps) {
  const connectionsRef = useRef<Map<string, EventSource>>(new Map());
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isMountedRef = useRef(true);

  // Função para criar conexão SSE individual
  const createSSEConnection = useCallback((leadId: string) => {
    console.log(`[SSE Manager] 🔌 Criando conexão SSE para lead: ${leadId}`);
    
    // Fechar conexão existente se houver
    const existingConnection = connectionsRef.current.get(leadId);
    if (existingConnection) {
      console.log(`[SSE Manager] 🔄 Fechando conexão existente para: ${leadId}`);
      existingConnection.close();
      connectionsRef.current.delete(leadId);
    }

    // Construir URL da conexão SSE
    const sseUrl = `/api/admin/leads-chatwit/notifications?leadId=${leadId}`;
    console.log(`[SSE Manager] 🌐 URL da conexão SSE: ${sseUrl}`);

    const eventSource = new EventSource(sseUrl);
    
    eventSource.onopen = () => {
      console.log(`[SSE Manager] ✅ Conexão aberta para lead: ${leadId}`);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`[SSE Manager] 📨 Notificação recebida para lead ${leadId}:`, data);
        
        if (data.type === 'error') {
          console.error(`[SSE Manager] ❌ Erro recebido via SSE:`, data.message);
          return;
        }
        
        if (data.type === 'connected') {
          console.log(`[SSE Manager] 🎉 Confirmação de conexão recebida para: ${leadId}`);
          return;
        }
        
        // Tratar estrutura correta da notificação
        const notificationData = data.data || data; // Compatibilidade com ambas estruturas
        
        if (notificationData.type === 'leadUpdate' && notificationData.leadData) {
          console.log(`[SSE Manager] 🔄 Atualizando lead ${leadId} com dados:`, notificationData.leadData);
          onLeadUpdate(notificationData.leadData);
          
          // 🎉 Feedback visual melhorado com toast de sucesso
          const leadName = notificationData.leadData.name || notificationData.leadData.nome || 'Lead';
          
          // 🔍 Debug detalhado para identificar o tipo de processamento
          console.log(`[SSE Manager] 🔍 Debug toast - Lead: ${leadName}`, {
            manuscritoProcessado: notificationData.leadData.manuscritoProcessado,
            aguardandoManuscrito: notificationData.leadData.aguardandoManuscrito,
            espelhoProcessado: notificationData.leadData.espelhoProcessado,
            aguardandoEspelho: notificationData.leadData.aguardandoEspelho,
            analiseProcessada: notificationData.leadData.analiseProcessada,
            aguardandoAnalise: notificationData.leadData.aguardandoAnalise,
            message: notificationData.message
          });
          
          // 🎯 Determinar o tipo de processamento baseado na mensagem do worker
          const isManuscritoUpdate = notificationData.message?.includes('manuscrito');
          const isEspelhoUpdate = notificationData.message?.includes('espelho');
          const isAnaliseUpdate = notificationData.message?.includes('análise') || notificationData.message?.includes('pré-análise');
          
          console.log(`[SSE Manager] 🔍 Tipo de update detectado:`, {
            isManuscritoUpdate,
            isEspelhoUpdate, 
            isAnaliseUpdate,
            originalMessage: notificationData.message
          });
          
          // Verificar análise primeiro (baseado na mensagem)
          if (isAnaliseUpdate && notificationData.leadData.analiseProcessada && !notificationData.leadData.aguardandoAnalise) {
            // Verificar se é análise preliminar ou final
            const isAnalisePreliminar = notificationData.leadData.analisePreliminar && !notificationData.leadData.analiseUrl;
            const title = isAnalisePreliminar 
              ? `📋 Pré-análise de "${leadName}" processada!`
              : `📊 Análise de "${leadName}" processada!`;
            const description = isAnalisePreliminar
              ? "A pré-análise foi concluída e está disponível para consulta."
              : "A análise foi concluída e os resultados estão disponíveis.";
            
            toast(title, {
              description,
              duration: 8000,
            });
          } else if (isEspelhoUpdate && notificationData.leadData.espelhoProcessado && !notificationData.leadData.aguardandoEspelho) {
            toast(`📋 Espelho de "${leadName}" processado!`, {
              description: "A correção foi finalizada e está disponível para consulta.",
              duration: 8000,
            });
          } else if (isManuscritoUpdate && notificationData.leadData.manuscritoProcessado && !notificationData.leadData.aguardandoManuscrito) {
            toast(`🎉 Manuscrito de "${leadName}" processado!`, {
              description: "O texto foi extraído e está disponível para visualização.",
              duration: 20000,
              action: {
                label: 'Destacar Lead',
                onClick: () => {
                  console.log('🔥 Botão "Destacar Lead" clicado!');
                  console.log('📍 Lead ID:', leadId);
                  
                  // Disparar evento para destacar o lead na lista
                  const highlightEvent = new CustomEvent('highlightLead', {
                    detail: { leadId: leadId }
                  });
                  
                  console.log('📡 Disparando evento highlightLead:', highlightEvent.detail);
                  window.dispatchEvent(highlightEvent);
                }
              },
            });
          }
        }
      } catch (error) {
        console.error(`[SSE Manager] ❌ Erro ao processar notificação para ${leadId}:`, error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error(`[SSE Manager] ❌ Erro na conexão SSE para ${leadId}:`, error);
      console.log(`[SSE Manager] 🔍 Estado da conexão:`, {
        readyState: eventSource.readyState,
        url: eventSource.url,
        withCredentials: eventSource.withCredentials
      });
      
      // Tentar reconectar após 5 segundos se ainda montado
      if (isMountedRef.current) {
        const timeout = setTimeout(() => {
          if (isMountedRef.current && connectionsRef.current.has(leadId)) {
            console.log(`[SSE Manager] 🔄 Tentando reconectar para: ${leadId}`);
            createSSEConnection(leadId);
          }
        }, 5000);
        
        reconnectTimeoutsRef.current.set(leadId, timeout);
      }
    };
    
    connectionsRef.current.set(leadId, eventSource);
  }, [onLeadUpdate]);

  // Função para forçar reconexão de um lead específico  
  const forceReconnectLead = useCallback((leadId: string, reason?: string) => {
    console.log(`[SSE Manager] 🔥 Forçando reconexão para lead: ${leadId} (motivo: ${reason})`);
    createSSEConnection(leadId);
  }, [createSSEConnection]);

  // Limpar todas as conexões
  const cleanupAllConnections = useCallback(() => {
    console.log(`[SSE Manager] 🧹 Limpando todas as conexões...`);
    
    // Fechar todas as conexões
    connectionsRef.current.forEach((connection, leadId) => {
      console.log(`[SSE Manager] 🔌 Fechando conexão para: ${leadId}`);
      connection.close();
    });
    connectionsRef.current.clear();
    
    // Limpar timeouts de reconexão
    reconnectTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    reconnectTimeoutsRef.current.clear();
  }, []);

  // Atualizar conexões baseado nos leads
  const updateConnections = useCallback(() => {
    if (!isMountedRef.current) return;
    
    console.log(`[SSE Manager] 🔍 Verificando ${leads.length} leads total`);
    
    const leadsNeedingSSE = leads.filter(lead => 
      lead.aguardandoManuscrito || lead.aguardandoEspelho || lead.aguardandoAnalise
    );
    
    console.log(`[SSE Manager] 📊 Total de ${leadsNeedingSSE.length} leads precisando SSE:`, 
      leadsNeedingSSE.map(l => ({ 
        id: l.id, 
        nome: l.nome || l.name,
        aguardandoManuscrito: l.aguardandoManuscrito, 
        aguardandoEspelho: l.aguardandoEspelho, 
        aguardandoAnalise: l.aguardandoAnalise 
      })));
    
    // Leads atualmente conectados
    const currentConnections = new Set(connectionsRef.current.keys());
    console.log(`[SSE Manager] 📋 Conexões atuais:`, Array.from(currentConnections));
    
    // Leads que precisam de conexão
    const leadsNeeding = new Set(leadsNeedingSSE.map(lead => lead.id));
    console.log(`[SSE Manager] 📋 Todos os leads (debug):`, 
      leads.map(l => ({ 
        id: l.id, 
        nome: l.nome || l.name,
        aguardandoManuscrito: l.aguardandoManuscrito, 
        aguardandoEspelho: l.aguardandoEspelho, 
        aguardandoAnalise: l.aguardandoAnalise,
        manuscritoProcessado: l.manuscritoProcessado,
        espelhoProcessado: l.espelhoProcessado,
        analiseProcessada: l.analiseProcessada
      })));
    
    // Remover conexões desnecessárias
    for (const leadId of currentConnections) {
      if (!leadsNeeding.has(leadId)) {
        console.log(`[SSE Manager] ❌ Removendo conexão desnecessária para: ${leadId}`);
        const connection = connectionsRef.current.get(leadId);
        if (connection) {
          connection.close();
          connectionsRef.current.delete(leadId);
        }
      }
    }
    
    // Criar novas conexões necessárias
    for (const leadId of leadsNeeding) {
      if (!currentConnections.has(leadId)) {
        console.log(`[SSE Manager] 🆕 Criando nova conexão para: ${leadId}`);
        createSSEConnection(leadId);
      } else {
        console.log(`[SSE Manager] ✅ Conexão já existe para: ${leadId}`);
      }
    }
  }, [leads, createSSEConnection]);

  // Listener para evento de reconexão forçada
  useEffect(() => {
    const handleForceReconnect = (event: CustomEvent) => {
      const { leadId, reason } = event.detail;
      if (leadId) {
        console.log(`[SSE Manager] 🎯 Recebido evento de reconexão forçada para: ${leadId} (${reason})`);
        forceReconnectLead(leadId, reason);
      }
    };

    window.addEventListener('force-sse-reconnect', handleForceReconnect as EventListener);
    
    return () => {
      window.removeEventListener('force-sse-reconnect', handleForceReconnect as EventListener);
    };
  }, [forceReconnectLead]);

  // Effect principal - atualizar conexões quando leads mudam
  useEffect(() => {
    updateConnections();
  }, [updateConnections]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanupAllConnections();
    };
  }, [cleanupAllConnections]);

  // Renderizar apenas se houver leads aguardando processamento
  const leadsAguardando = leads.filter(lead => 
    lead.aguardandoManuscrito || lead.aguardandoEspelho || lead.aguardandoAnalise
  );

  if (leadsAguardando.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-muted-foreground">
            {leadsAguardando.length} lead{leadsAguardando.length !== 1 ? 's' : ''} aguardando processamento
          </span>
        </div>
      </div>
    </div>
  );
} 