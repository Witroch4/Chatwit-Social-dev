//useChatwitIA.ts
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import openaiService, { FilePurpose } from '@/services/openai';

export type MessageContent = string | Array<{
  type: 'text' | 'audio' | 'image' | 'document';
  text?: string;
  audio_data?: string;
  image_url?: string;
  file_name?: string;
  file_type?: string;
  file_content?: string;
}>;

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
  summary?: string;  // Campo para armazenar um resumo/título da conversa
};

type ChatSessionResponse = {
  id: string;
  title: string;
  model: string;
  messages: {
    id: string;
    role: string;
    content: string;
    contentType: string;
    audioData?: string;
    imageUrl?: string;
  }[];
};

// Definindo um tipo explícito para conteúdo de upload
export type UploadContent = {
  type: 'upload' | 'document';
  file: {
    name: string;
    type: string;
    content: string;
  };
};

export type FileWithContent = {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
  created_at: number;
  content?: any;
};

export function useChatwitIA(chatId?: string | null, initialModel = 'chatgpt-4o-latest') {
  const { data: authSession } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [model, setModel] = useState(initialModel);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(chatId || null);
  const [isFetchingSession, setIsFetchingSession] = useState(false);
  const streamContentRef = useRef('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  
  /** Prevent duplicate message sends */
  const isProcessingRef = useRef(false);
  const messagesRef = useRef(messages);

  // Atualiza a referência quando as mensagens mudam
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Atualizar o modelo quando initialModel mudar
  useEffect(() => {
    console.log(`Atualizando modelo para: ${initialModel}`);
    setModel(initialModel);
  }, [initialModel]);

  // Update currentSessionId when chatId changes
  useEffect(() => {
    setCurrentSessionId(chatId || null);
  }, [chatId]);
  
  // Carregar chat do banco de dados quando o ID mudar
  useEffect(() => {
    if (chatId) {
      loadChatFromDB(chatId);
    } else {
      // Reset messages when no chatId is provided (new chat)
      setMessages([]);
    }
  }, [chatId, authSession]);

  // Carregar mensagens quando o chatId mudar ou o usuário estiver autenticado
  useEffect(() => {
    if (chatId && authSession?.user) {
      loadChatFromDB(chatId);
    } else if (!chatId) {
      setMessages([]);
      setCurrentSessionId(null);
    }
  }, [chatId, authSession?.user]);

  // Carregar chat do banco de dados
  const loadChatFromDB = async (id: string) => {
    setIsFetchingSession(true);
    try {
      const response = await axios.get<ChatSessionResponse>(`/api/chatwitia/sessions/${id}`);
      const sessionData = response.data;
      
      // Converter as mensagens do formato do banco para o formato do hook
      const convertedMessages: Message[] = sessionData.messages.map(msg => {
        let content: MessageContent = msg.content;
        
        // Se for um tipo especial (áudio ou imagem), converter para o formato apropriado
        if (msg.contentType === 'audio' && msg.audioData) {
          content = [{ type: 'audio', audio_data: msg.audioData }];
        } else if (msg.contentType === 'image' && msg.imageUrl) {
          content = [{ type: 'image', image_url: msg.imageUrl }];
        }
        
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content
        };
      });
      
      setMessages(convertedMessages);
      setModel(sessionData.model);
      setCurrentSessionId(id);
    } catch (err) {
      console.error('Erro ao carregar chat do banco:', err);
      setError('Não foi possível carregar a conversa.');
      setMessages([]);
    } finally {
      setIsFetchingSession(false);
    }
  };

  // Criar uma nova sessão de chat
  const createChatSession = async (title: string = 'Nova conversa', modelToUse: string = model): Promise<string | null> => {
    if (!authSession?.user) {
      setError('Você precisa estar logado para salvar chats.');
      return null;
    }
    
    try {
      const response = await axios.post('/api/chatwitia/sessions', {
        title,
        model: modelToUse
      });
      
      const newSessionId = response.data.id;
      setCurrentSessionId(newSessionId);
      return newSessionId;
    } catch (err) {
      console.error('Erro ao criar sessão de chat:', err);
      setError('Não foi possível criar uma nova conversa.');
      return null;
    }
  };

  // Salvar mensagem no banco de dados
  const saveChatMessageToDB = async (
    sessionId: string, 
    message: Message | undefined,
    contentType: 'text' | 'audio' | 'image' | 'document' = 'text'
  ) => {
    if (!authSession?.user || !message) return;
    
    try {
      let audioData: string | undefined;
      let imageUrl: string | undefined;
      let content = typeof message.content === 'string' ? message.content : '';
      
      // Extrair dados específicos dependendo do tipo de conteúdo
      if (Array.isArray(message.content)) {
        const item = message.content[0];
        if (item && item.type === 'audio' && item.audio_data) {
          audioData = item.audio_data;
          contentType = 'audio';
        } else if (item && item.type === 'image' && item.image_url) {
          imageUrl = item.image_url;
          contentType = 'image';
        } else if (item && item.type === 'text' && item.text) {
          content = item.text;
        }
      }
      
      await axios.post(`/api/chatwitia/sessions/${sessionId}/messages`, {
        role: message.role,
        content: content,
        contentType,
        audioData,
        imageUrl
      });
    } catch (err) {
      console.error('Erro ao salvar mensagem no banco:', err);
      // Não exibir erro na interface para não interromper a experiência do usuário
    }
  };

  const sendMessage = async (content: string | Blob | UploadContent, systemPrompt?: string, selectedModel?: string) => {
    // Prevent duplicate calls/API requests with the same message
    if (isProcessingRef.current) {
      console.log('Ignoring duplicate sendMessage call - already processing');
      return;
    }
    
    isProcessingRef.current = true;
    
    // Always use the selectedModel parameter if provided, falling back to current model state
    const modelToUse = selectedModel || model;
    console.log(`Enviando mensagem usando modelo: ${modelToUse}`);
    
    // Update the model state to match what we're using for this message
    if (modelToUse !== model) {
      console.log(`Modelo alterado de "${model}" para "${modelToUse}"`);
      setModel(modelToUse);
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Garantir que temos uma sessão para salvar as mensagens
      let sessionIdToUse = currentSessionId;
      let isNewSession = false;
      
      if (!sessionIdToUse && authSession?.user) {
        // Pass the explicitly selected model to createChatSession
        sessionIdToUse = await createChatSession('Nova conversa', modelToUse);
        isNewSession = true;
      }
      
      // Prepara o array de mensagens para enviar para a API
      const messagesToSend: Message[] = [...messages];
      
      // Adiciona um system prompt se fornecido e não existir um já
      if (systemPrompt && !messages.some(m => m.role === 'system')) {
        const systemMessage: Message = { role: 'system', content: systemPrompt };
        messagesToSend.unshift(systemMessage);
        
        // Salvar a mensagem de sistema no banco se tivermos uma sessão
        if (sessionIdToUse && authSession?.user) {
          await saveChatMessageToDB(sessionIdToUse, systemMessage);
        }
      }
      
      let userMessage: Message;
      let contentType: 'text' | 'audio' | 'image' | 'document' = 'text';
      
      // Verifica se o conteúdo é um blob de áudio
      if (content instanceof Blob) {
        // Converte o blob de áudio para base64
        const base64Audio = await blobToBase64(content);
        
        userMessage = {
          role: 'user',
          content: [
            {
              type: 'audio',
              audio_data: base64Audio
            }
          ]
        };
        contentType = 'audio';
      } 
      // Verifica se é um objeto de upload
      else if (typeof content === 'object' && 'type' in content && 'file' in content) {
        if (content.type === 'upload' && content.file.type.startsWith('image/')) {
          // Upload de imagem
          userMessage = {
            role: 'user',
            content: [
              {
                type: 'image',
                image_url: content.file.content,
                file_name: content.file.name,
                file_type: content.file.type
              }
            ]
          };
          contentType = 'image';
        } else if (content.type === 'document') {
          // Upload de documento
          userMessage = {
            role: 'user',
            content: [
              {
                type: 'document',
                file_name: content.file.name,
                file_type: content.file.type,
                file_content: content.file.content,
                text: `[Documento carregado: ${content.file.name}]`
              }
            ]
          };
          contentType = 'document';
        } else {
          // Tipo não suportado
          userMessage = { 
            role: 'user', 
            content: `[Arquivo não suportado: ${content.file.name}]` 
          };
        }
      } else {
        // Mensagem de texto normal
        userMessage = { role: 'user', content };
      }
      
      // Adiciona a mensagem do usuário
      messagesToSend.push(userMessage);
      
      // Para visualização do usuário, usamos um formato simplificado
      let displayContent: string;
      
      if (content instanceof Blob) {
        displayContent = '[Áudio enviado]';
      } else if (typeof content === 'object' && 'type' in content && 'file' in content) {
        if (content.type === 'upload') {
          displayContent = `[Imagem: ${content.file.name}]`;
        } else if (content.type === 'document') {
          displayContent = `[Documento: ${content.file.name}]`;
        } else {
          displayContent = `[Arquivo: ${content.file.name}]`;
        }
      } else {
        displayContent = content as string;
      }
      
      const displayUserMessage: Message = {
        role: 'user',
        content: displayContent
      };
      
      // Atualiza o estado com a mensagem do usuário para visualização
      const updatedMessages = [...messages, displayUserMessage];
      setMessages(updatedMessages);

      // Se for um documento, adicione informações para o processamento de embedding
      let additionalData = {};
      if (typeof content === 'object' && 'type' in content && 'file' in content && content.type === 'document') {
        additionalData = {
          document: {
            name: content.file.name,
            content: content.file.content,
            type: content.file.type
          }
        };
      }

      // Save user message to DB if we have a session
      if (sessionIdToUse && authSession?.user) {
        await saveChatMessageToDB(sessionIdToUse, userMessage, contentType);
      }

      // For visualizing what we're sending to the API for debugging
      console.log('Sending messages to API:', messagesToSend);

      // Prepare for streaming - add placeholder assistant message
      const assistantPlaceholder: Message = {
        role: 'assistant',
        content: ''
      };
      
      // Add placeholder message that will be updated with streaming content
      setMessages(prev => [...prev, assistantPlaceholder]);
      
      // If the content contains file references, we need to include them in the API request
      if (typeof content === 'string') {
        // Try to extract file IDs from the content
        const fileIdRegex = /file_id:([a-zA-Z0-9_-]+)/g;
        const matches = [...content.matchAll(fileIdRegex)];
        
        const fileIds = matches.map(match => match[1]);
        
        // Include fileIds in the API request if any were found
        if (fileIds.length > 0) {
          additionalData = { ...additionalData, fileIds };
          console.log(`Found ${fileIds.length} file references in message:`, fileIds);
        }
      }
      
      // Make API call with streaming enabled
      const response = await fetch('/api/chatwitia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend, 
          model: modelToUse,
          sessionId: sessionIdToUse,
          generateSummary: isNewSession,
          stream: true,
          ...additionalData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      streamContentRef.current = ''; // Reset streamed content
      
      console.log('Starting to read stream response...');
      
      // Function to update messages with throttling
      const updateMessageWithStream = (content: string) => {
        // Clear any pending update
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Schedule an update with 50ms delay to prevent too many renders
        updateTimeoutRef.current = setTimeout(() => {
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastIndex = updatedMessages.length - 1;
            if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
              updatedMessages[lastIndex] = {
                ...updatedMessages[lastIndex],
                content: content
              };
            }
            return updatedMessages;
          });
        }, 50);
      };
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream complete');
          
          // Make sure we do a final update
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          // Update the final message
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastIndex = updatedMessages.length - 1;
            if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
              updatedMessages[lastIndex] = {
                ...updatedMessages[lastIndex],
                content: streamContentRef.current
              };
            }
            return updatedMessages;
          });
          
          break;
        }
        
        // Decode the received chunk
        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk);
        
        // Process each line from the chunk
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          try {
            console.log('Processing line:', line);
            const data = JSON.parse(line);
            console.log('Parsed data:', data);
            
            if (data.type === 'chunk') {
              // Update the streamed content with the new chunk
              streamContentRef.current += data.content;
              console.log('Updated content:', streamContentRef.current);
              
              // Update the UI with throttling
              updateMessageWithStream(streamContentRef.current);
            } else if (data.type === 'done') {
              console.log('Received done event:', data);
              // Final update with complete message
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
              }
              
              const finalContent = data.response?.content || streamContentRef.current;
              console.log('Setting final content:', finalContent);
              streamContentRef.current = finalContent;
              
              // Final update
              setMessages(prev => {
                const updatedMessages = [...prev];
                const lastIndex = updatedMessages.length - 1;
                if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
                  updatedMessages[lastIndex] = {
                    ...updatedMessages[lastIndex],
                    content: finalContent,
                    summary: data.summary || null // Garantir que o summary é atualizado
                  };
                }
                return updatedMessages;
              });
              
              // No need to save to DB here since it's now handled on the server side
              // when the streaming is complete

              // Handle summary if present
              if (data.summary && isNewSession && sessionIdToUse) {
                await axios.put(`/api/chatwitia/sessions/${sessionIdToUse}`, {
                  title: data.summary
                });
              }
            }
          } catch (e) {
            console.error('Error parsing streaming data:', e, 'Line:', line);
          }
        }
      }
    } catch (err: any) {
      console.error('Error in chat:', err);
      setError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
      
      // Remove the placeholder assistant message if we had an error
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  // Função auxiliar para converter Blob para Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remover prefixo "data:audio/webm;base64," para obter apenas os dados em base64
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const clearMessages = async () => {
    setMessages([]);
    setError(null);
    
    // Se tivermos uma sessão atual, criar uma nova sessão
    if (authSession?.user) {
      const newSessionId = await createChatSession();
      setCurrentSessionId(newSessionId);
    } else {
      setCurrentSessionId(null);
    }
  };

  // Função para obter todos os chats salvos
  const getAllChats = async () => {
    if (!authSession?.user) {
      return [];
    }
    
    try {
      const response = await axios.get('/api/chatwitia/sessions');
      return response.data;
    } catch (err) {
      console.error('Erro ao obter chats:', err);
      return [];
    }
  };

  // Função para excluir um chat
  const deleteChat = async (id: string) => {
    if (!authSession?.user) {
      return;
    }
    
    try {
      await axios.delete(`/api/chatwitia/sessions/${id}`);
      
      // Se excluímos a sessão atual, resetar o estado
      if (currentSessionId === id) {
        setMessages([]);
        setCurrentSessionId(null);
      }
    } catch (err) {
      console.error('Erro ao excluir chat:', err);
    }
  };

  // File handling methods
  
  // Upload a file
  const uploadFile = async (file: File, purpose: FilePurpose = "user_data") => {
    // Para PDFs, sempre usar purpose 'user_data' conforme recomendação atual da OpenAI
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const finalPurpose: FilePurpose = isPdf ? 'user_data' : purpose;
    
    console.log(`Enviando arquivo ${file.name} com purpose: ${finalPurpose} (original: ${purpose})`);
    
    // 1️⃣ envia para nosso novo endpoint
    const form = new FormData();
    form.append("file", file);
    if (currentSessionId) form.append("sessionId", currentSessionId);
    form.append("purpose", finalPurpose);

    try {
      setIsFileLoading(true);
      setFileError(null);
      
      const res = await fetch("/api/chatwitia/files", { method: "POST", body: form });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Erro no upload: ${res.status} - ${errorText}`);
        throw new Error(`Upload failed: ${res.status}`);
      }
      
      const meta = await res.json();
      console.log("Upload completo:", meta);
      
      // atualiza lista local - garantindo que temos o openaiFileId
      const fileData = {
        ...meta,
        id: meta.openaiFileId || meta.id, // Preferir o ID da OpenAI
        filename: meta.filename || file.name,
        purpose: finalPurpose,
        bytes: file.size,
        created_at: new Date().getTime()
      };
      
      setFiles(prev => [...prev, fileData]);
      
      return fileData;
    } catch (error) {
      console.error("Erro durante upload:", error);
      setFileError(`Erro ao enviar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    } finally {
      setIsFileLoading(false);
    }
  };

  // List all files
  const listFiles = async (purpose?: string) => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      
      console.log(`Iniciando listagem de arquivos, propósito: ${purpose || 'todos'}`);
      
      const url = purpose 
        ? `/api/chatwitia/files?purpose=${purpose}` 
        : '/api/chatwitia/files';
      
      console.log(`Listando arquivos com URL: ${url}`);
      
      // Usar axios com configurações otimizadas
      const response = await axios.get(url, {
        timeout: 30000, // 30 segundos de timeout
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Evitar cache
        }
      });
      
      console.log(`Listagem concluída, encontrados ${response.data.data?.length || 0} arquivos`);
      
      setFiles(response.data.data || []);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro detalhado ao listar arquivos:', error);
      
      // Detalhes específicos do erro
      if (error.response) {
        console.error('Resposta de erro do servidor:', error.response.data);
        console.error('Status HTTP:', error.response.status);
        setFileError(`Erro do servidor: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Sem resposta do servidor. Requisição:', error.request);
        setFileError('Sem resposta do servidor. Verifique sua conexão.');
      } else {
        setFileError(`Erro ao listar arquivos: ${error.message}`);
      }
      
      return [];
    } finally {
      setIsFileLoading(false);
    }
  };

  // Get a file's details
  const getFile = async (fileId: string) => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      
      console.log(`Obtendo detalhes do arquivo: ${fileId}`);
      
      const response = await axios.get(`/api/chatwitia/files/${fileId}`, {
        timeout: 30000, // 30 segundos de timeout
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Evitar cache
        }
      });
      
      console.log('Detalhes do arquivo obtidos com sucesso:', response.data.filename);
      
      // Update the file in our list if it exists
      setFiles(prev => {
        const fileIndex = prev.findIndex(f => f.id === fileId);
        if (fileIndex >= 0) {
          const newFiles = [...prev];
          newFiles[fileIndex] = response.data;
          return newFiles;
        }
        return [...prev, response.data];
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Erro detalhado ao obter arquivo:', error);
      
      // Detalhes específicos do erro
      if (error.response) {
        console.error('Resposta de erro do servidor:', error.response.data);
        console.error('Status HTTP:', error.response.status);
        setFileError(`Erro do servidor: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Sem resposta do servidor. Requisição:', error.request);
        setFileError('Sem resposta do servidor. Verifique sua conexão.');
      } else {
        setFileError(`Erro ao obter arquivo: ${error.message}`);
      }
      
      return null;
    } finally {
      setIsFileLoading(false);
    }
  };
  
  // Get a file's content
  const getFileContent = async (fileId: string) => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      
      console.log(`Obtendo conteúdo do arquivo: ${fileId}`);
      
      const response = await axios.get(`/api/chatwitia/files/${fileId}/content`, {
        timeout: 30000, // 30 segundos de timeout
        responseType: 'arraybuffer' // Para lidar com dados binários (imagens, PDFs)
      });
      
      console.log('Conteúdo do arquivo obtido com sucesso');
      
      // Verificar o tipo de conteúdo recebido
      const contentType = response.headers['content-type'];
      let content;
      
      if (contentType && contentType.includes('image')) {
        // Para imagens, criar uma URL de blob
        const blob = new Blob([response.data], { type: contentType });
        content = URL.createObjectURL(blob);
      } else if (contentType && contentType.includes('application/pdf')) {
        // Para PDFs, criar uma URL de blob
        const blob = new Blob([response.data], { type: contentType });
        content = URL.createObjectURL(blob);
      } else if (contentType && contentType.includes('application/json')) {
        // Para JSON, converter o arraybuffer para string e depois parsear
        const decoder = new TextDecoder('utf-8');
        const json = decoder.decode(response.data);
        content = JSON.parse(json);
      } else {
        // Para outros tipos, criar uma URL de blob genérica
        const blob = new Blob([response.data], { type: contentType || 'application/octet-stream' });
        content = URL.createObjectURL(blob);
      }
      
      // Update the file in our list if it exists
      setFiles(prev => {
        const fileIndex = prev.findIndex(f => f.id === fileId);
        if (fileIndex >= 0) {
          const newFiles = [...prev];
          newFiles[fileIndex] = {
            ...newFiles[fileIndex],
            content
          };
          return newFiles;
        }
        return prev;
      });
      
      return content;
    } catch (error: any) {
      console.error('Erro detalhado ao obter conteúdo do arquivo:', error);
      
      // Detalhes específicos do erro
      if (error.response) {
        console.error('Resposta de erro do servidor:', error.response.data);
        console.error('Status HTTP:', error.response.status);
        setFileError(`Erro do servidor: ${error.response.status}`);
      } else if (error.request) {
        console.error('Sem resposta do servidor. Requisição:', error.request);
        setFileError('Sem resposta do servidor. Verifique sua conexão.');
      } else {
        setFileError(`Erro ao obter conteúdo do arquivo: ${error.message}`);
      }
      
      return null;
    } finally {
      setIsFileLoading(false);
    }
  };
  
  // Delete a file
  const deleteFile = async (fileId: string) => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      
      console.log(`Excluindo arquivo: ${fileId}`);
      
      const response = await axios.delete(`/api/chatwitia/files/${fileId}`, {
        timeout: 30000 // 30 segundos de timeout
      });
      
      console.log('Arquivo excluído com sucesso');
      
      // Remove the file from our list
      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      return response.data;
    } catch (error: any) {
      console.error('Erro detalhado ao excluir arquivo:', error);
      
      // Detalhes específicos do erro
      if (error.response) {
        console.error('Resposta de erro do servidor:', error.response.data);
        console.error('Status HTTP:', error.response.status);
        setFileError(`Erro do servidor: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Sem resposta do servidor. Requisição:', error.request);
        setFileError('Sem resposta do servidor. Verifique sua conexão.');
      } else {
        setFileError(`Erro ao excluir arquivo: ${error.message}`);
      }
      
      return null;
    } finally {
      setIsFileLoading(false);
    }
  };

  // Edit an image
  const editImage = async (
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
  ) => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      
      console.log(`Editando imagem: ${image.name}, prompt: ${prompt.substring(0, 30)}...`);
      
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
      
      const response = await axios.post('/api/chatwitia/images/edit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 segundos de timeout
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / (progressEvent.total ?? 0)) * 100
          );
          console.log(`Progresso de upload da imagem: ${progress}%`);
        }
      });
      
      console.log('Imagem editada com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('Erro detalhado ao editar imagem:', error);
      
      // Detalhes específicos do erro
      if (error.response) {
        console.error('Resposta de erro do servidor:', error.response.data);
        console.error('Status HTTP:', error.response.status);
        setFileError(`Erro do servidor: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Sem resposta do servidor. Requisição:', error.request);
        setFileError('Sem resposta do servidor. Verifique sua conexão.');
      } else {
        setFileError(`Erro ao editar imagem: ${error.message}`);
      }
      
      return null;
    } finally {
      setIsFileLoading(false);
    }
  };
  
  // Create image variations
  const createImageVariation = async (
    image: File, 
    options?: {
      model?: string;
      n?: number;
      size?: string;
      responseFormat?: 'url' | 'b64_json';
      user?: string;
    }
  ) => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      
      console.log(`Criando variação da imagem: ${image.name}`);
      
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
      
      const response = await axios.post('/api/chatwitia/images/variations', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 segundos de timeout
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / (progressEvent.total ?? 0)) * 100
          );
          console.log(`Progresso de upload da imagem: ${progress}%`);
        }
      });
      
      console.log('Variação da imagem criada com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('Erro detalhado ao criar variação de imagem:', error);
      
      // Detalhes específicos do erro
      if (error.response) {
        console.error('Resposta de erro do servidor:', error.response.data);
        console.error('Status HTTP:', error.response.status);
        setFileError(`Erro do servidor: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('Sem resposta do servidor. Requisição:', error.request);
        setFileError('Sem resposta do servidor. Verifique sua conexão.');
      } else {
        setFileError(`Erro ao criar variação de imagem: ${error.message}`);
      }
      
      return null;
    } finally {
      setIsFileLoading(false);
    }
  };

  // Testar a conexão com a API da OpenAI
  const checkOpenApiConnection = async () => {
    try {
      console.log('Testando conexão direta com a API do OpenAI...');
      
      const result = await openaiService.checkApiConnection();
      console.log('Resultado do teste de conexão OpenAI:', result);
      
      return result;
    } catch (error: any) {
      console.error('Erro ao testar conexão com OpenAI:', error);
      return {
        success: false,
        status: 'error',
        message: `Erro na conexão: ${error.message || 'Erro desconhecido'}`
      };
    }
  };

  // Testar a conexão com a API do backend
  const checkApiConnection = async () => {
    try {
      console.log('Testando conexão com o backend...');
      
      // Testar o endpoint de arquivos
      const response = await axios.get('/api/chatwitia/health', {
        timeout: 5000 // 5 segundos de timeout
      });
      
      console.log('Status da API:', response.data);
      
      return {
        success: true,
        status: response.status,
        message: 'Conexão com o backend OK',
        data: response.data
      };
    } catch (error: any) {
      console.error('Erro ao testar conexão com o backend:', error);
      
      // Detalhes específicos do erro
      if (error.response) {
        return {
          success: false,
          status: error.response.status,
          message: `Erro na resposta: ${error.response.status}`,
          data: error.response.data
        };
      } else if (error.request) {
        return {
          success: false,
          status: 'timeout',
          message: 'Sem resposta do servidor'
        };
      } else {
        return {
          success: false,
          status: 'error',
          message: `Erro na conexão: ${error.message || 'Erro desconhecido'}`
        };
      }
    }
  };

  // Testar upload de arquivo localmente sem depender da OpenAI
  const testUpload = async (file: File, purpose: string = 'test') => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      
      console.log(`Teste de upload: Iniciando com arquivo: ${file.name}, tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB, tipo: ${file.type}, propósito: ${purpose}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);
      
      // Uso do fetch com retries e timeout
      let retryCount = 0;
      const maxRetries = 3;
      const timeout = 60000; // 60 segundos
      
      // Função de tentativa de upload com retries
      const attemptUpload = async (): Promise<any> => {
        console.log(`Teste de upload: Tentativa ${retryCount + 1}/${maxRetries + 1}`);
        
        try {
          // Criar controller para timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          console.log('Teste de upload: Enviando requisição para API de teste via fetch...');
          
          const response = await fetch('/api/chatwitia/test-upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          
          // Limpar timeout
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Teste de upload: Resposta não-ok: ${response.status}`, errorData);
            throw new Error(`Erro de servidor: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log(`Teste de upload: Resposta recebida com status: ${response.status}`);
          console.log('Teste de upload: Concluído com sucesso:', data);
          
          return {
            success: true,
            status: response.status,
            data: data,
            file: {
              name: file.name,
              size: file.size,
              type: file.type
            }
          };
        } catch (error: any) {
          console.error(`Teste de upload: Erro na tentativa ${retryCount + 1}:`, error);
          
          // Se foi erro de timeout
          if (error.name === 'AbortError') {
            console.error('Teste de upload: Timeout atingido');
            throw new Error('Timeout ao fazer upload do arquivo');
          }
          
          // Se ainda temos tentativas
          if (retryCount < maxRetries) {
            retryCount++;
            const nextRetryDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            console.log(`Tentando novamente em ${(nextRetryDelay/1000).toFixed(1)}s...`);
            await new Promise(resolve => setTimeout(resolve, nextRetryDelay));
            return attemptUpload();
          }
          
          // Sem mais tentativas
          throw error;
        }
      };
      
      // Iniciar tentativas de upload
      return await attemptUpload();
    } catch (error: any) {
      console.error('Teste de upload: Erro final:', error);
      setFileError(error.message || 'Erro desconhecido no teste de upload');
      
      return {
        success: false,
        status: error.name === 'AbortError' ? 'timeout' : 'error',
        message: error.message || 'Erro desconhecido no teste de upload',
        file: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      };
    } finally {
      setIsFileLoading(false);
    }
  };
  
  return {
    messages,
    isLoading,
    error,
    model,
    currentSessionId,
    isFetchingSession,
    sendMessage,
    clearMessages,
    getAllChats,
    deleteChat,
    setModel,
    createChatSession,
    loadChatFromDB,
    // File handling
    files,
    isFileLoading,
    fileError,
    uploadFile,
    listFiles,
    getFile,
    getFileContent,
    deleteFile,
    editImage,
    createImageVariation,
    // Diagnóstico
    checkOpenApiConnection,
    checkApiConnection,
    testUpload
  };
} 