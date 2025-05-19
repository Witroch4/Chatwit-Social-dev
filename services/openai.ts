// services/openai.ts
import OpenAI, { toFile } from 'openai';  
import { Message } from '@/hooks/useChatwitIA';

// Importações condicionais para evitar problemas com o bundler no navegador
// Isso é necessário porque o código pode ser importado durante o build pelo Webpack/Next.js,
// mesmo que a função específica que usa fs nunca seja executada no navegador
// O typeof window verifica se estamos em ambiente de navegador (não Node.js)
const isServer = typeof window === 'undefined';

// Código que pode ser carregado pelo bundler (webpack/vite) mas nunca é executado no navegador
// Tipos para os modelos disponíveis da OpenAI
export type GPTModel = 
  | 'gpt-4o-latest' 
  | 'chatgpt-4o-latest' 
  | 'gpt-3.5-turbo' 
  | 'gpt-3.5-turbo-16k'
  | 'gpt-4o';

export type ImageModel = 
  | 'dall-e-3' 
  | 'dall-e-2';

export type ImageSize = 
  | '256x256'
  | '512x512'
  | '1024x1024'
  | '1792x1024'
  | '1024x1792';

export type ImageQuality = 
  | 'standard'
  | 'hd';

export type ImageStyle = 
  | 'vivid'
  | 'natural';

// File types
export type FilePurpose = 
  | 'assistants'
  | 'assistants_output'
  | 'batch'
  | 'batch_output'
  | 'fine-tune'
  | 'fine-tune-results'
  | 'vision'
  | 'user_data';

// Interface para as opções de configuração de chat
export interface ChatOptions {
  model?: GPTModel;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

// Interface para as opções de geração de imagem
export interface ImageGenerationOptions {
  model?: ImageModel;
  n?: number;
  quality?: ImageQuality;
  response_format?: 'url' | 'b64_json';
  size?: ImageSize;
  style?: ImageStyle;
  user?: string;
}

// Interface for file options
export interface FileUploadOptions {
  purpose: FilePurpose;
}

// Interface para o serviço OpenAI
export interface IOpenAIService {
  createChatCompletion(messages: any[], options?: ChatOptions): Promise<any>;
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<any>;
  transcribeAudio(audioFile: File): Promise<any>;
  getEmbeddings(input: string | string[]): Promise<any>;
  moderateContent(input: string | string[]): Promise<any>;
  listModels(): Promise<any>;
  uploadFile(file: File, options: FileUploadOptions): Promise<any>;
  uploadFileFromPath(filePath: string, opts: { filename: string; mimeType: string; purpose: FilePurpose }): Promise<any>;
  listFiles(purpose?: FilePurpose): Promise<any>;
  retrieveFile(fileId: string): Promise<any>;
  retrieveFileContent(fileId: string): Promise<any>;
  deleteFile(fileId: string): Promise<any>;
  createImageEdit(image: File, prompt: string, mask?: File, options?: any): Promise<any>;
  createImageVariation(image: File, options?: any): Promise<any>;
  checkApiConnection(): Promise<any>;
  extractPdfWithAssistant(fileId: string, prompt: string): Promise<string>;
  askAboutPdf(fileId: string, question: string, options?: ChatOptions): Promise<string>;
}

// Implementação para servidor que usa a SDK OpenAI diretamente
class ServerOpenAIService implements IOpenAIService {
  client: OpenAI; // Expose client directly for external access
  private pdfAssistantId: string | null = process.env.PDF_ASSISTANT_ID || null;
  
  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }
  
