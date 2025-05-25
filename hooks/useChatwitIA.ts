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
  
  // OTIMIZAÇÃO ANTI-PISCAR AVANÇADA:
  // - Compara tamanho da última imagem parcial com a final
  // - Se similares (diferença < 10%), reutiliza a parcial para zero piscar
  // - Se diferentes, aplica transição suave com delay mínimo
  
  // Carregar chat do banco de dados quando o ID mudar
  useEffect(() => {
    if (chatId && authSession?.user) {
      // 🔧 CORREÇÃO: Só carregar do banco se não temos mensagens em memória
      // ou se o chatId mudou para uma sessão diferente da atual
      if (messages.length === 0 || chatId !== currentSessionId) {
        console.log(`📚 Carregando chat do banco: ${chatId} (mensagens atuais: ${messages.length})`);
        loadChatFromDB(chatId);
      } else {
        console.log(`✅ Chat ${chatId} já carregado em memória, mantendo estado atual`);
        // Apenas atualizar o currentSessionId se necessário
        if (currentSessionId !== chatId) {
          setCurrentSessionId(chatId);
        }
      }
    } else if (!chatId) {
      // Reset messages when no chatId is provided (new chat)
      console.log(`🔄 Resetando mensagens para novo chat`);
      setMessages([]);
      setCurrentSessionId(null);
    }
  }, [chatId, authSession?.user]); // 🔧 OTIMIZAÇÃO: Remover dependências desnecessárias

  // Carregar chat do banco de dados
  const loadChatFromDB = async (id: string) => {
    // 🔧 OTIMIZAÇÃO: Evitar carregamento duplicado
    if (isFetchingSession) {
      console.log(`⏭️ Já carregando sessão ${id}, pulando...`);
      return;
    }
    
    setIsFetchingSession(true);
    try {
      const response = await axios.get<ChatSessionResponse>(`/api/chatwitia/sessions/${id}`);
      const sessionData = response.data;
      
      // Converter as mensagens do formato do banco para o formato do hook
      const convertedMessages: Message[] = sessionData.messages.map(msg => {
        let content: MessageContent = msg.content;
        
        // Se for um tipo especial (áudio), converter para o formato apropriado
        if (msg.contentType === 'audio' && msg.audioData) {
          content = [{ type: 'audio', audio_data: msg.audioData }];
        } else if (msg.contentType === 'image' && msg.imageUrl) {
          // PARA MENSAGENS CARREGADAS DO BANCO: usar URLs do MinIO
          // (isso acontece apenas no reload da página, não durante streaming)
          
          // Verificar se o content já contém markdown de imagem
          const hasImageMarkdown = typeof msg.content === 'string' && 
                                 (msg.content.includes('![Imagem gerada]') || 
                                  msg.content.includes('!['));
          
          if (hasImageMarkdown) {
            // Se já tem markdown, manter o content original (pode ter URLs do MinIO)
            content = msg.content;
            console.log(`🖼️ Carregando do banco: Mantendo markdown existente`);
          } else {
            // Se não tem markdown, criar a partir da imageUrl do MinIO
            const baseContent = typeof msg.content === 'string' ? msg.content.trim() : '';
            content = baseContent ? 
              `${baseContent}\n\n![Imagem gerada](${msg.imageUrl})` : 
              `![Imagem gerada](${msg.imageUrl})`;
            console.log(`🖼️ Carregando do banco: Criando markdown com URL do MinIO`);
          }
        }
        
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content
        };
      });
      
      console.log(`📚 Carregadas ${convertedMessages.length} mensagens do banco para sessão ${id}`);
      console.log(`🖼️ Mensagens com imagens do MinIO:`, convertedMessages.filter(m => 
        typeof m.content === 'string' && m.content.includes('![Imagem gerada](https://')
      ).length);
      console.log(`🎨 Mensagens com imagens base64:`, convertedMessages.filter(m => 
        typeof m.content === 'string' && m.content.includes('![Imagem gerada](data:image/')
      ).length);
      
      // 🔧 CORREÇÃO: Só atualizar mensagens se realmente mudaram
      const shouldUpdateMessages = messages.length === 0 || 
                                  messages.length !== convertedMessages.length ||
                                  currentSessionId !== id;
      
      if (shouldUpdateMessages) {
        console.log(`📝 Atualizando mensagens do banco (${convertedMessages.length} mensagens)`);
        setMessages(convertedMessages);
        setModel(sessionData.model);
        setCurrentSessionId(id);
      } else {
        console.log(`✅ Mensagens já estão sincronizadas, mantendo estado atual`);
        // Apenas atualizar o modelo e sessionId se necessário
        if (model !== sessionData.model) {
          setModel(sessionData.model);
        }
        if (currentSessionId !== id) {
          setCurrentSessionId(id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar chat do banco:', err);
      setError('Não foi possível carregar a conversa.');
      // 🔧 CORREÇÃO: Só limpar mensagens se realmente houve erro e não temos conteúdo válido
      if (messages.length === 0) {
        setMessages([]);
      }
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

  const sendMessage = async (content: string, systemPrompt?: string, modelParam?: string) => {
    if (isLoading) return;
    
    // Validar entrada
    if (!content?.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Use o modelo especificado ou o padrão
      const modelToUse = modelParam || model || 'gpt-4o-latest';
      
      // Adicionar mensagem do usuário ao estado
      const userMessage: Message = {
        role: 'user',
        content
      };
      
      // Detectar se é refinamento de imagem e temos um response ID anterior
      const isRefinement = isImageRefinementPrompt(content);
      const shouldUseMultiTurn = isRefinement && 
                               lastResponseId && 
                               messages.length > 0 && 
                               messages[messages.length - 1].role === 'assistant';
      
      if (shouldUseMultiTurn) {
        console.log(`🔗 Detectado refinamento de imagem, usando multi-turn com response ID: ${lastResponseId}`);
      }
      
      setMessages(prev => [...prev, userMessage]);
      
      // Salvar a mensagem do usuário no banco de dados
      if (currentSessionId) {
        try {
          await saveChatMessageToDB(currentSessionId, userMessage);
        } catch (saveError) {
          console.error('Erro ao salvar mensagem do usuário:', saveError);
        }
      }
      
      // 🔧 CORREÇÃO: Adicionar apenas UMA mensagem do assistente para streaming
      const assistantPlaceholder: Message = {
        role: 'assistant',
        content: ''
      };
      
      setMessages(prev => [...prev, assistantPlaceholder]);
      
      // Preparar payload
      const payload: any = {
        messages: [...messages, userMessage],
        model: modelToUse,
        stream: true,
        sessionId: currentSessionId,
        systemPrompt
      };
      
      // Adicionar previousResponseId se for refinamento
      if (shouldUseMultiTurn) {
        payload.previousResponseId = lastResponseId;
      }
      
      // For visualizing what we're sending to the API for debugging
      console.log('Sending messages to API:', payload);

      // If the content contains file references, we need to include them in the API request
      if (typeof content === 'string') {
        // Try to extract file IDs from the content
        const fileIdRegex = /file_id:([a-zA-Z0-9_-]+)/g;
        const matches = [...content.matchAll(fileIdRegex)];
        
        const fileIds = matches.map(match => match[1]);
        
        // Include fileIds in the API request if any were found
        if (fileIds.length > 0) {
          payload.fileIds = fileIds;
          console.log(`Found ${fileIds.length} file references in message:`, fileIds);
        }
      }
      
      // Array para armazenar imagens geradas e parciais
      let generatedImages: any[] = [];
      let partialImages: { [key: string]: string } = {};
      let lastPartialImage: string = ''; // Armazenar a última imagem parcial
      
      // Flag para evitar atualizações após done (movida para fora do try/catch)
      let isStreamComplete = false;
      
      // Function to update messages with throttling
      const updateMessageWithStream = (content: string, images: any[] = [], partialImageData?: { index: number, base64: string }) => {
        // Não atualizar se o stream já foi concluído
        if (isStreamComplete) {
          console.log('🚫 Stream já concluído, ignorando atualização:', content.substring(0, 50) + '...');
          return;
        }
        
        console.log('✅ Processando atualização:', content.substring(0, 50) + '...', 'Images:', images.length);
        
        // Clear any pending update
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Schedule an update with 50ms delay to prevent too many renders
        updateTimeoutRef.current = setTimeout(() => {
          // Verificar novamente se não foi concluído no intervalo
          if (isStreamComplete) {
            console.log('🚫 Stream concluído durante timeout, ignorando atualização');
            return;
          }
          
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastIndex = updatedMessages.length - 1;
            
            if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
              // 🔧 CORREÇÃO: Simplificar lógica - sempre atualizar quando temos imagens finais
              const currentContent = updatedMessages[lastIndex].content as string;
              
              // Limpar conteúdo de status antigo
              let cleanContent = content.replace(/🎨 Gerando imagem\.\.\.(\s*\(progresso\))?/g, '').trim();
              
              // Se temos imagens finais, remover também as imagens parciais
              if (images.length > 0) {
                cleanContent = cleanContent.replace(/\n\n!\[Gerando imagem\.\.\.\]\(data:image\/png;base64,[^)]+\)/g, '');
                console.log('🧹 Removendo imagens parciais, adicionando imagens finais');
              }
              
              // Construir conteúdo final
              let messageContent = cleanContent;
              
              // Add partial image if available (durante a geração) - APENAS se não temos imagens finais
              if (partialImageData && images.length === 0) {
                const partialImageContent = `\n\n![Gerando imagem...](data:image/png;base64,${partialImageData.base64})`;
                messageContent += partialImageContent;
                console.log('🎨 Adicionando imagem parcial');
              }
              
              // Add completed images to the message content if any
              // PRIORIZAR SEMPRE image_data (base64) sobre image_url (MinIO)
              if (images.length > 0) {
                const imageContent = images.map(img => {
                  // 🔧 CORREÇÃO: Priorizar image_data (base64) para evitar "piscar" da imagem
                  let imageUrl;
                  if (img.image_data && img.image_data.startsWith('data:image/')) {
                    // Se temos dados base64 completos, usar eles
                    imageUrl = img.image_data;
                    console.log('🎨 Usando image_data (base64) completo');
                  } else if (img.image_data && !img.image_data.startsWith('data:image/')) {
                    // Se temos dados base64 sem prefixo, adicionar prefixo
                    imageUrl = `data:image/png;base64,${img.image_data}`;
                    console.log('🎨 Usando image_data (base64) com prefixo adicionado');
                  } else {
                    // Fallback para URL do MinIO apenas se não temos base64
                    imageUrl = img.image_url || img.thumbnail_url;
                    console.log('🔗 Fallback para image_url (MinIO)');
                  }
                  
                  return `\n\n![Imagem gerada](${imageUrl})`;
                }).join('');
                messageContent += imageContent;
                
                console.log(`🖼️ Adicionando ${images.length} imagem(ns) final(is) ao conteúdo da mensagem`);
                console.log(`📝 Conteúdo final da mensagem: ${messageContent.substring(0, 100)}...`);
              }
              
              updatedMessages[lastIndex] = {
                ...updatedMessages[lastIndex],
                content: messageContent
              };
            }
            return updatedMessages;
          });
        }, 50);
      };
      
      // Make API call with streaming enabled
      const response = await fetch('/api/chatwitia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      
      // Buffer para reconstruir JSONs quebrados
      let jsonBuffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream complete');
          
          // Marcar stream como completo IMEDIATAMENTE
          isStreamComplete = true;
          
          // Se o stream já foi marcado como completo por 'done', não fazer mais atualizações
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          // Update the final message - APENAS se não tiver imagens finais
          setMessages(prev => {
            const updatedMessages = [...prev];
            const lastIndex = updatedMessages.length - 1;
            if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
              const currentContent = updatedMessages[lastIndex].content as string;
              const hasFinalImages = currentContent && currentContent.includes('![Imagem gerada](data:image/png;base64,');
              const hasMinIOImages = currentContent && currentContent.includes('![Imagem gerada](https://');
              
              console.log(`🔍 Stream done - Análise final:`);
              console.log(`   - Tem imagens base64: ${hasFinalImages}`);
              console.log(`   - Tem imagens MinIO: ${hasMinIOImages}`);
              console.log(`   - Conteúdo atual: ${currentContent.substring(0, 150)}...`);
              
              if (hasFinalImages || hasMinIOImages) {
                console.log('✅ Mensagem já contém imagens finais, mantendo conteúdo atual');
                // Não sobrescrever - manter o conteúdo atual que já tem as imagens
              } else {
                console.log('📝 Finalizando com conteúdo final do stream (sem imagens)');
                console.log(`📝 Conteúdo do streamContentRef: ${streamContentRef.current.substring(0, 150)}...`);
                updatedMessages[lastIndex] = {
                  ...updatedMessages[lastIndex],
                  content: streamContentRef.current
                };
              }
            }
            return updatedMessages;
          });
          
          break;
        }
        
        // Decode the received chunk
        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
        
        // Adicionar ao buffer
        jsonBuffer += chunk;
        
        // Tentar processar linhas completas
        const lines = jsonBuffer.split('\n');
        
        // Manter a última linha no buffer se não terminar com \n
        if (!jsonBuffer.endsWith('\n')) {
          jsonBuffer = lines.pop() || '';
        } else {
          jsonBuffer = '';
        }
        
        // Process each complete line
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            console.log('Processing line:', line.substring(0, 100) + (line.length > 100 ? '...' : ''));
            
            // Verificar se a linha parece ser JSON válido
            if (!line.startsWith('{') && !line.startsWith('[')) {
              console.log('Linha não parece ser JSON, ignorando:', line.substring(0, 50));
              continue;
            }
            
            // Verificar se o JSON está completo (heurística mais avançada)
            let isCompleteJson = false;
            try {
              // Tentar parsear diretamente
              JSON.parse(line);
              isCompleteJson = true;
            } catch (parseError) {
              // Se falhou, verificar se é um JSON incompleto
              const openBraces = (line.match(/\{/g) || []).length;
              const closeBraces = (line.match(/\}/g) || []).length;
              const openBrackets = (line.match(/\[/g) || []).length;
              const closeBrackets = (line.match(/\]/g) || []).length;
              
              // Se as chaves/colchetes não estão balanceados, é incompleto
              if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
                console.log('JSON incompleto detectado (chaves desbalanceadas), adicionando ao buffer');
                jsonBuffer = line + '\n' + jsonBuffer;
                continue;
              }
              
              // Verificar se termina abruptamente (strings não fechadas)
              const lastChar = line.trim().slice(-1);
              if (lastChar !== '}' && lastChar !== ']') {
                console.log('JSON incompleto detectado (não termina corretamente), adicionando ao buffer');
                jsonBuffer = line + '\n' + jsonBuffer;
                continue;
              }
              
              // Se chegou aqui, pode ser um erro de parsing real
              console.log('Erro real de parsing JSON:', parseError instanceof Error ? parseError.message : 'Erro desconhecido');
              continue;
            }
            
            // Se chegou aqui, o JSON é válido
            const data = JSON.parse(line);
            console.log('Parsed data:', data);
            
            if (data.type === 'chunk') {
              // Update the streamed content with the new chunk
              streamContentRef.current += data.content;
              console.log('Updated content:', streamContentRef.current);
              
              // Update the UI with throttling
              updateMessageWithStream(streamContentRef.current, generatedImages);
            } else if (data.type === 'image_generated') {
              // Handle image generation events
              console.log('Image generated:', data);
              
              // 🔧 CORREÇÃO: Sempre usar a imagem final para garantir renderização correta
              const imageData = {
                id: data.image_id,
                image_data: data.image_data, // Sempre usar a imagem final
                image_url: data.image_url,
                thumbnail_url: data.thumbnail_url,
                revised_prompt: data.revised_prompt
              };
              
              generatedImages.push(imageData);
              
              // Limpar o conteúdo de status/parcial
              let cleanContent = streamContentRef.current
                .replace(/🎨 Gerando imagem\.\.\.(\s*\(progresso\))?/g, '')
                .replace(/\n\n!\[Gerando imagem\.\.\.\]\(data:image\/png;base64,[^)]+\)/g, '')
                .trim();
              
              streamContentRef.current = cleanContent;
              
              console.log(`🖼️ Imagem final gerada: ${imageData.image_url || 'base64 data'}`);
              console.log(`🧹 Conteúdo limpo: ${cleanContent.substring(0, 50)}...`);
              
              // 🔧 CORREÇÃO: Atualizar imediatamente sem delay para garantir renderização
              updateMessageWithStream(streamContentRef.current, generatedImages);
            } else if (data.type === 'image_generation_started') {
              // Handle image generation started
              console.log('Image generation started');
              
              // Add a placeholder message
              streamContentRef.current += '\n\n🎨 Gerando imagem...';
              updateMessageWithStream(streamContentRef.current, generatedImages);
            } else if (data.type === 'partial_image') {
              // Handle partial image streaming
              console.log('Partial image received:', data.index);
              
              // Store the partial image
              partialImages[data.index] = data.image_data;
              
              // Armazenar a última imagem parcial para comparação
              lastPartialImage = data.image_data;
              
              // Show the most recent partial image
              const partialImageData = {
                index: data.index,
                base64: data.image_data
              };
              
              // Update status with partial image
              const lastContent = streamContentRef.current.replace('🎨 Gerando imagem...', '🎨 Gerando imagem... (progresso)');
              streamContentRef.current = lastContent;
              updateMessageWithStream(streamContentRef.current, generatedImages, partialImageData);
            } else if (data.type === 'done') {
              console.log('✅ Processamento completo');
              
              // Marcar stream como completo para evitar atualizações futuras
              isStreamComplete = true;
              
              // Capturar response_id para multi-turn image generation
              if (data.response_id) {
                console.log(`💾 Salvando response ID para multi-turn: ${data.response_id}`);
                setLastResponseId(data.response_id);
              }
              
              // Final content - should already be accumulated
              const finalResponse = data.response;
              
              // Update messages with final response - PRESERVAR IMAGENS
              setMessages(prevMessages => {
                const newMessages = [...prevMessages];
                const lastMessage = newMessages[newMessages.length - 1];
                
                if (lastMessage && lastMessage.role === 'assistant') {
                  // Se a mensagem atual já contém imagens FINAIS (URLs), preservar SEMPRE
                  const currentContent = lastMessage.content as string;
                  const hasFinalImages = currentContent && currentContent.includes('![Imagem gerada](https://');
                  const hasPartialImages = currentContent && currentContent.includes('![Gerando imagem...](data:image/png;base64');
                  
                  console.log(`🔍 Análise do conteúdo atual:`);
                  console.log(`   - Tem imagens finais: ${hasFinalImages}`);
                  console.log(`   - Tem imagens parciais: ${hasPartialImages}`);
                  console.log(`   - Conteúdo: ${currentContent.substring(0, 100)}...`);
                  
                  if (hasFinalImages) {
                    // Se já tem imagens finais, SEMPRE preservar o conteúdo atual
                    console.log(`✅ Preservando conteúdo com imagens finais - NÃO sobrescrever`);
                    // Não fazer nada - manter o conteúdo atual
                  } else {
                    // Se não tem imagens finais, usar o conteúdo final
                    const finalContent = finalResponse?.content || streamContentRef.current;
                    console.log(`📝 Atualizando com conteúdo final: ${finalContent.substring(0, 100)}...`);
                    lastMessage.content = finalContent;
                  }
                  
                  // Limpar qualquer flag de loading
                  delete (lastMessage as any).isLoading;
                  
                  return newMessages;
                }
                return prevMessages;
              });
              
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing streaming data:', e, 'Line:', line);
          }
        }
      }
    } catch (err: any) {
      console.error('Error in chat:', err);
      setError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
      
      // Cancelar timeouts pendentes em caso de erro
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
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
  
  // Estado para multi-turn image generation
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);
  
  // Função para detectar se a mensagem é um refinamento de imagem
  const isImageRefinementPrompt = (message: string): boolean => {
    const refinementKeywords = [
      'agora', 'mais realista', 'realista', 'mais realistca', 'torne', 'faça',
      'modifique', 'mude', 'altere', 'transforme', 'ajuste',
      'melhor qualidade', 'alta resolução', 'maior resolução',
      'mais detalhes', 'mais cores', 'colorido', 'preto e branco',
      'estilo', 'cartoon', 'anime', 'fotográfico', 'pintura',
      'background diferente', 'fundo diferente', 'sem fundo',
      'maior', 'menor', 'rotacione', 'vire', 'inverta'
    ];
    
    const lowerMessage = message.toLowerCase();
    return refinementKeywords.some(keyword => lowerMessage.includes(keyword));
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
    testUpload,
    lastResponseId
  };
} 