//revidado por min

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Message } from '@/hooks/useChatwitIA';
import { auth } from "@/auth";
import { db } from "@/lib/db";
// @ts-ignore - Adding Anthropic SDK
import Anthropic from '@anthropic-ai/sdk';

// Declare the global latestOSeriesModels variable type
declare global {
  var latestOSeriesModels: Record<string, string>;
}

// Change to Node.js runtime to support Prisma
export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Função para lidar com a requisição para a API do OpenAI, agora suportando documentos
const formatAndSendToOpenAI = async (messages: any[], modelToUse: string) => {
  // Converter as mensagens para o formato esperado pela API do OpenAI
  const formattedMessages = messages.map((message: any) => {
    let content = message.content;
    
    // Se o conteúdo for um array, formatar conforme o tipo
    if (Array.isArray(content)) {
      const audioContent = content.find(item => item.type === 'audio' && item.audio_data);
      const imageContent = content.find(item => item.type === 'image' && item.image_url);
      const textContent = content.find(item => item.type === 'text' && item.text);
      const documentContent = content.find(item => item.type === 'document' && item.file_content);
      
      if (audioContent) {
        return {
          role: message.role,
          content: [
            {
              type: "audio",
              audio_data: audioContent.audio_data
            }
          ]
        };
      } else if (imageContent) {
        return {
          role: message.role,
          content: imageContent.image_url
        };
      } else if (documentContent) {
        // Para documentos, usamos o texto do documento como mensagem
        return {
          role: message.role,
          content: documentContent.text || `[Documento: ${documentContent.file_name}]`
        };
      } else if (textContent) {
        return {
          role: message.role,
          content: textContent.text
        };
      }
    }
    
    // Se for uma string, usar diretamente
    return {
      role: message.role,
      content: content
    };
  });

  // Construir a URL da API
  const API_URL = "https://api.openai.com/v1/chat/completions";
  
  // Fazer a requisição para a API do OpenAI
  return fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: formattedMessages,
      temperature: 0.7,
      top_p: 1,
      stream: false,
    }),
  });
};

