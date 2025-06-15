import IORedis from 'ioredis';

// --- Interface da Conexão ---
interface SseConnection {
  controller: ReadableStreamDefaultController<string>;
  connectionId: string;
}

// --- Definição do Singleton no escopo global ---
// Isso garante que a mesma instância seja usada mesmo com o hot-reload do Next.js
const globalForSse = globalThis as unknown as {
  sseManager: SseManager | undefined;
};

// --- Classe SseManager ---
class SseManager {
  private connectionsByLead: Map<string, Map<string, SseConnection>> = new Map();
  private publisher!: IORedis;
  private subscriber!: IORedis;
  private isInitialized = false;

  constructor() {
    console.log('[SSE Manager] 🚀 Criando nova instância...');
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      connectTimeout: 15000,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    };

    console.log('[SSE Redis] ⚙️ Inicializando com configuração:', {
      host: redisConfig.host, 
      port: redisConfig.port, 
      password: redisConfig.password ? '******' : 'undefined',
    });

    this.publisher = new IORedis(redisConfig);
    this.subscriber = new IORedis(redisConfig);

    this.subscriber.on('message', this.handleRedisMessage.bind(this));
    
    this.publisher.on('connect', () => {
      console.log('[SSE Redis] ✅ Publisher conectado.');
      this.isInitialized = true;
    });

    this.subscriber.on('connect', () => console.log('[SSE Redis] ✅ Subscriber conectado.'));
    
    const handleError = (client: string) => (error: Error) => {
      console.error(`[SSE Redis] ❌ Erro no ${client}:`, error.message);
      if (client === 'publisher') this.isInitialized = false;
    };

    this.publisher.on('error', handleError('Publisher'));
    this.subscriber.on('error', handleError('Subscriber'));
  }

  private handleRedisMessage(channel: string, message: string) {
    const leadId = channel.replace('sse:', '');
    const leadConnections = this.connectionsByLead.get(leadId);

    console.log(`[SSE Redis] 🔔 MENSAGEM RECEBIDA no canal ${channel}:`, message);

    if (!leadConnections || leadConnections.size === 0) {
      console.warn(`[SSE Redis] ⚠️ Nenhuma conexão ativa para leadId ${leadId}. Mensagem descartada.`);
      return;
    }

    console.log(`[SSE Redis] ➡️ Enviando mensagem para ${leadConnections.size} cliente(s) do lead ${leadId}`);
    
    let successCount = 0;
    leadConnections.forEach((conn) => {
      try {
        conn.controller.enqueue(`data: ${message}\n\n`);
        successCount++;
        console.log(`[SSE Redis] ✅ Mensagem enviada para conexão ${conn.connectionId}`);
      } catch (e) {
        console.warn(`[SSE Manager] ⚠️ Conexão ${conn.connectionId} fechada, removendo.`, e);
        this.removeConnection(leadId, conn.connectionId);
      }
    });
    
    console.log(`[SSE Redis] 📊 Resumo: ${successCount}/${leadConnections.size} mensagens entregues com sucesso`);
  }

  public addConnection(leadId: string, controller: ReadableStreamDefaultController<string>): string {
    const connectionId = `${leadId}-${Date.now()}`;
    
    if (!this.connectionsByLead.has(leadId)) {
      this.connectionsByLead.set(leadId, new Map());
      
      // ====================================================================
      // CORREÇÃO: Removida a condição 'if (this.isInitialized)'
      // A biblioteca ioredis gerencia automaticamente a fila de comandos
      // e executa o subscribe assim que a conexão estiver estabelecida
      this.subscriber.subscribe(`sse:${leadId}`, (err, count) => {
        if (err) {
          return console.error(`[SSE Redis] ❌ Falha ao se inscrever no canal sse:${leadId}`, err);
        }
        console.log(`[SSE Redis] 📡 Inscrição no canal sse:${leadId} confirmada. Total de inscrições nesta instância: ${count}`);
      });
      // ====================================================================
    }
    
    this.connectionsByLead.get(leadId)!.set(connectionId, { controller, connectionId });
    console.log(`[SSE Manager] ➕ Conexão ${connectionId} adicionada para o lead ${leadId}.`);
    
    // Enviar mensagem de confirmação
    try {
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connection',
        message: 'Conectado com sucesso',
        leadId,
        connectionId,
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(welcomeMessage);
    } catch (error) {
      console.error('[SSE Manager] ❌ Erro ao enviar mensagem de boas-vindas:', error);
    }
    
    return connectionId;
  }

  public removeConnection(leadId: string, connectionId: string): void {
    const leadConnections = this.connectionsByLead.get(leadId);
    if (leadConnections?.delete(connectionId)) {
      console.log(`[SSE Manager] ➖ Conexão ${connectionId} removida.`);
      if (leadConnections.size === 0) {
        this.connectionsByLead.delete(leadId);
        // CORREÇÃO: Removida a condição 'if (this.isInitialized)' aqui também
        this.subscriber.unsubscribe(`sse:${leadId}`);
        console.log(`[SSE Redis] 🔌 Inscrição do canal sse:${leadId} cancelada.`);
      }
    }
  }

  public async sendNotification(leadId: string, data: any): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('[SSE Manager] ‼️ ERRO CRÍTICO: Publisher Redis não conectado. A notificação não será enviada.');
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type: 'notification',
        leadId,
        data,
        timestamp: new Date().toISOString()
      });
      
      await this.publisher.publish(`sse:${leadId}`, message);
      console.log(`[SSE Redis] ✅ Notificação para ${leadId} publicada com sucesso.`);
      return true;
    } catch (error) {
      console.error(`[SSE Redis] ❌ Erro ao publicar notificação:`, error);
      return false;
    }
  }

  public getConnectionsForLead(leadId: string): number {
    const leadConnections = this.connectionsByLead.get(leadId);
    return leadConnections ? leadConnections.size : 0;
  }

  public getConnectionsCount(): number {
    return Array.from(this.connectionsByLead.values())
      .reduce((total, leadConnections) => total + leadConnections.size, 0);
  }

  public getStatus() {
    const leads = Array.from(this.connectionsByLead.keys());
    const leadCounts = leads.map(leadId => ({
      leadId,
      connections: this.connectionsByLead.get(leadId)!.size
    }));

    return {
      isRedisInitialized: this.isInitialized,
      totalConnections: this.getConnectionsCount(),
      leadsConnected: leads.length,
      connectionsPerLead: leadCounts
    };
  }

  public async cleanup(): Promise<void> {
    try {
      console.log('[SSE Manager] 🧹 Iniciando limpeza...');
      
      this.connectionsByLead.clear();
      
      if (this.isInitialized) {
        await this.subscriber.disconnect();
        await this.publisher.disconnect();
        console.log('[SSE Redis] ✅ Clientes Redis desconectados');
        this.isInitialized = false;
      }
      
      console.log('[SSE Manager] ✅ Limpeza concluída');
    } catch (error) {
      console.error('[SSE Manager] ❌ Erro durante limpeza:', error);
    }
  }
}

// --- Lógica do Singleton ---
export const sseManager = globalForSse.sseManager || new SseManager();

if (process.env.NODE_ENV !== 'production') {
  globalForSse.sseManager = sseManager;
} 