  async createChatCompletion(messages: any[], options: ChatOptions = {}) {
    const defaultOptions: ChatOptions = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      // Verificar se há referências de arquivo PDF no formato [filename](file_id:XXX)
      const fileIdReferences: string[] = [];
      const cleanedMessages = messages.map(message => {
        if (typeof message.content === 'string') {
          const fileIdMatches = message.content.match(/\[.*?\]\(file_id:(.*?)\)/g);
          if (fileIdMatches && fileIdMatches.length > 0) {
            // Extrair os IDs dos arquivos
            fileIdMatches.forEach((match: string) => {
              const fileId = match.match(/\[.*?\]\(file_id:(.*?)\)/)?.[1];
              if (fileId) fileIdReferences.push(fileId);
            });

            // Limpar a referência do arquivo e manter apenas o texto da pergunta
            const cleanedContent = message.content.replace(/\[.*?\]\(file_id:.*?\)/g, '').trim();
            
            // Se o modelo suporta o formato de responses.create e temos file_id
            if ((mergedOptions.model === 'gpt-4o' || 
                mergedOptions.model?.includes('gpt-4o') || 
                mergedOptions.model?.includes('-o')) && 
                fileIdReferences.length > 0) {
              
              console.log(`Detectadas ${fileIdReferences.length} referências de arquivos. Usando responses.create API.`);
              
              // Usar a API responses.create que é mais adequada para arquivos
              return this.handleFileReferencesWithResponsesAPI(
                fileIdReferences, 
                cleanedContent || "Analise o conteúdo deste arquivo.", 
                mergedOptions
              );
            }
            
            // Retornar apenas o conteúdo limpo se não for usar responses.create
            return { ...message, content: cleanedContent };
          }
        }
        return message;
      });

      // Se detectamos arquivos e estamos usando um modelo compatível com responses.create
      if (fileIdReferences.length > 0 && 
         (mergedOptions.model === 'gpt-4o' || 
          mergedOptions.model?.includes('gpt-4o') || 
          mergedOptions.model?.includes('-o'))) {
        
        // A função handleFileReferencesWithResponsesAPI já foi chamada e retornou a resposta
        return cleanedMessages[cleanedMessages.length - 1];
      }
      
      // Caso contrário, seguir com o fluxo normal do chat.completions
      const formattedMessages = cleanedMessages.map(message => {
        let content = message.content;
        
        // Se o conteúdo for um array, processar de acordo com o tipo
        if (Array.isArray(content)) {
          const audioContent = content.find(item => item.type === 'audio' && item.audio_data);
          const imageContent = content.find(item => item.type === 'image' && item.image_url);
          const textContent = content.find(item => item.type === 'text' && item.text);
          
          if (audioContent) {
            return {
              role: message.role,
              content: [{ type: "audio", audio_data: audioContent.audio_data }]
            };
          } else if (imageContent) {
            return {
              role: message.role,
              content: imageContent.image_url
            };
          } else if (textContent) {
            return {
              role: message.role,
              content: textContent.text
            };
          }
        }
        
        // Se for string ou outro formato simples
        return {
          role: message.role,
          content: content
        };
      }) as OpenAI.Chat.ChatCompletionMessageParam[];
      
      const response = await this.client.chat.completions.create({
        model: mergedOptions.model!,
        messages: formattedMessages,
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.max_tokens,
        top_p: mergedOptions.top_p,
        frequency_penalty: mergedOptions.frequency_penalty,
        presence_penalty: mergedOptions.presence_penalty,
        stream: mergedOptions.stream,
      });
      
      return response;
    } catch (error) {
      console.error('Erro ao criar chat completion:', error);
      throw error;
    }
  }
  
  /**
   * Método auxiliar para processar referências de arquivos usando a API responses.create
   */
  private async handleFileReferencesWithResponsesAPI(
    fileIds: string[],
    question: string,
    options: ChatOptions
  ) {
    try {
      console.log(`Usando responses.create para processar ${fileIds.length} arquivos com a pergunta: "${question}"`);
      
      // Preparar o conteúdo com os file_ids
      const content = [
        { type: "input_text", text: question }
      ];
      
      // Adicionar cada arquivo como um item separado no content
      fileIds.forEach(fileId => {
        content.push({ type: "input_file", file_id: fileId } as any);
      });
      
      // Chamar a API responses.create
      const response = await this.client.responses.create({
        model: options.model!,
        input: [
          {
            role: "user",
            content
          }
        ],
        temperature: options.temperature,
        max_tokens: options.max_tokens,
      } as any);
      
      // Simular a resposta no formato que seria retornado por chat.completions
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: response.output_text || ""
            }
          }
        ]
      };
    } catch (error) {
      console.error('Erro ao processar arquivos com responses.create:', error);
      throw error;
    }
  }
  
  async generateImage(prompt: string, options: ImageGenerationOptions = {}) {
    const defaultOptions: ImageGenerationOptions = {
      model: 'dall-e-2',
      n: 1,
      size: '1024x1024',
      response_format: 'url',
      quality: 'standard',
      style: 'vivid',
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await this.client.images.generate({
        model: mergedOptions.model,
        prompt,
        n: mergedOptions.n,
        size: mergedOptions.size,
        quality: mergedOptions.quality,
        response_format: mergedOptions.response_format,
        style: mergedOptions.style,
        user: mergedOptions.user,
      });
      
      return response;
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      throw error;
    }
  }
  
  async transcribeAudio(audioFile: File) {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Erro na transcrição: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      throw error;
    }
  }
  
  async getEmbeddings(input: string | string[]) {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input,
      });
      
      return response;
    } catch (error) {
      console.error('Erro ao obter embeddings:', error);
      throw error;
    }
  }
  
  async moderateContent(input: string | string[]) {
    try {
      const response = await this.client.moderations.create({
        input,
      });
      
      return response;
    } catch (error) {
      console.error('Erro ao moderar conteúdo:', error);
      throw error;
    }
  }
  
  async listModels() {
    try {
      const response = await this.client.models.list();
      return response;
    } catch (error) {
      console.error('Erro ao listar modelos:', error);
      throw error;
    }
  }
  
  /**
   * Upload de arquivos, agora usando toFile para evitar erro 413.
   */
  async uploadFile(file: File, options: FileUploadOptions) {
    try {
      // Converte File para Buffer e usa helper toFile
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const oaiFile = await toFile(buffer, file.name, { type: file.type });

      // PDF não é suportado em "vision" → redireciona para assistants
      const isPdf = file.type === 'application/pdf';
      const purpose = isPdf && options.purpose === 'vision' ? 'assistants' : options.purpose;

      // Se for PDF no propósito vision, faz raw fetch para permitir application/pdf
      if (isPdf && options.purpose === 'vision') {
        const formData = new FormData();
        formData.append('file', oaiFile as unknown as any, file.name);
        formData.append('purpose', 'assistants'); // Força assistants para PDFs

        const resp = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: formData,
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Erro upload PDF vision: ${resp.status} - ${text}`);
        }
        return await resp.json();
      }

      // Para demais formatos/usos, usa SDK normalmente
      const response = await this.client.files.create({
        file: oaiFile,
        purpose: purpose as any,
      });

      console.log('Servidor: uploadFile concluído com sucesso:', response);
      return response;
    } catch (err: any) {
      console.error('Servidor: erro no uploadFile()', err);
      throw err;
    }
  }
  
  async uploadFileFromPath(
    filePath: string,
    opts: { filename: string; mimeType: string; purpose: FilePurpose }
  ) {
    try {
      // Check if running in a server environment
      if (typeof window !== 'undefined') {
        throw new Error('uploadFileFromPath só pode ser usado no lado do servidor');
      }
      
      // Implementação genérica que não faz referência direta ao fs
      // Quando executada no lado do servidor, o código de criação via API será usado
      console.warn('Este método deve ser implementado especificamente em ambiente de servidor.');
      
      throw new Error('Funcionalidade disponível apenas em ambiente de servidor Node.js.');
    } catch (error) {
      console.error('Erro ao enviar arquivo do caminho:', filePath, error);
      throw error;
    }
  }
  
  async listFiles(purpose?: FilePurpose) {
    try {
      let url = 'https://api.openai.com/v1/files';
      if (purpose) {
        url += `?purpose=${purpose}`;
      }
      
      console.log(`Servidor: Listando arquivos com URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao listar arquivos: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Servidor: Erro detalhado ao listar arquivos:', error);
      throw error;
    }
  }
  
  async retrieveFile(fileId: string) {
    try {
      console.log(`Servidor: Obtendo detalhes do arquivo: ${fileId}`);
      
      const response = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao obter arquivo: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Servidor: Erro detalhado ao obter arquivo:', error);
      throw error;
    }
  }
  
  async retrieveFileContent(fileId: string) {
    try {
      console.log(`Servidor: Obtendo conteúdo do arquivo: ${fileId}`);
      
      const response = await fetch(`https://api.openai.com/v1/files/${fileId}/content`, {
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao obter conteúdo do arquivo: ${response.status} - ${errorData}`);
      }
      
      // Para contenttdo binário
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Servidor: Erro detalhado ao obter conteúdo do arquivo:', error);
      throw error;
    }
  }
  
  async deleteFile(fileId: string) {
    try {
      console.log(`Servidor: Excluindo arquivo: ${fileId}`);
      
      const response = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao excluir arquivo: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Servidor: Erro detalhado ao excluir arquivo:', error);
      throw error;
    }
  }
  
  async createImageEdit(
    image: File,
    prompt: string,
    mask?: File,
    options?: {
      model?: string;
      n?: number;
      size?: string;
      responseFormat?: 'url' | 'b64_json';
      user?: string;
    }
  ) {
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('prompt', prompt);
      
      if (mask) {
        formData.append('mask', mask);
      }
      
      if (options?.model) {
        formData.append('model', options.model);
      }
      
      if (options?.n) {
        formData.append('n', options.n.toString());
      }
      
      if (options?.size) {
        formData.append('size', options.size);
      }
      
      if (options?.responseFormat) {
        formData.append('response_format', options.responseFormat);
      }
      
      if (options?.user) {
        formData.append('user', options.user);
      }
      
      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error creating image edit: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating image edit:', error);
      throw error;
    }
  }
  
  async createImageVariation(
    image: File,
    options?: {
      model?: string;
      n?: number;
      size?: string;
      responseFormat?: 'url' | 'b64_json';
      user?: string;
    }
  ) {
    try {
      const formData = new FormData();
      formData.append('image', image);
      
      if (options?.model) {
        formData.append('model', options.model);
      }
      
      if (options?.n) {
        formData.append('n', options.n.toString());
      }
      
      if (options?.size) {
        formData.append('size', options.size);
      }
      
      if (options?.responseFormat) {
        formData.append('response_format', options.responseFormat);
      }
      
      if (options?.user) {
        formData.append('user', options.user);
      }
      
      const response = await fetch('https://api.openai.com/v1/images/variations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error creating image variation: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating image variation:', error);
      throw error;
    }
  }
  
  async checkApiConnection() {
    try {
      console.log('Servidor: Verificando conexão com a API da OpenAI...');
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        return {
          success: false,
          status: response.status,
          message: `Falha na conexão: ${response.status} - ${errorData}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        status: response.status,
        message: 'Conexão estabelecida com sucesso',
        models: data.data.length
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'error',
        message: `Erro na conexão: ${error.message}`
      };
    }
  }

  /**
   * Extrai texto de um PDF usando o Assistants API
   * @param fileId ID do arquivo PDF já enviado para a OpenAI
   * @param prompt Instrução para extração de texto
   * @returns Texto extraído do PDF
   */
  async extractPdfWithAssistant(fileId: string, prompt: string): Promise<string> {
    // 1. Garante que temos um Assistant preparado (gpt‑4o + file_search)
    if (!this.pdfAssistantId) {
      const assistant = await this.client.beta.assistants.create({
        model: 'gpt-4o',
        name: 'PDF extractor',
        description: 'Lê PDFs e responde perguntas sobre o conteúdo',
        tools: [{ type: 'file_search' }],
      });
      this.pdfAssistantId = assistant.id;
      console.log(`Criado assistente para PDFs com ID: ${assistant.id}`);
      // opcional: persistir na env ou DB
    }

    // 2. Cria thread
    const thread = await this.client.beta.threads.create();

    // 3. Mensagem do usuário com o arquivo anexado
    await this.client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
      attachments: [
        {
          file_id: fileId,
        },
      ],
    });

    // 4. Executa e aguarda conclusão
    const run = await this.client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: this.pdfAssistantId,
    });

    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }

    // 5. Recupera a última mensagem
    const messages = await this.client.beta.threads.messages.list(thread.id, { limit: 1 });
    const latest = messages.data[0];
    
    // Verifica se temos conteúdo de texto na resposta
    const textContent = latest.content.find(c => c.type === 'text');
    const textBlock = textContent?.type === 'text' ? textContent.text.value : '';
    
    return textBlock;
  }

  /**
   * Faz uma pergunta sobre um PDF usando o modelo de visão
   * @param fileId ID do arquivo na OpenAI
   * @param question Pergunta sobre o conteúdo do PDF
   * @returns Resposta do modelo
   */
  async askAboutPdf(fileId: string, question: string, options: ChatOptions = {}): Promise<string> {
    try {
      console.log(`Perguntando ao PDF ${fileId}: "${question}"`);
      
      const defaultOptions: ChatOptions = {
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 4000,
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Usar a API responses.create ao invés de chat.completions.create
      const response = await this.client.responses.create({
        model: mergedOptions.model!,
        input: [
          {
            role: "user",
            content: [
              { type: "input_file", file_id: fileId },
              { type: "input_text", text: question },
            ],
          },
        ],
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.max_tokens,
      } as any); // Usar any por enquanto para contornar possíveis restrições de tipo
      
      return response.output_text || '';
    } catch (error) {
      console.error('Erro ao perguntar sobre PDF:', error);
      throw error;
    }
  }
}

