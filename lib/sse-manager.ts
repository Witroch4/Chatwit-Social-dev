interface SseConnection {
  controller: ReadableStreamDefaultController<string>;
  leadId: string;
  connectionId: string;
  userId?: string;
}

class SseManager {
  private static instance: SseManager;
  private connections: Map<string, SseConnection> = new Map();
  private retryQueue: Map<string, { data: Record<string, any>, attempts: number, lastAttempt: number }> = new Map();

  private constructor() {
    // Iniciar verificador de retry a cada 5 segundos
    setInterval(() => {
      this.processRetryQueue();
    }, 5000);
  }

  public static getInstance(): SseManager {
    if (!SseManager.instance) {
      SseManager.instance = new SseManager();
    }
    return SseManager.instance;
  }

  private processRetryQueue() {
    const now = Date.now();
    const toRetry: string[] = [];
    
    this.retryQueue.forEach((item, leadId) => {
      // Tentar novamente após intervalos crescentes: 3s, 10s, 25s
      const intervals = [3000, 10000, 25000];
      const interval = intervals[Math.min(item.attempts, intervals.length - 1)];
      
      if (now - item.lastAttempt >= interval) {
        toRetry.push(leadId);
      }
    });
    
    toRetry.forEach(leadId => {
      const item = this.retryQueue.get(leadId);
      if (item) {
        console.log(`[SSE Retry] 🔄 Tentativa ${item.attempts + 1} para leadId: ${leadId}`);
        const sent = this.sendNotificationDirect(leadId, item.data);
        
        if (sent > 0) {
          console.log(`[SSE Retry] ✅ Sucesso no retry para leadId: ${leadId} após ${item.attempts + 1} tentativa(s)`);
          this.retryQueue.delete(leadId);
        } else {
          // Incrementar tentativas
          item.attempts++;
          item.lastAttempt = now;
          
          // Desistir após 3 tentativas
          if (item.attempts >= 3) {
            console.log(`[SSE Retry] ❌ Desistindo após 3 tentativas para leadId: ${leadId}`);
            this.retryQueue.delete(leadId);
          } else {
            this.retryQueue.set(leadId, item);
          }
        }
      }
    });
  }

  public addConnection(leadId: string, controller: ReadableStreamDefaultController<string>, userId?: string) {
    // Limpar conexões antigas do mesmo lead antes de adicionar nova
    this.removeConnectionsForLead(leadId);
    
    const connectionId = `${leadId}_${Date.now()}`;
    this.connections.set(connectionId, { controller, leadId, connectionId, userId });
    console.log(`[SSE] Conexão adicionada para leadId: ${leadId}. Total de conexões: ${this.connections.size}`);

    // Verificar se há notificações pendentes no retry queue
    if (this.retryQueue.has(leadId)) {
      const item = this.retryQueue.get(leadId)!;
      console.log(`[SSE] 🎯 Conexão estabelecida para leadId com notificação pendente: ${leadId}`);
      
      // Enviar notificação pendente imediatamente
      setTimeout(() => {
        const sent = this.sendNotificationDirect(leadId, item.data);
        if (sent > 0) {
          console.log(`[SSE] ✅ Notificação pendente entregue para leadId: ${leadId}`);
          this.retryQueue.delete(leadId);
        }
      }, 1000); // Aguardar 1 segundo para conexão se estabilizar
    }

    // Ping para manter a conexão viva (intervalos maiores)
    const intervalId = setInterval(() => {
      this.sendPing(connectionId);
    }, 45000); // A cada 45 segundos

    // Lidar com o fechamento da conexão pelo cliente
    const cleanup = () => {
      clearInterval(intervalId);
      clearInterval(checkClosed);
      this.removeConnection(connectionId);
    };

    // Tentar detectar quando a conexão é fechada
    if (controller.signal) {
      controller.signal.addEventListener('abort', cleanup);
    }

    // Verificar se o controller está fechado periodicamente (menos frequente)
    const checkClosed = setInterval(() => {
      try {
        // Tentar enfileirar um comentário vazio para testar a conexão
        controller.enqueue(': keep-alive\n\n');
      } catch (error) {
        console.log(`[SSE] Conexão ${connectionId} fechada, removendo...`);
        cleanup();
      }
    }, 120000); // Verificar a cada 2 minutos
  }