export async function POST(req: Request) {
  try {
    const { messages, model = 'gpt-4o-latest', sessionId, generateSummary = false, document, stream = false, fileIds = [] } = await req.json();

    console.log(`Recebida requisição para o modelo: ${model}`);
    console.log(`Sessão ID: ${sessionId || 'nova sessão'}`);
    console.log(`Número de mensagens: ${messages?.length || 0}`);
    console.log(`Streaming habilitado: ${stream}`);
    if (fileIds.length > 0) {
      console.log(`Arquivos referenciados: ${fileIds.length} (${fileIds.join(', ')})`);
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Mensagens inválidas' },
        { status: 400 }
      );
    }

    // Verifica se é um modelo Anthropic/Claude
    const isClaudeModel = model.includes('claude');

    // Verifica se há conteúdo de áudio nas mensagens
    const hasAudioContent = messages.some((msg: any) => {
      if (Array.isArray(msg.content)) {
        return msg.content.some((item: any) => item.type === 'audio' && item.audio_data);
      }
      return false;
    });

    // Se tiver conteúdo de áudio, usar o modelo de áudio automaticamente (somente para OpenAI)
    let modelToUse = hasAudioContent && !isClaudeModel ? 'gpt-4o-audio-preview' : model;
    
    // Para modelos da família GPT-4o ou modelos com sufixo -o, garantir que usamos a responses.create API
    // quando temos arquivos anexados
    const isFileCompatibleModel = modelToUse === 'gpt-4o' || 
                                modelToUse.includes('gpt-4o') || 
                                modelToUse.includes('-o') ||
                                modelToUse.startsWith('o');
                                
    if (fileIds.length > 0 && !isFileCompatibleModel) {
      console.log('Arquivos detectados, forçando upgrade para modelo gpt-4o que suporta arquivos');
      modelToUse = 'gpt-4o-latest';
    }

    // Verifique se temos um documento para processar
    if (document) {
      // Exemplo: extrair texto do documento e adicionar ao contexto
      const documentText = document.content;
      
      // Adicionar o conteúdo do documento como contexto para o modelo
      const documentSystemMessage = {
        role: "system",
        content: `O usuário enviou um documento chamado "${document.name}". Aqui está o conteúdo do documento:\n\n${documentText}\n\nPor favor, considere este documento ao responder.`
      };
      
      // Adicionar mensagem de sistema adicional com o conteúdo do documento
      messages.push(documentSystemMessage);
    }

    // Determinar qual handler usar com base no modelo
    let aiResponse;
    if (isClaudeModel) {
      aiResponse = await handleAnthropicRequest(messages, modelToUse);
    } else {
      // Passar fileIds para o handler da OpenAI quando presentes
      aiResponse = await handleOpenAIRequest(messages, modelToUse, sessionId, fileIds);
    }
    
    // Se o streaming estiver habilitado, retorne diretamente a resposta
    if (stream) {
      return aiResponse;
    }
    
    // Se precisamos gerar um resumo para o título do chat e temos um ID de sessão válido
    if (generateSummary && sessionId) {
      const session = await auth();
      if (session?.user?.id) {
        try {
          // Verificar se a sessão pertence ao usuário
          const chatSession = await db.chatSession.findUnique({
            where: {
              id: sessionId,
              userId: session.user.id
            }
          });
          
          if (chatSession) {
            // Encontrar a primeira mensagem do usuário
            const firstUserMessage = messages.find(m => m.role === 'user');
            if (firstUserMessage) {
              // Extrair as primeiras palavras da mensagem (até 5 palavras)
              let content = '';
              if (typeof firstUserMessage.content === 'string') {
                content = firstUserMessage.content;
              } else if (Array.isArray(firstUserMessage.content)) {
                const textContent = firstUserMessage.content.find((item: any) => item.type === 'text' && item.text);
                content = textContent ? textContent.text : "[Conteúdo não textual]";
              }
              
              // Pegar as primeiras 5 palavras e adicionar reticências se necessário
              const words = content.split(/\s+/).filter(Boolean);
              const summary = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
              
              // Atualizar o título da sessão no banco de dados
              await db.chatSession.update({
                where: { id: sessionId },
                data: { 
                  title: summary,
                  summary: summary
                }
              });
              
              // Extrair os dados da resposta (já em formato JSON)
              const responseData = await aiResponse.json();
              
              // Incluir o resumo na resposta
              return NextResponse.json({ 
                response: responseData.response,
                summary 
              });
            }
          }
        } catch (error) {
          console.error("Erro ao gerar resumo:", error);
          // Se falhar o resumo, retornar apenas a resposta
        }
      }
    }
    
    return aiResponse;
  } catch (error) {
    console.error('ChatwitIA error:', error);
    return NextResponse.json(
      { error: 'Erro no processamento da solicitação' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Buscar lista de modelos disponíveis na API da OpenAI
    const modelsList = await openai.models.list();
    
    //console.log('Total de modelos encontrados na API da OpenAI:', modelsList.data.length);
    
    // Organizar modelos por categoria, sem filtrar nenhum
    const categorizedModels: {
      gpt4o: any[];
      gpt4: any[];
      gpt3: any[];
      oSeries: any[];
      embedding: any[];
      audio: any[];
      image: any[];
      other: any[];
      claude?: any[];
    } = {
      gpt4o: modelsList.data.filter(m => m.id.includes('gpt-4o')),
      gpt4: modelsList.data.filter(m => m.id.includes('gpt-4') && !m.id.includes('gpt-4o')),
      gpt3: modelsList.data.filter(m => m.id.includes('gpt-3')),
      oSeries: modelsList.data.filter(m => /^o[1-9]/.test(m.id)),
      embedding: modelsList.data.filter(m => m.id.includes('text-embedding')),
      audio: modelsList.data.filter(m => m.id.includes('whisper')),
      image: modelsList.data.filter(m => m.id.includes('dall-e')),
      other: modelsList.data.filter(m => {
        return !m.id.includes('gpt') && 
               !m.id.startsWith('o1') && 
               !m.id.startsWith('o3') && 
               !m.id.startsWith('o4') && 
               !m.id.includes('text-embedding') &&
               !m.id.includes('whisper') &&
               !m.id.includes('dall-e');
      })
    };
    
    // Criar um mapa para armazenar as versões mais recentes dos modelos da série O
    global.latestOSeriesModels = {};
    
    // Função para extrair a data de um ID de modelo (ex: o1-2024-12-17 -> 2024-12-17)
    const extractDate = (modelId: string): string | null => {
      const match = modelId.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    };
    
    // Para cada tipo de modelo da série O, encontrar a versão mais recente disponível
    const oModelTypes = ['o1', 'o1-mini', 'o1-pro', 'o1-preview', 'o4-mini'];
    oModelTypes.forEach(baseModel => {
      // Filtrar modelos que começam com o tipo base (ex: todos os modelos 'o1-mini-*')
      const modelsOfType = categorizedModels.oSeries.filter(m => 
        m.id === baseModel || m.id.startsWith(`${baseModel}-`)
      );
      
      if (modelsOfType.length > 0) {
        // Ordenar por data (mais recente primeiro)
        modelsOfType.sort((a, b) => {
          const dateA = extractDate(a.id);
          const dateB = extractDate(b.id);
          
          // Se não tem data, coloca por último
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          // Comparar datas (mais recente primeiro)
          return dateB.localeCompare(dateA);
        });
        
        // Armazenar o modelo mais recente no mapa global
        global.latestOSeriesModels[baseModel] = modelsOfType[0].id;
        //console.log(`Modelo mais recente para ${baseModel}: ${modelsOfType[0].id}`);
      } else {
        //console.log(`Nenhum modelo disponível para ${baseModel}`);
      }
    });
    
    // Buscar modelos da Anthropic
    let anthropicModels: any[] = [];
    try {
      const anthropicModelsList = await anthropic.models.list();
      //console.log('Total de modelos encontrados na API da Anthropic:', anthropicModelsList.data.length);
      //console.log('Modelos Anthropic disponíveis:', anthropicModelsList.data.map((m: any) => m.id));
      
      anthropicModels = anthropicModelsList.data;
      
      // Adicionar modelos Anthropic às categorias
      categorizedModels.claude = anthropicModels;
    } catch (anthropicError) {
      console.error('Erro ao buscar modelos da Anthropic:', anthropicError);
    }
    
    // Imprimir todos os modelos para debug
   // console.log('Todos os modelos disponíveis:', modelsList.data.map(m => m.id));
    //console.log('Modelos O Series:', modelsList.data.filter(m => /^o[1-9]/.test(m.id)).map(m => m.id));
    
    return NextResponse.json({
      success: true,
      models: categorizedModels,
      allModels: [...modelsList.data, ...anthropicModels]
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Falha ao obter modelos disponíveis', success: false },
      { status: 500 }
    );
  }
}

// Função para processar requisições para a API do OpenAI, agora suportando streaming
async function handleOpenAIRequest(messages: Message[], model: string, sessionId?: string, fileIds: string[] = []) {
  try {
    // Verificar se é um modelo Claude (não deveria chegar aqui, mas por segurança)
    if (model.includes('claude')) {
      throw new Error('Modelo Claude não pode ser processado pelo handler OpenAI');
    }
    
    // Preparar o modelo correto para a API da OpenAI
    let openaiModel = model;
    
    // Transformar os nomes amigáveis em identificadores corretos da API
    // GPT-4.1 Series
    if (model === 'gpt-4.1') openaiModel = 'gpt-4-0125-preview';
    if (model === 'gpt-4.1-latest') openaiModel = 'gpt-4.1-2025-04-14';
    if (model === 'gpt-4.1-mini-latest') openaiModel = 'gpt-4.1-mini-2025-04-14';
    if (model === 'gpt-4.1-nano-latest') openaiModel = 'gpt-4.1-nano-2025-04-14';
    // Para suporte a nomes sem o sufixo -latest
    if (model === 'gpt-4.1 Nano') openaiModel = 'gpt-4.1-nano-2025-04-14';
    if (model === 'GPT-4.1 Nano') openaiModel = 'gpt-4.1-nano-2025-04-14';
    if (model === 'gpt-4.5-preview-latest') openaiModel = 'gpt-4.5-preview-2025-02-27';
    
    // GPT-4o Series
    if (model === 'gpt-4o') openaiModel = 'gpt-4o-2024-05-13';
    if (model === 'gpt-4o-mini') openaiModel = 'gpt-4o-mini-2024-07-18';
    if (model === 'gpt-4o-mini-latest') openaiModel = 'gpt-4o-mini-2024-07-18';
    if (model === 'gpt-4o-audio-preview') openaiModel = 'gpt-4o-2024-05-13'; // Usar o GPT-4o mais recente com suporte a áudio
    if (model === 'chatgpt-4o-latest') openaiModel = 'chatgpt-4o-latest'; // Usar GPT-4o mais recente
    if (model === 'ChatGPT 4o') openaiModel = 'gpt-4o-2024-08-06'; // Interface mostra este nome
    if (model === 'gpt-4o-audio-preview-latest') openaiModel = 'gpt-4o-audio-preview-2024-12-17';
    if (model === 'gpt-4o-realtime-preview-latest') openaiModel = 'gpt-4o-realtime-preview-2024-12-17';
    if (model === 'gpt-4o-mini-audio-preview-latest') openaiModel = 'gpt-4o-mini-audio-preview-2024-12-17';
    if (model === 'gpt-4o-mini-realtime-preview-latest') openaiModel = 'gpt-4o-mini-realtime-preview-2024-12-17';
    if (model === 'gpt-4o-search-preview-latest') openaiModel = 'gpt-4o-search-preview-2025-03-11';
    if (model === 'gpt-4o-mini-search-preview-latest') openaiModel = 'gpt-4o-mini-search-preview-2025-03-11';
    
    // Mapeamento direto para O series usando fetch e busca ativa para garantir sempre usar a versão com data
    // Extrair tipo base do modelo (o1, o1-mini, o4-mini, etc.)
    const isOModel = model.match(/^(o\d+)(-[a-z]+)?$/);
    if (isOModel) {
      try {
        const baseModel = model.includes('-') ? model : `${model}`; // Se já tem sufixo como -mini, usar como está
        
        // Tentar buscar a lista de modelos disponíveis diretamente
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filtrar modelos que correspondem ao tipo base (o1, o1-mini, etc.)
          const matchingModels = data.data.filter((m: any) => 
            (m.id === baseModel || m.id.startsWith(`${baseModel}-`))
          );
          
          if (matchingModels.length > 0) {
            // Extrair data (YYYY-MM-DD) dos modelos
            const modelsWithDates = matchingModels.map((m: any) => {
              const dateMatch = m.id.match(/(\d{4}-\d{2}-\d{2})/);
              return {
                id: m.id,
                date: dateMatch ? dateMatch[1] : null
              };
            });
            
            // Filtrar apenas modelos com data
            const datedModels = modelsWithDates.filter((m: any) => m.date !== null);
            
            if (datedModels.length > 0) {
              // Ordenar por data (mais recente primeiro)
              datedModels.sort((a: any, b: any) => b.date.localeCompare(a.date));
              
              // Usar o modelo mais recente
              openaiModel = datedModels[0].id;
              console.log(`Modelo selecionado para ${baseModel}: ${openaiModel} (mais recente)`);
            } else {
              // Nenhum modelo com data encontrado, usar o modelo base
              console.log(`Nenhum modelo com data encontrado para ${baseModel}, usando modelo base`);
            }
          } else {
            console.log(`Nenhum modelo encontrado para ${baseModel}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar modelo dinâmico para ${model}:`, error);
        // Em caso de erro, continuar usando o modelo original
      }
    }
    
    // Usar mapeamento de fallback do cache global se o fetch direto falhar
    if (openaiModel === model) {
      // Fallback para versões em cache global
      if ((model === 'o1' || model === 'o1-latest') && global.latestOSeriesModels?.['o1']) {
        openaiModel = global.latestOSeriesModels['o1'];
      } else if ((model === 'o1-mini' || model === 'o1-mini-latest') && global.latestOSeriesModels?.['o1-mini']) {
        openaiModel = global.latestOSeriesModels['o1-mini'];
      } else if ((model === 'o1-pro' || model === 'o1-pro-latest') && global.latestOSeriesModels?.['o1-pro']) {
        openaiModel = global.latestOSeriesModels['o1-pro'];
      } else if ((model === 'o1-preview' || model === 'o1-preview-latest') && global.latestOSeriesModels?.['o1-preview']) {
        openaiModel = global.latestOSeriesModels['o1-preview'];
      } else if ((model === 'o4-mini' || model === 'o4-mini-latest' || model === 'o4-mini-high') && global.latestOSeriesModels?.['o4-mini']) {
        openaiModel = global.latestOSeriesModels['o4-mini'];
      }
    }
    
    // Aliases para garantir compatibilidade com diferentes nomes de exibição
    if (model.startsWith('GPT-')) openaiModel = model.replace('GPT-', 'gpt-');
    if (model === 'ChatGPT 4o') openaiModel = 'gpt-4o-2024-08-06';
    if (model === 'ChatGPT-4o') openaiModel = 'gpt-4o-2024-08-06';
    if (model === 'ChatGPT 4') openaiModel = 'gpt-4-turbo-2024-04-09';
    if (model === 'GPT 4o') openaiModel = 'gpt-4o-2024-08-06';
    if (model === 'GPT 4') openaiModel = 'gpt-4-turbo-2024-04-09';
    if (model === 'GPT-4o') openaiModel = 'gpt-4o-2024-08-06';
    
    // Verificar se o modelo é da família O
    const isOSeriesModel = openaiModel.startsWith('o') || model.startsWith('o');
    
    console.log(`Enviando requisição para OpenAI, modelo original: ${model}, modelo mapeado: ${openaiModel}`);
    
    // Converter as mensagens para o formato esperado pela API OpenAI
    const formattedMessages = messages.map(message => {
      let content = message.content;
      
      // Se o conteúdo for um array, processar de acordo com o tipo
      if (Array.isArray(content)) {
        const audioContent = content.find(item => item.type === 'audio' && item.audio_data);
        const imageContent = content.find(item => item.type === 'image' && item.image_url);
        const textContent = content.find(item => item.type === 'text' && item.text);
        
        if (audioContent) {
          return {
            role: message.role,
            content: [
              {
                type: "audio",
                audio_data: audioContent.audio_data
              }
            ]
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
    
    // Verificar se temos arquivos anexados e estamos usando modelo compatível com responses.create
    const canUseResponsesApi = 
      (openaiModel === 'gpt-4o' || 
       openaiModel.includes('gpt-4o') || 
       openaiModel.includes('-o') ||
       openaiModel.startsWith('o')) && 
      fileIds.length > 0;
       
    if (canUseResponsesApi) {
      console.log(`Usando responses.create API para processar ${fileIds.length} arquivos`);
      
      // Extrair a última mensagem do usuário para usar como prompt
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      let userContent = '';
      let imageUrls: string[] = [];
      
      if (lastUserMessage) {
        if (typeof lastUserMessage.content === 'string') {
          // Extrair URLs de imagens se presentes no formato especial
          const imageJsonMatch = lastUserMessage.content.match(/<!-- IMAGES_JSON (.*?) -->/);
          
          if (imageJsonMatch && imageJsonMatch[1]) {
            try {
              const imageData = JSON.parse(imageJsonMatch[1]);
              imageUrls = imageData.map((img: any) => img.url);
              // Remover o bloco de JSON das imagens do conteúdo
              userContent = lastUserMessage.content.replace(/<!-- IMAGES_JSON .*? -->/g, '').trim();
            } catch (e) {
              console.error('Erro ao processar JSON de imagens:', e);
            }
          } else {
            // Se não houver imagens, apenas remover referências de arquivos
            userContent = lastUserMessage.content.replace(/\[.*?\]\(file_id:.*?\)/g, '').trim();
          }
        } else if (Array.isArray(lastUserMessage.content)) {
          const textItem = lastUserMessage.content.find(item => item.type === 'text');
          if (textItem && textItem.text) {
            userContent = textItem.text;
          }
        }
      }
      
      // Se não tiver conteúdo, usar uma instrução genérica
      const promptText = userContent || "Analise o conteúdo deste arquivo.";
      
      // Preparar o conteúdo com os file_ids para o formato responses.create
      const content: any[] = [
        { type: "input_text", text: promptText }
      ];
      
      // Adicionar cada arquivo como um item separado no content
      fileIds.forEach(fileId => {
        content.push({ type: "input_file", file_id: fileId });
      });
      
      // Adicionar URLs de imagem diretamente, se presentes
      imageUrls.forEach(imageUrl => {
        content.push({ 
          type: "input_image", 
          image_url: { url: imageUrl },
          detail: "high"
        });
      });
      
      // Configurar a stream para retornar os dados de volta ao cliente
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Iniciar o processamento em segundo plano
      (async () => {
        try {
          console.log(`Iniciando processamento de ${fileIds.length} arquivos com modelo ${openaiModel}`);
          
          // Tentar primeiro com streaming
          try {
            // Fazer a chamada para a API responses.create com streaming
            const streamOptions: any = {
              model: openaiModel,
              input: [
                {
                  role: "user",
                  content
                }
              ],
              stream: true
            };
            
            // Adicionar temperatura com valor adequado para cada tipo de modelo
            if (openaiModel.startsWith('o')) {
              streamOptions.temperature = 1;
            } else {
              streamOptions.temperature = 0.7;
            }
            
            const streamResponse = await openai.responses.create(streamOptions);
            
            let fullContent = '';
            let hasReceivedChunks = false;
            
            try {
              // Processar cada evento do stream usando o iterador fornecido pelo SDK
              for await (const event of streamResponse as unknown as AsyncIterable<any>) {
                // Registrar tipo de evento para debug
                console.log(`Evento recebido: ${event.type}`);
                
                if (event.type === 'response.output_text.delta') {
                  // Este é o evento específico para incrementos de texto na responses API
                  const textDelta = event.delta || '';
                  fullContent += textDelta;
                  hasReceivedChunks = true;
                  
                  // Enviar o chunk para o cliente
                  const message = JSON.stringify({
                    type: 'chunk',
                    content: textDelta
                  });
                  
                  await writer.write(encoder.encode(message + '\n'));
                }
                else if (event.type === 'response.created' || event.type === 'response.in_progress') {
                  // Eventos de início/progresso, podemos logar mas não precisamos enviar ao cliente
                  console.log(`Evento de progresso: ${event.type}`);
                }
                else if (event.type === 'response.completed') {
                  // Resposta completa, podemos logar os detalhes se necessário
                  console.log(`Resposta completa recebida: ${event.response?.id}`);
                  
                  // Se temos um sessionId, salvar a mensagem no banco de dados
                  if (sessionId) {
                    try {
                      // Verificar se já temos um conteúdo completo
                      if (fullContent) {
                        await saveMessageToDatabase(sessionId, {
                          role: 'assistant',
                          content: fullContent,
                          contentType: 'text'
                        });
                        console.log(`Resposta da análise de PDF salva no banco de dados. Tamanho: ${fullContent.length} caracteres`);
                      }
                    } catch (dbError) {
                      console.error('Erro ao salvar resposta do PDF no banco de dados:', dbError);
                    }
                  }
                }
                else if (event.type === 'response.failed') {
                  // Erro na resposta
                  console.error('Falha na resposta:', event.response?.error);
                  throw new Error(event.response?.error?.message || 'Falha na API responses.create');
                }
              }
              
              // Se recebemos chunks com sucesso, finalize o stream
              if (hasReceivedChunks) {
                // Finalizar o stream com uma mensagem de conclusão
                const doneMessage = JSON.stringify({
                  type: 'done',
                  response: {
                    role: 'assistant',
                    content: fullContent
                  }
                });
                
                await writer.write(encoder.encode(doneMessage + '\n'));
                await writer.close();
                return; // Terminar o processamento aqui
              } else {
                console.log('Nenhum chunk recebido no stream, tentando versão não-stream');
                // Continuar para a versão non-streaming abaixo
              }
            } catch (streamError) {
              console.error('Erro ao processar stream, usando fallback sem streaming:', streamError);
              // Continuar para a versão non-streaming abaixo
            }
          } catch (streamSetupError) {
            console.error('Erro ao configurar streaming, usando fallback sem streaming:', streamSetupError);
            // Continuar para a versão non-streaming abaixo
          }
          
          // Fallback: usar versão sem streaming se o streaming falhar
          console.log('Usando API sem streaming como fallback');
          
          // Criar objeto de opções sem o parâmetro temperature para modelos da série O
          const nonStreamOptions: any = {
            model: openaiModel,
            input: [
              {
                role: "user",
                content
              }
            ],
            stream: false
          };
          
          // Adicionar temperatura com valor adequado para cada tipo de modelo
          if (openaiModel.startsWith('o')) {
            nonStreamOptions.temperature = 1;
          } else {
            nonStreamOptions.temperature = 0.7;
          }
          
          const nonStreamResponse = await openai.responses.create(nonStreamOptions);
          
          // Extrair o texto de saída da resposta não streamada
          let responseText = '';
          
          // Navegar pela estrutura da resposta para encontrar o texto
          if (nonStreamResponse.output && Array.isArray(nonStreamResponse.output)) {
            for (const output of nonStreamResponse.output) {
              if (output.type === 'message' && Array.isArray(output.content)) {
                for (const content of output.content) {
                  if (content.type === 'output_text') {
                    responseText += content.text || '';
                  }
                }
              }
            }
          }
          
          // Se não conseguimos extrair o texto da estrutura, usar output_text
          if (!responseText && typeof nonStreamResponse.output_text === 'string') {
            responseText = nonStreamResponse.output_text;
          }
          
          console.log(`Resposta não-stream obtida com ${responseText.length} caracteres`);
          
          // Salvar no banco de dados para requests sem streaming
          if (sessionId) {
            try {
              await saveMessageToDatabase(sessionId, {
                role: 'assistant',
                content: responseText,
                contentType: 'text'
              });
              console.log(`Resposta não-stream salva no banco de dados`);
            } catch (dbError) {
              console.error('Erro ao salvar resposta não-stream no banco de dados:', dbError);
            }
          }
          
          // Finalizar com o texto completo
          const doneMessage = JSON.stringify({
            type: 'done',
            response: {
              role: 'assistant',
              content: responseText
            }
          });
          
          await writer.write(encoder.encode(doneMessage + '\n'));
          await writer.close();
        } catch (error) {
          console.error('Erro ao processar responses.create API:', error);
          
          // Enviar erro formatado para o cliente
          const errorMsg = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido ao processar o arquivo'
          });
          
          await writer.write(encoder.encode(errorMsg));
          await writer.close();
        }
      })();
      
      // Retornar a stream para o cliente
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // Usar parâmetros específicos para modelos da família O
    const requestOptions = {
      model: openaiModel,
      messages: formattedMessages,
      temperature: isOSeriesModel ? 1 : 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true, // Enable streaming
    } as any; // Usando 'any' para permitir diferentes parâmetros
    
    // Usar max_completion_tokens para modelos da família O e max_tokens para outros modelos
    if (isOSeriesModel) {
      requestOptions.max_completion_tokens = 2000;
    } else {
      requestOptions.max_tokens = 2000;
    }
    
    // Create a manual streaming response using fetch instead of the SDK
    // to avoid typing issues with the streaming API
    const API_URL = "https://api.openai.com/v1/chat/completions";

    // Store the sessionId for database operations
    console.log('Using session ID for database:', sessionId);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestOptions),
    });

    // Check if the fetch was successful
    if (!response.ok) {
      throw new Error(`OpenAI API responded with status ${response.status}`);
    }

    // Define a custom transformer class that has a buffer property
    class ChunkTransformer implements Transformer<Uint8Array, Uint8Array> {
      private buffer: string = '';
      private encoder = new TextEncoder();
      private decoder = new TextDecoder();
      private completeContent: string = '';
      
      constructor(private sessionIdForDB?: string) {}
      
      async transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
        // Decode the received chunk
        const text = this.decoder.decode(chunk);
        
        // Sometimes chunks can be incomplete or malformed, so we need to handle them carefully
        try {
          // Add to buffer first before processing
          this.buffer += text;
          
          // Split by lines and process each SSE event
          const lines = this.buffer.split('\n');
          // Keep the last line in the buffer if it's not complete (doesn't end with newline)
          this.buffer = lines.pop() || '';
          
          const validLines = lines.filter(line => line.trim() !== '');
          
          for (const line of validLines) {
            // Check if it's SSE data
            if (line.startsWith('data: ')) {
              const data = line.slice(5).trim();
              
              // Check if it's the [DONE] marker
              if (data === '[DONE]') {
                console.log('Stream complete, final content length:', this.completeContent.length);
                
                // Final message to save to DB if we have a session ID
                if (this.sessionIdForDB) {
                  try {
                    // Save the assistant message to the database
                    await saveMessageToDatabase(this.sessionIdForDB, {
                      role: 'assistant',
                      content: this.completeContent,
                      contentType: 'text'
                    });
                    
                    console.log('Successfully saved assistant message to database');
                  } catch (dbError) {
                    console.error('Error saving message to database:', dbError);
                  }
                }
                
                // Send a final done message
                controller.enqueue(this.encoder.encode(JSON.stringify({
                  type: 'done',
                  response: {
                    role: "assistant",
                    content: this.completeContent // Include complete content in done message
                  },
                  done: true
                }) + '\n'));
                continue;
              }
              
              try {
                // Parse the JSON chunk from OpenAI - wrap in try/catch to handle malformed JSON
                const parsedData = JSON.parse(data);
                const content = parsedData.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  // Accumulate the content for the complete message
                  this.completeContent += content;
                  
                  // Send the chunk to the client
                  controller.enqueue(this.encoder.encode(JSON.stringify({
                    type: 'chunk',
                    content: content,
                    done: false
                  }) + '\n'));
                }
              } catch (parseErr: any) {
                // Log the error but don't crash the stream
                console.error('Error parsing OpenAI response chunk:', parseErr.message);
                console.log('Problematic chunk:', data.substring(0, 100) + (data.length > 100 ? '...' : ''));
                
                // If the error is about unterminated JSON, keep in buffer for next chunk
                if (parseErr.message.includes('Unterminated string') || 
                    parseErr.message.includes('Unexpected end of JSON')) {
                  // Put the data back in the buffer to combine with the next chunk
                  this.buffer = 'data: ' + data + '\n' + this.buffer;
                  console.log('Added incomplete JSON back to buffer for next chunk');
                  continue;
                }
                
                // Try to extract content directly if JSON parsing fails
                // This is a fallback mechanism for malformed JSON
                try {
                  // Look for content patterns in the raw data
                  const contentMatch = /"content":"([^"]*)"/.exec(data);
                  if (contentMatch && contentMatch[1]) {
                    const extractedContent = contentMatch[1];
                    this.completeContent += extractedContent;
                    
                    // Send the extracted content to the client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'chunk',
                      content: extractedContent,
                      done: false
                    }) + '\n'));
                    
                    console.log('Extracted content from malformed JSON:', extractedContent);
                  }
                } catch (extractError) {
                  // If even the extraction fails, just continue without crashing
                  console.log('Could not extract content from malformed JSON');
                }
              }
            }
          }
        } catch (outerError) {
          // Catch any errors in the outer processing to prevent the stream from breaking
          console.error('Error processing chunk:', outerError);
          // Continue processing - don't break the stream
        }
      }
      
      // Process any remaining buffered content when the stream ends
      flush(controller: TransformStreamDefaultController<Uint8Array>) {
        if (this.buffer.trim() !== '') {
          console.log('Processing remaining buffer on stream end:', 
            this.buffer.substring(0, 100) + (this.buffer.length > 100 ? '...' : ''));
          
          try {
            // Try to handle any remaining data in the buffer
            if (this.buffer.startsWith('data: ')) {
              const data = this.buffer.slice(5).trim();
              
              try {
                const parsedData = JSON.parse(data);
                const content = parsedData.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  this.completeContent += content;
                  console.log('Added final content from buffer:', content);
                }
              } catch (parseErr) {
                console.log('Could not parse final buffer content as JSON');
              }
            }
          } catch (error) {
            console.error('Error in flush handler:', error);
          }
        }
      }
      
      // Getter for complete content
      getCompleteContent() {
        return this.completeContent;
      }
    }

    // Create our transformer instance
    const transformer = new ChunkTransformer(sessionId);
    const transformStream = new TransformStream(transformer);

    // Return the transformed stream
    return new NextResponse(response.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('OpenAI error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição com OpenAI' },
      { status: 500 }
    );
  }
}