// Implementação para cliente que usa APIs NextJS
class ClientOpenAIService implements IOpenAIService {
  async createChatCompletion(messages: any[], options: ChatOptions = {}) {
    try {
      const response = await fetch('/api/chatwitia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: options.model,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          top_p: options.top_p,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty,
          stream: options.stream
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao criar chat completion:', error);
      throw error;
    }
  }
  
  async generateImage(prompt: string, options: ImageGenerationOptions = {}) {
    try {
      const response = await fetch('/api/chatwitia/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: options.model,
          n: options.n,
          size: options.size,
          quality: options.quality,
          response_format: options.response_format,
          style: options.style,
          user: options.user
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao gerar imagem:', error);
      throw error;
    }
  }
  
  async transcribeAudio(audioFile: File) {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      
      const response = await fetch('/api/chatwitia/audio/transcriptions', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao transcrever áudio:', error);
      throw error;
    }
  }
  
  async getEmbeddings(input: string | string[]) {
    try {
      const response = await fetch('/api/chatwitia/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao obter embeddings:', error);
      throw error;
    }
  }
  
  async moderateContent(input: string | string[]) {
    try {
      const response = await fetch('/api/chatwitia/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao moderar conteúdo:', error);
      throw error;
    }
  }
  
  async listModels() {
    try {
      const response = await fetch('/api/chatwitia/models');
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao listar modelos:', error);
      throw error;
    }
  }
  
  async uploadFile(file: File, options: FileUploadOptions) {
    try {
      console.log(`Cliente: Preparando upload do arquivo: ${file.name}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', options.purpose);
      
      console.log('Cliente: Enviando requisição para API interna');
      
      const response = await fetch('/api/chatwitia/files', {
        method: 'POST',
        body: formData,
      });
      
      console.log(`Cliente: Resposta recebida com status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cliente: Erro detalhado:', errorData);
        throw new Error(`Erro ao fazer upload de arquivo: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Cliente: Erro ao fazer upload de arquivo:', error);
      throw error;
    }
  }
  
  async uploadFileFromPath(
    filePath: string,
    opts: { filename: string; mimeType: string; purpose: FilePurpose }
  ) {
    try {
      // Client-side implementation should never be called directly
      // Just to fulfill the interface
      throw new Error('uploadFileFromPath não disponível no cliente');
    } catch (error) {
      console.error('Erro: uploadFileFromPath chamado no cliente', error);
      throw error;
    }
  }
  
  async listFiles(purpose?: FilePurpose) {
    try {
      const url = purpose 
        ? `/api/chatwitia/files?purpose=${purpose}` 
        : '/api/chatwitia/files';
      
      console.log(`Cliente: Listando arquivos com URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao listar arquivos: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao listar arquivos:', error);
      throw error;
    }
  }
  
  async retrieveFile(fileId: string) {
    try {
      console.log(`Cliente: Obtendo detalhes do arquivo: ${fileId}`);
      
      const response = await fetch(`/api/chatwitia/files/${fileId}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao obter arquivo: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao obter arquivo:', error);
      throw error;
    }
  }
  
  async retrieveFileContent(fileId: string) {
    try {
      console.log(`Cliente: Obtendo conteúdo do arquivo: ${fileId}`);
      
      const response = await fetch(`/api/chatwitia/files/${fileId}/content`);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao obter conteúdo do arquivo: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao obter conteúdo do arquivo:', error);
      throw error;
    }
  }
  
  async deleteFile(fileId: string) {
    try {
      console.log(`Cliente: Excluindo arquivo: ${fileId}`);
      
      const response = await fetch(`/api/chatwitia/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao excluir arquivo: ${response.status} - ${errorData}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao excluir arquivo:', error);
      throw error;
    }
  }
  
  async createImageEdit(
    image: File,
    prompt: string,
    mask?: File,
    options?: {
      model?: string;
      n?: number;
      size?: string;
      responseFormat?: 'url' | 'b64_json';
      user?: string;
    }
  ) {
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('prompt', prompt);
      
      if (mask) {
        formData.append('mask', mask);
      }
      
      if (options?.model) {
        formData.append('model', options.model);
      }
      
      if (options?.n) {
        formData.append('n', options.n.toString());
      }
      
      if (options?.size) {
        formData.append('size', options.size);
      }
      
      if (options?.responseFormat) {
        formData.append('response_format', options.responseFormat);
      }
      
      if (options?.user) {
        formData.append('user', options.user);
      }
      
      const response = await fetch('/api/chatwitia/images/edit', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao editar imagem:', error);
      throw error;
    }
  }
  
  async createImageVariation(
    image: File,
    options?: {
      model?: string;
      n?: number;
      size?: string;
      responseFormat?: 'url' | 'b64_json';
      user?: string;
    }
  ) {
    try {
      const formData = new FormData();
      formData.append('image', image);
      
      if (options?.model) {
        formData.append('model', options.model);
      }
      
      if (options?.n) {
        formData.append('n', options.n.toString());
      }
      
      if (options?.size) {
        formData.append('size', options.size);
      }
      
      if (options?.responseFormat) {
        formData.append('response_format', options.responseFormat);
      }
      
      if (options?.user) {
        formData.append('user', options.user);
      }
      
      const response = await fetch('/api/chatwitia/images/variations', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API respondeu com status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cliente: Erro ao criar variação de imagem:', error);
      throw error;
    }
  }
  
  async checkApiConnection() {
    try {
      console.log('Cliente: Verificando conexão via API interna');
      const response = await fetch('/api/chatwitia/health');
      
      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          message: `Falha na conexão: ${response.status}`
        };
      }
      
      const data = await response.json();
      return data.services.openai;
    } catch (error: any) {
      return {
        success: false,
        status: 'error',
        message: `Erro na conexão: ${error.message}`
      };
    }
  }

  async extractPdfWithAssistant(fileId: string, prompt: string): Promise<string> {
    // Implementation for extracting text from a PDF using the Assistants API
    try {
      console.log(`Cliente: Extraindo texto do PDF ${fileId} com prompt: "${prompt.substring(0, 30)}..."`);
      
      const response = await fetch('/api/chatwitia/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao extrair texto do PDF: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Cliente: Erro ao extrair texto do PDF:', error);
      throw error;
    }
  }

  async askAboutPdf(fileId: string, question: string, options: ChatOptions = {}): Promise<string> {
    try {
      console.log(`Cliente: Perguntando ao PDF ${fileId}: "${question.substring(0, 30)}..."`);
      
      const response = await fetch('/api/chatwitia/pdf/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, question, options }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro ao perguntar sobre PDF: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Cliente: Erro ao perguntar sobre PDF:', error);
      throw error;
    }
  }
}

// Factory function to create the appropriate service based on environment
const createOpenAIService = (apiKey?: string): IOpenAIService => {
  // Verificação mais robusta se estamos no servidor ou cliente
  const isServer = typeof window === 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node;
  
  if (isServer) {
    console.log('Criando ServerOpenAIService para ambiente Node.js');
    return new ServerOpenAIService(apiKey);
  } else {
    console.log('Criando ClientOpenAIService para ambiente do navegador');
    return new ClientOpenAIService();
  }
};

// Create and export the service instance
export const openaiService = createOpenAIService();

export default openaiService; 