  private removeConnectionsForLead(leadId: string) {
    const toRemove: string[] = [];
    this.connections.forEach((connection, connectionId) => {
      if (connection.leadId === leadId) {
        toRemove.push(connectionId);
      }
    });
    
    toRemove.forEach(connectionId => {
      console.log(`[SSE] Removendo conexão antiga: ${connectionId}`);
      this.removeConnection(connectionId);
    });
  }

  private removeConnection(connectionId: string) {
    if (this.connections.has(connectionId)) {
      this.connections.delete(connectionId);
      console.log(`[SSE] Conexão removida: ${connectionId}. Total de conexões: ${this.connections.size}`);
    }
  }
  
  private sendPing(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.controller.enqueue(': ping\n\n');
      } catch (error) {
        console.log(`[SSE] Falha ao enviar ping para ${connectionId}, removendo conexão.`);
        this.removeConnection(connectionId);
      }
    }
  }

  private sendNotificationDirect(leadId: string, data: Record<string, any>): number {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    let sent = 0;
    
    this.connections.forEach((connection) => {
      if (connection.leadId === leadId) {
        try {
          connection.controller.enqueue(message);
          sent++;
          console.log(`[SSE] Notificação enviada para leadId: ${leadId} na conexão ${connection.connectionId}`);
        } catch (error) {
          console.log(`[SSE] Falha ao enviar notificação para ${connection.connectionId}, removendo conexão.`);
          this.removeConnection(connection.connectionId);
        }
      }
    });

    return sent;
  }

  public sendNotification(leadId: string, data: Record<string, any>) {
    const sent = this.sendNotificationDirect(leadId, data);
    console.log(`[SSE] Total de notificações enviadas para leadId ${leadId}: ${sent}`);
    
    // Se não conseguiu enviar, verificar se há conexões ativas via HTTP
    if (sent === 0) {
      console.log(`[SSE] ⚠️ Nenhuma conexão ativa para leadId: ${leadId}. Verificando conexões via HTTP...`);
      
      // Tentar verificar conexões ativas via HTTP (não bloquear o fluxo)
      this.checkActiveConnectionsViaHTTP(leadId, data).catch(error => {
        console.error(`[SSE] Erro ao verificar conexões via HTTP:`, error);
      });
      
      // Adicionar ao retry queue independentemente
      this.retryQueue.set(leadId, {
        data,
        attempts: 0,
        lastAttempt: Date.now()
      });
    }
    
    return sent;
  }

  private async checkActiveConnectionsViaHTTP(leadId: string, data: Record<string, any>) {
    try {
      // Fazer uma requisição para verificar se há conexões ativas
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/leads-chatwit/notifications/check?leadId=${leadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.hasActiveConnections) {
          console.log(`[SSE] ✅ Conexões ativas encontradas via HTTP para ${leadId}. Tentando reenviar...`);
          
          // Tentar enviar novamente via HTTP
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/leads-chatwit/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ leadId, data }),
          });
        }
      }
    } catch (error) {
      console.error(`[SSE] Erro na verificação HTTP:`, error);
    }
  }

  public getConnectionsCount(): number {
    return this.connections.size;
  }

  public getConnectionsForLead(leadId: string): number {
    let count = 0;
    this.connections.forEach((connection) => {
      if (connection.leadId === leadId) {
        count++;
      }
    });
    return count;
  }

  public getRetryQueueSize(): number {
    return this.retryQueue.size;
  }
}

export const sseManager = SseManager.getInstance(); 