// Função para processar requisições para a API da Anthropic/Claude
async function handleAnthropicRequest(messages: Message[], model: string) {
  try {
    console.log(`Enviando requisição para Anthropic, modelo: ${model}`);
    
    // Converter mensagens para o formato Anthropic
    const formattedMessages = messages.map(message => {
      // Anthropic não suporta mensagens de sistema da mesma forma que OpenAI
      // Vamos tratar mensagens do sistema como instruções de contexto do usuário
      if (message.role === "system") {
        return {
          role: "user" as const,
          content: `[System instruction]: ${message.content}`
        };
      }
      
      // Verificar conteúdo complexo (imagens, áudio, etc.)
      if (Array.isArray(message.content)) {
        // Claude não suporta áudio ou formatos complexos da mesma forma que OpenAI
        // Extrair apenas o conteúdo de texto
        const textContent = message.content.find(item => item.type === 'text' && item.text);
        return {
          role: message.role === "assistant" ? "assistant" as const : "user" as const,
          content: textContent ? textContent.text : "[Conteúdo não suportado]"
        };
      }
      
      return {
        role: message.role === "assistant" ? "assistant" as const : "user" as const,
        content: message.content || "[Conteúdo vazio]" // Garantir que o conteúdo nunca seja undefined
      };
    });
    
    // Remover mensagens duplicadas que possam surgir da conversão
    const uniqueMessages: { role: "user" | "assistant"; content: string }[] = [];
    let lastRole: string | null = null;
    for (const msg of formattedMessages) {
      if (msg.role !== lastRole) {
        uniqueMessages.push({
          role: msg.role,
          content: msg.content as string // Garantir que seja string
        });
        lastRole = msg.role;
      } else if (uniqueMessages.length > 0) {
        // Se há mensagens consecutivas do mesmo role, combinar o conteúdo
        const lastMsg = uniqueMessages[uniqueMessages.length - 1];
        lastMsg.content = `${lastMsg.content}\n\n${msg.content}`;
      }
    }

    // For Anthropic, we'll use a non-streaming request and simulate streaming on the client side
    // This avoids complex type issues with the Anthropic SDK
    const response = await anthropic.messages.create({
      model: model,
      messages: uniqueMessages,
      max_tokens: 2000,
      temperature: 0.7,
    });
    
    // Get the response content
    const content = response.content[0].type === 'text' ? response.content[0].text : "[Conteúdo não disponível]";
    
    // Create a simulated streaming response
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          // Break the content into chunks to simulate streaming
          const chunkSize = 5; // Characters per chunk
          let position = 0;
          
          while (position < content.length) {
            // Get the next chunk of text
            const chunk = content.substring(position, position + chunkSize);
            position += chunkSize;
            
            // Create a streaming chunk object
            const streamData = {
              type: 'chunk',
              content: chunk,
              done: false
            };
            
            // Encode and send the chunk
            controller.enqueue(encoder.encode(JSON.stringify(streamData) + '\n'));
            
            // Add a small delay to simulate real streaming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          // Send the final message
          const finalMessage = {
            type: 'done',
            response: {
              role: "assistant",
              content: content
            },
            done: true
          };
          
          controller.enqueue(encoder.encode(JSON.stringify(finalMessage) + '\n'));
          controller.close();
        } catch (error) {
          console.error('Error streaming response from Anthropic:', error);
          controller.error(error);
        }
      }
    });
    
    return new NextResponse(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Anthropic error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição com Anthropic' },
      { status: 500 }
    );
  }
}

// Helper function to save a message to the database
async function saveMessageToDatabase(sessionId: string, message: { role: string, content: string, contentType: string }) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error('Cannot save message: No authenticated user');
      return;
    }
    
    // Verify that the chat session belongs to the user
    const chatSession = await db.chatSession.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    });
    
    if (!chatSession) {
      console.error('Cannot save message: Chat session not found or does not belong to user');
      return;
    }
    
    // Save the message to the database
    await db.chatMessage.create({
      data: {
        sessionId,
        role: message.role,
        content: message.content,
        contentType: message.contentType
      }
    });
    
    // Update the session's updatedAt timestamp
    await db.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });
    
    console.log(`Message saved to database for session ${sessionId}`);
  } catch (error) {
    console.error('Error saving message to database:', error);
  }
} 