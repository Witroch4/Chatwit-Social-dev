﻿//revidado por min

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Message } from '@/hooks/useChatwitIA';
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { uploadToMinIO } from '@/lib/minio';
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

export async function POST(req: Request) {
  try {
    const { messages, model = 'gpt-4o-latest', sessionId, generateSummary = false, document, stream = false, fileIds = [], previousResponseId, webSearchActive = false } = await req.json();

    console.log(`Recebida requisição para o modelo: ${model}`);
    console.log(`Sessão ID: ${sessionId || 'nova sessão'}`);
    console.log(`Número de mensagens: ${messages?.length || 0}`);
    console.log(`Streaming habilitado: ${stream}`);
    console.log(`Web Search ativo: ${webSearchActive}`);
    console.log(`Previous Response ID recebido: ${previousResponseId || 'nenhum'}`);
    if (fileIds.length > 0) {
      console.log(`Arquivos referenciados: ${fileIds.length} (${fileIds.join(', ')})`);
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Mensagens inválidas' },
        { status: 400 }
      );
    }

    // 🔗 Determinar o responseId correto para usar
    let finalPreviousResponseId = null;
    if (sessionId) {
      try {
        console.log(`🔍 Buscando lastResponseId da sessão no banco: ${sessionId}`);
        const session = await db.chatSession.findUnique({
          where: { id: sessionId },
          select: { lastResponseId: true }
        });
        
        // 🔧 NOVA LÓGICA SIMPLIFICADA:
        // - Se previousResponseId é fornecido E é diferente do lastResponseId da sessão,
        //   é uma referência específica de imagem (via interface)
        // - Caso contrário, usar lastResponseId da sessão normalmente
        
        if (previousResponseId && previousResponseId !== session?.lastResponseId) {
          // Verificar se o previousResponseId fornecido existe no banco (validação)
          const messageWithResponseId = await db.chatMessage.findFirst({
            where: {
              sessionId: sessionId,
              responseId: previousResponseId
            },
            select: { responseId: true }
          });
          
          if (messageWithResponseId) {
            finalPreviousResponseId = previousResponseId;
            console.log(`🖼️ ✅ Usando responseId específico para referência de imagem: ${finalPreviousResponseId}`);
            console.log(`ℹ️ LastResponseId da sessão: ${session?.lastResponseId}, mas usando responseId da imagem referenciada: ${previousResponseId}`);
          } else {
            console.log(`⚠️ ResponseId fornecido não encontrado no banco: ${previousResponseId}, usando lastResponseId da sessão`);
            finalPreviousResponseId = session?.lastResponseId || null;
          }
        } else {
          // Usar lastResponseId da sessão normalmente
          finalPreviousResponseId = session?.lastResponseId || null;
          if (finalPreviousResponseId) {
            console.log(`🔗 ✅ Usando lastResponseId da sessão: ${finalPreviousResponseId}`);
          } else {
            console.log(`🔗 ❌ Nenhum responseId encontrado (nova conversa)`);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar responseId:', error);
        finalPreviousResponseId = null;
      }
    } else {
      console.log(`🔗 ℹ️ Nenhuma sessão fornecida (nova conversa)`);
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
    
    // Se web search estiver ativo e o modelo for gpt-4.1-nano, trocar por gpt-4.1-mini
    if (webSearchActive && (modelToUse === 'gpt-4.1-nano' || modelToUse === 'gpt-4.1-nano-latest')) {
      console.log(`🔄 Web Search ativo: trocando modelo ${modelToUse} por gpt-4.1-mini (nano não suporta web search)`);
      modelToUse = 'gpt-4.1-mini';
    }
    
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
      aiResponse = await handleOpenAIRequest(messages, modelToUse, sessionId, fileIds, finalPreviousResponseId, webSearchActive);
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
        m.id === baseModel || m.id.startsWith(`${baseModel}-`
      ));
      
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

// Função para testar se uma URL de imagem é acessível
async function testImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD'
    });
    
    if (!response.ok) {
      console.error(`❌ URL não acessível: ${url} (status: ${response.status})`);
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`❌ URL não é uma imagem: ${url} (content-type: ${contentType})`);
      return false;
    }
    
    console.log(`✅ URL de imagem acessível: ${url} (${contentType})`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao testar URL: ${url}`, error);
    return false;
  }
}

// Função para processar requisições para a API do OpenAI, agora usando exclusivamente Responses API
async function handleOpenAIRequest(messages: Message[], model: string, sessionId?: string, fileIds: string[] = [], previousResponseId?: string, webSearchActive: boolean = false) {
  try {
    // Verificar se é um modelo Claude (não deveria chegar aqui, mas por segurança)
    if (model.includes('claude')) {
      throw new Error('Modelo Claude não pode ser processado pelo handler OpenAI');
    }
    
    // Preparar o modelo correto para a API da OpenAI
    let openaiModel = model;
    
    // Transformar os nomes amigáveis em identificadores corretos da API
    // GPT-4.1 Series
    if (model === 'gpt-4.1') openaiModel = 'gpt-4.1-2025-04-14';
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
    if (model === 'chatgpt-4o-latest') openaiModel = 'chatgpt-4o-latest'; // Manter para mapeamento posterior
    if (model === 'gpt-4o-latest') openaiModel = 'gpt-4o-latest'; // Manter para mapeamento posterior
    if (model === 'gpt-4o-audio-preview') openaiModel = 'gpt-4o-2024-05-13'; // Usar o GPT-4o mais recente com suporte a áudio
    if (model === 'gpt-4o-2024-11-20') openaiModel = 'gpt-4o-2024-11-20'; // Usar GPT-4o mais recente
    if (model === 'ChatGPT 4o') openaiModel = 'gpt-4o-2024-08-06'; // Interface mostra este nome
    if (model === 'gpt-4o-audio-preview-latest') openaiModel = 'gpt-4o-audio-preview-2024-12-17';
    if (model === 'gpt-4o-realtime-preview-latest') openaiModel = 'gpt-4o-realtime-preview-2024-12-17';
    if (model === 'gpt-4o-mini-audio-preview-latest') openaiModel = 'gpt-4o-mini-audio-preview-2024-12-17';
    if (model === 'gpt-4o-mini-realtime-preview-latest') openaiModel = 'gpt-4o-mini-realtime-preview-2024-12-17';
    if (model === 'gpt-4o-search-preview-latest') openaiModel = 'gpt-4o-search-preview-2025-03-11';
    if (model === 'gpt-4o-mini-search-preview-latest') openaiModel = 'gpt-4o-mini-search-preview-2025-03-11';
    
    // Mapeamento especial para o4-mini-high (usa o4-mini com reasoning effort high)
    let reasoningEffort: string | undefined;
    if (model === 'o4-mini-high') {
      openaiModel = 'o4-mini';
      reasoningEffort = 'high';
      console.log(`🧠 Mapeando ${model} para ${openaiModel} com reasoning effort: ${reasoningEffort}`);
    }
    
    // Mapeamento direto para O series usando fetch e busca ativa para garantir sempre usar a versão com data
    // Extrair tipo base do modelo (o1, o1-mini, o4-mini, etc.)
    const isOModel = openaiModel.match(/^(o\d+)(-[a-z]+)?$/);
    if (isOModel) {
      try {
        const baseModel = openaiModel.includes('-') ? openaiModel : `${openaiModel}`; // Se já tem sufixo como -mini, usar como está
        
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
        console.error(`Erro ao buscar modelo dinâmico para ${openaiModel}:`, error);
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
    if (model === 'ChatGPT 4o') openaiModel = 'gpt-4o-2024-11-20';
    if (model === 'ChatGPT-4o') openaiModel = 'gpt-4o-2024-11-20';
    if (model === 'ChatGPT 4') openaiModel = 'gpt-4o-2024-11-20';
    if (model === 'GPT 4o') openaiModel = 'gpt-4o-2024-11-20';
    if (model === 'GPT 4') openaiModel = 'gpt-4o-2024-11-20';
    if (model === 'GPT-4o') openaiModel = 'gpt-4o-2024-11-20';
    
    // Verificar se o modelo suporta geração de imagem
    // Lista específica de modelos que suportam a ferramenta image_generation na Responses API
    const imageCompatibleModels = [
      'gpt-4o-2024-11-20',
      'gpt-4o',
      'gpt-4o-2024-05-13',
      'gpt-4o-2024-08-06',
      'gpt-4.1',
      'gpt-4.1-2025-04-14',
      'gpt-4.1-mini',
      'gpt-4.1-mini-2025-04-14',
      'gpt-4.1-nano',
      'gpt-4.1-nano-2025-04-14',
      'o3-mini',
      'o3'
    ];
    
    // Mapear modelos "latest" para versões específicas compatíveis com Responses API
    let modelForImageGeneration = openaiModel;
    if (model.includes('latest') || model.includes('chatgpt-4o')) {
      // Mapear modelos latest para versões compatíveis com imagem
      if (model.includes('4o') || model.includes('chatgpt-4o')) {
        modelForImageGeneration = 'gpt-4o-2024-11-20'; // Versão estável com suporte a imagem
        console.log(`🔄 Mapeando ${openaiModel} para ${modelForImageGeneration} para suporte a geração de imagem`);
      } else if (model.includes('4.1-mini')) {
        modelForImageGeneration = 'gpt-4.1-mini-2025-04-14';
        console.log(`🔄 Mapeando ${openaiModel} para ${modelForImageGeneration} para suporte a geração de imagem`);
      } else if (model.includes('4.1-nano')) {
        modelForImageGeneration = 'gpt-4.1-nano-2025-04-14';
        console.log(`🔄 Mapeando ${openaiModel} para ${modelForImageGeneration} para suporte a geração de imagem`);
      } else if (model.includes('4.1')) {
        modelForImageGeneration = 'gpt-4.1-2025-04-14';
        console.log(`🔄 Mapeando ${openaiModel} para ${modelForImageGeneration} para suporte a geração de imagem`);
      }
    }
    
    const supportsImageGeneration = imageCompatibleModels.some(compatibleModel => 
      openaiModel === compatibleModel || 
      openaiModel.startsWith(compatibleModel + '-') ||
      modelForImageGeneration === compatibleModel ||
      modelForImageGeneration.startsWith(compatibleModel + '-')
    );

    console.log(`Modelo ${openaiModel} suporta geração de imagem: ${supportsImageGeneration}`);
    
    if (modelForImageGeneration !== openaiModel) {
      console.log(`✅ Modelo mapeado com sucesso: ${openaiModel} → ${modelForImageGeneration}`);
    }
    
    // Verificar se o modelo é da família O (reasoning models)
    const isOSeriesModel = openaiModel.startsWith('o') || model.startsWith('o');
    
    // 🔍 Verificar compatibilidade entre modelo atual e previous_response_id
    // Se temos um previous_response_id, verificar se há incompatibilidade entre reasoning/non-reasoning models
    // Usar o previousResponseId que já foi validado e buscado do banco de dados
    let compatiblePreviousResponseId = previousResponseId;
    
    if (compatiblePreviousResponseId && sessionId) {
      try {
        // Buscar a última mensagem do assistente para verificar qual modelo foi usado
        const lastAssistantMessage = await db.chatMessage.findFirst({
          where: {
            sessionId: sessionId,
            role: 'assistant',
            responseId: compatiblePreviousResponseId
          },
          select: { modelUsed: true, responseId: true },
          orderBy: { createdAt: 'desc' }
        });
        
        if (lastAssistantMessage?.modelUsed) {
          const previousModelWasReasoning = lastAssistantMessage.modelUsed.startsWith('o');
          const currentModelIsReasoning = isOSeriesModel;
          
          // 🔧 CORREÇÃO: Para multi-turn image generation, permitir transição entre modelos compatíveis
          // Modelos que suportam image generation podem fazer multi-turn mesmo sendo diferentes
          const imageCompatibleModels = [
            'gpt-4o-2024-11-20', 'gpt-4o', 'gpt-4o-2024-05-13', 'gpt-4o-2024-08-06',
            'gpt-4.1', 'gpt-4.1-2025-04-14', 'gpt-4.1-mini', 'gpt-4.1-mini-2025-04-14',
            'gpt-4.1-nano', 'gpt-4.1-nano-2025-04-14', 'o3-mini', 'o3'
          ];
          
          const previousModelSupportsImages = imageCompatibleModels.some(m => 
            lastAssistantMessage.modelUsed?.includes(m.split('-')[0])
          );
          const currentModelSupportsImages = supportsImageGeneration;
          
          // Se ambos os modelos suportam geração de imagem, permitir multi-turn
          if (previousModelSupportsImages && currentModelSupportsImages) {
            console.log(`✅ Multi-turn image generation permitido entre modelos compatíveis`);
          }
          // Para modelos reasoning, verificar se são exatamente o mesmo modelo
          else if (previousModelWasReasoning && currentModelIsReasoning) {
            // Extrair o modelo base (ex: o4-mini, o3, o1) para comparação
            const extractBaseModel = (modelName: string) => {
              // Remove datas e sufixos para comparar apenas o tipo base
              return modelName.replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/-latest$/, '');
            };
            
            const previousBaseModel = extractBaseModel(lastAssistantMessage.modelUsed);
            const currentBaseModel = extractBaseModel(openaiModel);
            
            if (previousBaseModel !== currentBaseModel) {
              console.log(`⚠️ Incompatibilidade entre modelos reasoning: modelo anterior (${lastAssistantMessage.modelUsed} → ${previousBaseModel}) ≠ modelo atual (${openaiModel} → ${currentBaseModel})`);
              console.log(`🔄 Removendo previous_response_id - reasoning items só funcionam com o mesmo modelo`);
              compatiblePreviousResponseId = undefined;
            } else {
              console.log(`✅ Compatibilidade confirmada: mesmo modelo reasoning (${currentBaseModel})`);
            }
          }
          // Para modelos non-reasoning, verificar se ambos são non-reasoning
          else if (!previousModelWasReasoning && !currentModelIsReasoning) {
            console.log(`✅ Compatibilidade confirmada: ambos são modelos non-reasoning`);
          }
          // Se há incompatibilidade entre reasoning e non-reasoning models
          else if (previousModelWasReasoning !== currentModelIsReasoning) {
            console.log(`⚠️ Incompatibilidade detectada: modelo anterior (${lastAssistantMessage.modelUsed}) era reasoning: ${previousModelWasReasoning}, modelo atual (${openaiModel}) é reasoning: ${currentModelIsReasoning}`);
            console.log(`🔄 Removendo previous_response_id para evitar erro de reasoning input items`);
            compatiblePreviousResponseId = undefined;
          }
        }
      } catch (error) {
        console.error('❌ Erro ao verificar compatibilidade de modelos:', error);
        // Em caso de erro, remover previous_response_id por segurança
        compatiblePreviousResponseId = undefined;
      }
    }
    
    console.log(`🚀 Usando Responses API exclusivamente para modelo original: ${model}, modelo mapeado: ${openaiModel}`);
    console.log(`📊 É modelo da série O (reasoning): ${isOSeriesModel}`);
    
    // Usar o modelo mapeado para geração de imagem se disponível
    const apiModel = supportsImageGeneration ? modelForImageGeneration : openaiModel;
    console.log(`Modelo para API: ${apiModel} (original: ${openaiModel})`);
    
    // Extrair a última mensagem do usuário para usar como prompt
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    let userContent = '';
    let imageUrls: string[] = [];
    let extractedFileIds: string[] = [];
    let hasDirectImageUrls = false; // Flag para URLs diretas (que removem image_generation)
    
    if (lastUserMessage) {
      if (typeof lastUserMessage.content === 'string') {
        console.log('📝 Conteúdo da mensagem recebida:', lastUserMessage.content);
        userContent = lastUserMessage.content.trim();
        
        // 🖼️ CORREÇÃO: Separar claramente URLs de imagem de file IDs
        // 🔧 NOVA LÓGICA: Sempre extrair URLs diretas, independente de previous_response_id
        
        // Extrair URLs de imagem do markdown (tipo "Imagem para análise")
        const imageMarkdownRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
        const imageMatches = [...userContent.matchAll(imageMarkdownRegex)];
        
        if (imageMatches.length > 0) {
          imageUrls = imageMatches.map(match => match[1]);
          hasDirectImageUrls = true; // URLs diretas removem image_generation tool
          // Remover as referências de imagem do texto
          userContent = userContent.replace(imageMarkdownRegex, '').trim();
          console.log(`🖼️ Extraídas ${imageUrls.length} URLs de imagem diretas (remove image_generation):`, imageUrls.map(url => url.substring(0, 50) + '...'));
          
          // 🚨 CORREÇÃO CRÍTICA: Limpar previous_response_id quando há URLs diretas
          if (compatiblePreviousResponseId) {
            console.log(`🔧 LIMPANDO previous_response_id (${compatiblePreviousResponseId}) - usando URL direta ao invés de contexto`);
            compatiblePreviousResponseId = undefined;
          }
        }
        
        // Extrair file IDs válidos (que começam com 'file-') - tipo "Imagens" via Files API
        const fileIdRegex = /\[.*?\]\(file_id:(file-[^)]+)\)/g;
        const fileIdMatches = [...userContent.matchAll(fileIdRegex)];
        
        if (fileIdMatches.length > 0) {
          extractedFileIds = fileIdMatches.map(match => match[1]);
          // Remover as referências de arquivo do texto
          userContent = userContent.replace(fileIdRegex, '').trim();
          console.log(`📁 Extraídos ${extractedFileIds.length} file IDs válidos (mantém image_generation):`, extractedFileIds);
        }
        
        // 🚨 CORREÇÃO: Detectar file_id com URL (erro comum) e converter para input_image
        const invalidFileIdRegex = /\[.*?\]\(file_id:(https?:\/\/[^)]+)\)/g;
        const invalidFileIdMatches = [...userContent.matchAll(invalidFileIdRegex)];
        
        if (invalidFileIdMatches.length > 0) {
          console.log(`⚠️ Detectados ${invalidFileIdMatches.length} file_id inválidos com URLs - convertendo para input_image`);
          invalidFileIdMatches.forEach(match => {
            const invalidUrl = match[1];
            imageUrls.push(invalidUrl);
            hasDirectImageUrls = true; // URLs diretas removem image_generation tool
            console.log(`🔄 Convertendo file_id inválido para input_image: ${invalidUrl.substring(0, 50)}...`);
          });
          // Remover as referências inválidas do texto
          userContent = userContent.replace(invalidFileIdRegex, '').trim();
          
          // 🚨 CORREÇÃO CRÍTICA: Limpar previous_response_id quando há URLs inválidas convertidas
          if (compatiblePreviousResponseId) {
            console.log(`🔧 LIMPANDO previous_response_id (${compatiblePreviousResponseId}) - usando URLs convertidas ao invés de contexto`);
            compatiblePreviousResponseId = undefined;
          }
        }
        
        console.log(`📝 Texto limpo final: "${userContent}"`);
      } else if (Array.isArray(lastUserMessage.content)) {
        // Handle array content
        for (const contentItem of lastUserMessage.content) {
          if (contentItem.type === 'text' && contentItem.text) {
            userContent += contentItem.text + ' ';
          } else if (contentItem.type === 'image' && contentItem.image_url) {
            // Só adicionar como input_image se não há referência específica
            if (!compatiblePreviousResponseId) {
              // Garantir que o formato esteja correto para Responses API
              let imageUrl: string;
              if (typeof contentItem.image_url === 'string') {
                imageUrl = contentItem.image_url;
              } else if (typeof contentItem.image_url === 'object' && contentItem.image_url && 'url' in contentItem.image_url) {
                imageUrl = (contentItem.image_url as any).url;
              } else {
                console.warn('⚠️ Formato de image_url não reconhecido:', contentItem.image_url);
                continue;
              }
              
              imageUrls.push(imageUrl);
            }
          }
        }
        userContent = userContent.trim();
      }
    }
    
    // Preparar conteúdo de entrada para a Responses API
    const inputContent: any[] = [
      { type: "input_text", text: userContent || "Analise o conteúdo fornecido." }
    ];
    
    // Adicionar imagens extraídas como input_image APENAS se não há referência específica
    if (imageUrls.length > 0) {
      imageUrls.forEach((imageUrl, index) => {
        inputContent.push({
          type: "input_image",
          image_url: imageUrl // 🔧 CORREÇÃO: Responses API usa string direta, não objeto
        });
        console.log(`🖼️ Adicionada imagem ${index + 1} como input_image: ${imageUrl.substring(0, 50)}...`);
      });
    }
    
    // Adicionar cada arquivo como input_file (para PDFs) ou input_image (para imagens)
    for (const fileId of extractedFileIds) {
      // 🔧 NOVA LÓGICA: Determinar tipo do arquivo baseado no banco de dados
      try {
        let fileType = 'image'; // default para imagem
        let fileName = `file-${fileId}`;
        
        // Buscar informações do arquivo no banco de dados
        const chatFile = await db.chatFile.findFirst({
          where: { openaiFileId: fileId }
        });
        
        if (chatFile) {
          fileType = chatFile.fileType || 'application/octet-stream';
          fileName = chatFile.filename;
          console.log(`📁 Arquivo encontrado no ChatFile: ${fileName}, tipo: ${fileType}`);
        } else {
          // Se não encontrar no ChatFile, buscar no GeneratedImage
          const generatedImage = await db.generatedImage.findFirst({
            where: { openaiFileId: fileId }
          });
          
          if (generatedImage) {
            fileType = generatedImage.mimeType || 'image/png';
            fileName = `image-${generatedImage.id}.${generatedImage.mimeType?.split('/')[1] || 'png'}`;
            console.log(`🖼️ Arquivo encontrado no GeneratedImage: ${fileName}, tipo: ${fileType}`);
          } else {
            console.warn(`⚠️ Arquivo ${fileId} não encontrado no banco, assumindo imagem`);
          }
        }
        
        // Determinar se é PDF ou imagem
        const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
        const isImage = fileType.startsWith('image/') || 
                       ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].some(ext => 
                         fileName.toLowerCase().includes(ext));
        
        if (isPdf) {
          inputContent.push({ type: "input_file", file_id: fileId });
          console.log(`📄 Adicionado PDF como input_file (file_id): ${fileId} - ${fileName}`);
        } else if (isImage) {
          inputContent.push({ type: "input_image", file_id: fileId });
          console.log(`🖼️ Adicionado imagem como input_image (file_id): ${fileId} - ${fileName}`);
        } else {
          // Para outros tipos, usar input_file como fallback
          inputContent.push({ type: "input_file", file_id: fileId });
          console.log(`📁 Adicionado arquivo genérico como input_file (file_id): ${fileId} - ${fileName} (tipo: ${fileType})`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao determinar tipo do arquivo ${fileId}:`, error);
        // Em caso de erro, usar input_image como fallback (comportamento anterior)
        inputContent.push({ type: "input_image", file_id: fileId });
        console.log(`🔄 Fallback: Adicionado como input_image (file_id): ${fileId}`);
      }
    }
    
    // Adicionar file IDs de parâmetro - determinar se é imagem ou PDF baseado no contexto
    if (fileIds && fileIds.length > 0) {
      for (const fileId of fileIds) {
        // 🔧 NOVA LÓGICA: Determinar tipo do arquivo baseado no banco de dados
        try {
          let fileType = 'image'; // default para imagem
          let fileName = `file-${fileId}`;
          
          // Buscar informações do arquivo no banco de dados
          const chatFile = await db.chatFile.findFirst({
            where: { openaiFileId: fileId }
          });
          
          if (chatFile) {
            fileType = chatFile.fileType || 'application/octet-stream';
            fileName = chatFile.filename;
            console.log(`📁 Arquivo (parâmetro) encontrado no ChatFile: ${fileName}, tipo: ${fileType}`);
          } else {
            // Se não encontrar no ChatFile, buscar no GeneratedImage
            const generatedImage = await db.generatedImage.findFirst({
              where: { openaiFileId: fileId }
            });
            
            if (generatedImage) {
              fileType = generatedImage.mimeType || 'image/png';
              fileName = `image-${generatedImage.id}.${generatedImage.mimeType?.split('/')[1] || 'png'}`;
              console.log(`🖼️ Arquivo (parâmetro) encontrado no GeneratedImage: ${fileName}, tipo: ${fileType}`);
            } else {
              console.warn(`⚠️ Arquivo (parâmetro) ${fileId} não encontrado no banco, assumindo imagem`);
            }
          }
          
          // Determinar se é PDF ou imagem
          const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
          const isImage = fileType.startsWith('image/') || 
                         ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].some(ext => 
                           fileName.toLowerCase().includes(ext));
          
          if (isPdf) {
            inputContent.push({ type: "input_file", file_id: fileId });
            console.log(`📄 Adicionado PDF (parâmetro) como input_file (file_id): ${fileId} - ${fileName}`);
          } else if (isImage) {
            inputContent.push({ type: "input_image", file_id: fileId });
            console.log(`🖼️ Adicionado imagem (parâmetro) como input_image (file_id): ${fileId} - ${fileName}`);
          } else {
            // Para outros tipos, usar input_file como fallback
            inputContent.push({ type: "input_file", file_id: fileId });
            console.log(`📁 Adicionado arquivo genérico (parâmetro) como input_file (file_id): ${fileId} - ${fileName} (tipo: ${fileType})`);
          }
          
        } catch (error) {
          console.error(`❌ Erro ao determinar tipo do arquivo (parâmetro) ${fileId}:`, error);
          // Em caso de erro, usar input_image como fallback (comportamento anterior)
          inputContent.push({ type: "input_image", file_id: fileId });
          console.log(`🔄 Fallback: Adicionado (parâmetro) como input_image (file_id): ${fileId}`);
        }
      }
    }
    
    // 🔧 CORREÇÃO IMPORTANTE: Se há file_ids sendo fornecidos como input_image,
    // isso significa que o usuário está fornecendo uma nova imagem de referência explícita.
    // Nesse caso, limpar o previous_response_id para evitar conflito entre a imagem
    // de referência e o contexto da conversa anterior
    const hasExplicitImageReference = extractedFileIds.length > 0 || (fileIds && fileIds.length > 0);
    if (hasExplicitImageReference && compatiblePreviousResponseId) {
      console.log(`🚨 CONFLITO DETECTADO: File IDs fornecidos como input_image (${[...extractedFileIds, ...(fileIds || [])].join(', ')}) + previous_response_id (${compatiblePreviousResponseId})`);
      console.log(`🔧 Limpando previous_response_id para usar apenas a imagem de referência explícita`);
      compatiblePreviousResponseId = undefined;
    }
    
    // Preparar ferramentas para Responses API
    const tools: any[] = [];
    
    // Adicionar ferramenta de pesquisa web se ativada
    if (webSearchActive) {
      tools.push({
        type: "web_search_preview",
        search_context_size: "medium",
        user_location: {
          type: "approximate",
          country: "BR",
          timezone: "America/Sao_Paulo"
        }
      });
      console.log('🔍 Ferramenta de pesquisa web adicionada (web_search_preview)');
    }
    
    // 🔧 CORREÇÃO: Não adicionar image_generation quando há URLs diretas ou input_image 
    // (mas permitir quando há apenas file_ids via Files API)
    const hasInputImages = imageUrls.length > 0 || hasDirectImageUrls;
    const hasOnlyFileIds = extractedFileIds.length > 0 && !hasInputImages;
    
    // Adicionar ferramenta de geração de imagem APENAS se:
    // 1. O modelo suporta geração de imagem E
    // 2. NÃO há URLs diretas de imagem (input_image) E
    // 3. OU há apenas file_ids via Files API (que são compatíveis)
    if (supportsImageGeneration && !hasInputImages) {
      tools.push({
        type: "image_generation",
        quality: "auto",
        size: "auto",
        background: "auto",
        partial_images: 2 // Receber 2 imagens parciais durante a geração para melhor UX
      });
      console.log('🎨 Ferramenta de geração de imagem adicionada com partial_images: 2');
    } else if (hasInputImages) {
      console.log('🚫 Ferramenta de geração de imagem removida - incompatível com input_image/URLs diretas');
    } else if (!supportsImageGeneration) {
      console.log('🚫 Modelo não suporta geração de imagem');
    }
        
    // Configurar opções para a requisição da Responses API
    const requestOptions: any = {
      model: apiModel,
      input: [
        {
          role: "user",
          content: inputContent
        }
      ],
      stream: true,
      store: true,
      parallel_tool_calls: true,
      truncation: "disabled"
    };
    
    // Usar previous_response_id se disponível (para multi-turn conversations)
    if (compatiblePreviousResponseId) {
      console.log(`🔗 Usando previous_response_id: ${compatiblePreviousResponseId} para multi-turn conversation`);
      requestOptions.previous_response_id = compatiblePreviousResponseId;
    }
        
    // Adicionar ferramentas se disponíveis
    if (tools.length > 0) {
      requestOptions.tools = tools;
    }
    
    // Adicionar parâmetro reasoning para modelos da série O
    if (isOSeriesModel) {
      const effort = reasoningEffort || 'medium'; // Default para medium, mas pode ser high para o4-mini-high
      requestOptions.reasoning = { effort };
      console.log(`🧠 Adicionando reasoning effort: ${effort} para modelo da série O`);
    }
    
    // Adicionar temperatura baseada no tipo de modelo
    if (isOSeriesModel) {
      requestOptions.temperature = 1;
    } else {
      requestOptions.temperature = 0.7;
    }
    
    // Adicionar top_p
    requestOptions.top_p = 1.0;
    
    // Adicionar max_output_tokens
    requestOptions.max_output_tokens = 2000;
    
    // Usar a Responses API exclusivamente
    const API_URL = "https://api.openai.com/v1/responses";

    // Store the sessionId for database operations
    console.log('Using session ID for database:', sessionId);

    // Log do payload para debug
    console.log('📤 Payload sendo enviado para OpenAI Responses API:');
    console.log('🔧 Model:', apiModel);
    console.log('📝 Input content items:', inputContent.length);
    console.log('🛠️ Tools:', tools.length > 0 ? tools.map(t => t.type) : 'none');
    
    // Log detalhado de cada item do inputContent
    inputContent.forEach((item, index) => {
      console.log(`📋 Input item ${index}:`, {
        type: item.type,
        hasText: item.text ? `yes (${item.text.length} chars)` : 'no',
        hasFileId: item.file_id ? `yes (${item.file_id})` : 'no',
        hasImageUrl: item.image_url ? 'yes' : 'no',
        imageUrl: item.image_url?.url ? `${item.image_url.url.substring(0, 100)}...` : 'none',
        detail: item.image_url?.detail || 'none'
      });
    });
    
    console.log('📊 Request options:', JSON.stringify(requestOptions, null, 2));

    // Validação final do payload
    if (!requestOptions.model) {
      throw new Error('Modelo não especificado no payload');
    }
    
    if (!requestOptions.input || !Array.isArray(requestOptions.input)) {
      throw new Error('Input inválido no payload');
    }
    
    if (requestOptions.input.length === 0) {
      throw new Error('Input vazio no payload');
    }
    
    // Verificar se há pelo menos um item de texto no input
    const hasTextInput = inputContent.some(item => item.type === 'input_text' && item.text);
    if (!hasTextInput) {
      console.warn('⚠️ Nenhum input de texto encontrado, adicionando texto padrão');
      inputContent.unshift({ type: "input_text", text: "Analise o conteúdo fornecido." });
    }
    
    // Validações específicas para Responses API
    if (requestOptions.tools && requestOptions.tools.length > 0) {
      console.log('🔧 Validando ferramentas...');
      requestOptions.tools.forEach((tool: any, index: number) => {
        if (!tool.type) {
          throw new Error(`Tool ${index} não tem tipo especificado`);
        }
        console.log(`✅ Tool ${index}: ${tool.type} validada`);
      });
    }
    
    // Verificar compatibilidade de tools com previous_response_id
    if (requestOptions.previous_response_id && requestOptions.tools) {
      console.log('🔧 Verificando compatibilidade de tools com previous_response_id...');
      const imageGenTool = requestOptions.tools.find((t: any) => t.type === 'image_generation');
      if (imageGenTool) {
        console.log('✅ image_generation tool compatível com multi-turn');
      }
    }
    
    // Verificar se o modelo suporta as ferramentas especificadas
    if (requestOptions.tools) {
      const unsupportedForModel: string[] = [];
      requestOptions.tools.forEach((tool: any) => {
        if (tool.type === 'image_generation' && !supportsImageGeneration) {
          unsupportedForModel.push(tool.type);
        }
      });
      
      if (unsupportedForModel.length > 0) {
        console.warn(`⚠️ Ferramentas não suportadas pelo modelo ${apiModel}:`, unsupportedForModel);
        // Remover ferramentas não suportadas
        requestOptions.tools = requestOptions.tools.filter((tool: any) => 
          !unsupportedForModel.includes(tool.type)
        );
        console.log('🔧 Ferramentas não suportadas removidas');
      }
    }
    
    console.log('✅ Payload validado com sucesso');

    // Função para fazer a requisição com retry automático
    const makeRequestWithRetry = async (requestOptions: any) => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestOptions),
      });

      // Se não deu certo e temos previous_response_id, tentar retry
      if (!response.ok && requestOptions.previous_response_id) {
        try {
          const errorBody = await response.text();
          const errorObject = JSON.parse(errorBody);
          
          // Se é erro 400 com invalid_request_error, tentar sem previous_response_id
          if (response.status === 400 && errorObject?.error?.type === 'invalid_request_error') {
            console.log('🔄 Erro 400 com previous_response_id detectado, tentando retry sem previous_response_id...');
            
            const retryOptions = { ...requestOptions };
            delete retryOptions.previous_response_id;
            
            const retryResponse = await fetch(API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify(retryOptions),
            });
            
            if (retryResponse.ok) {
              console.log('✅ Retry sem previous_response_id foi bem-sucedido');
              return { response: retryResponse, usedPreviousResponseId: false };
            }
          }
        } catch (retryError) {
          console.error('❌ Erro durante retry:', retryError);
        }
      }
      
      return { response, usedPreviousResponseId: !!requestOptions.previous_response_id };
    };

    const { response, usedPreviousResponseId } = await makeRequestWithRetry(requestOptions);
    const finalPreviousResponseId = usedPreviousResponseId ? compatiblePreviousResponseId : undefined;

    // Check if the fetch was successful
    if (!response.ok) {
      // Capturar detalhes do erro da OpenAI
      let errorDetails = '';
      let errorObject = null;
      
      try {
        const errorBody = await response.text();
        errorDetails = errorBody;
        
        // Tentar fazer parse do JSON do erro
        try {
          errorObject = JSON.parse(errorBody);
          console.error(`❌ OpenAI API Error ${response.status} - Parsed:`, errorObject);
          
          // Log específico para erro 400
          if (response.status === 400) {
            console.error('🔍 Detalhes do erro 400:');
            console.error('📋 Error type:', errorObject?.error?.type);
            console.error('📝 Error message:', errorObject?.error?.message);
            console.error('🎯 Error code:', errorObject?.error?.code);
            console.error('📊 Error param:', errorObject?.error?.param);
            
            // Log do payload que causou o erro
            console.error('📤 Payload que causou o erro:');
            console.error('🔧 Model:', apiModel);
            console.error('📝 Input content items:', inputContent.length);
            inputContent.forEach((item, index) => {
              console.error(`📋 Item ${index}:`, {
                type: item.type,
                hasText: item.text ? 'yes' : 'no',
                hasFileId: item.file_id ? 'yes' : 'no',
                hasImageUrl: item.image_url ? 'yes' : 'no',
                imageUrlLength: item.image_url?.url?.length || 0
              });
            });
            console.error('🛠️ Tools:', tools.length > 0 ? tools.map(t => t.type) : 'none');
            console.error('🔗 Previous Response ID:', requestOptions.previous_response_id || 'none');
          }
        } catch (parseError) {
          console.error(`❌ OpenAI API Error ${response.status} - Raw:`, errorDetails);
        }
      } catch (e) {
        console.error(`❌ OpenAI API Error ${response.status}: Não foi possível ler o corpo da resposta`);
      }
      
      throw new Error(`OpenAI API responded with status ${response.status}: ${errorDetails}`);
    }

    // Define a custom transformer class for Responses API events
    class ChunkTransformer implements Transformer<Uint8Array, Uint8Array> {
      private buffer: string = '';
      private encoder = new TextEncoder();
      private decoder = new TextDecoder();
      private completeContent: string = '';
      private responseId: string = '';
      private imageResults: any[] = [];
      private fullResponseData: any = null;

      constructor(
        private sessionIdForDB?: string,
        private userPrompt?: string,
        private modelName?: string,
        private previousResponseId?: string
      ) {}
      
      async transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
        // Decode the received chunk
        const text = this.decoder.decode(chunk);
        
        try {
          // Add to buffer first before processing
          this.buffer += text;
          
          // Split by lines and process each SSE event
          const lines = this.buffer.split('\n');
          // Keep the last line in the buffer if it's not complete
          this.buffer = lines.pop() || '';
                
          const validLines = lines.filter(line => line.trim() !== '');
          
          for (const line of validLines) {
            // Check if it's SSE event
            if (line.startsWith('event: ')) {
              // Skip event type lines, we'll handle them with data
              continue;
            }
            
            if (line.startsWith('data: ')) {
              const data = line.slice(5).trim();
              
              // Check if it's the [DONE] marker
              if (data === '[DONE]') {
                console.log('✅ Responses API stream complete');
                console.log(`📊 Final content length: ${this.completeContent.length}`);
                console.log(`🖼️ Images generated: ${this.imageResults.length}`);
                console.log(`🆔 Response ID: ${this.responseId}`);
                
                // Send final done message with response ID and full response data
                controller.enqueue(this.encoder.encode(JSON.stringify({
                type: 'done',
                response: {
                    role: "assistant",
                    content: this.completeContent,
                    images: this.imageResults,
                    responseId: this.responseId,
                    responsesApiResponse: this.fullResponseData
                  },
                  response_id: this.responseId, // Important for multi-turn
                  done: true
                }) + '\n'));
                continue;
              }
              
              try {
                // Parse the JSON event from Responses API
                const eventData = JSON.parse(data);
                
                // Handle different event types from Responses API
                switch (eventData.type) {
                  case 'response.created':
                    console.log('🚀 Response started, ID:', eventData.response?.id);
                    this.responseId = eventData.response?.id || '';
                    this.fullResponseData = eventData.response;
                    break;
                    
                  case 'response.in_progress':
                    console.log('⏳ Response in progress');
                    // Opcional: enviar status de progresso para o cliente
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'progress',
                      message: 'Processando...'
                    }) + '\n'));
                    break;
                    
                  case 'response.output_item.added':
                    console.log('📋 Output item added, type:', eventData.item?.type);
                    // Opcional: enviar status de item adicionado para o cliente
                    if (eventData.item?.type === 'image_generation_call') {
                      controller.enqueue(this.encoder.encode(JSON.stringify({
                        type: 'output_item_added',
                        item_type: 'image_generation_call',
                        message: 'Preparando geração de imagem...'
                      }) + '\n'));
                    }
                    break;
                    
                  case 'response.output_text.delta':
                    // Text incremental
                    const textDelta = eventData.delta || '';
                    this.completeContent += textDelta;
                    
                    // Send the chunk to the client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'chunk',
                      content: textDelta,
                      done: false
                    }) + '\n'));
                    break;
                    
                  case 'response.image_generation_call.started':
                    console.log('🎨 Image generation started');
                    
                    // Send status to client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'image_generation_started',
                      message: 'Gerando imagem...'
                    }) + '\n'));
                    break;
                    
                  case 'response.image_generation_call.in_progress':
                    console.log('🔄 Image generation in progress');
                    
                    // Send progress status to client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'image_generation_progress',
                      message: 'Imagem sendo gerada...'
                    }) + '\n'));
                    break;
                    
                  case 'response.image_generation_call.generating':
                    console.log('✨ Image generation generating');
                    
                    // Send generating status to client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'image_generation_generating',
                      message: 'Processando imagem...'
                    }) + '\n'));
                    break;
                    
                  case 'response.image_generation_call.partial_image':
                    console.log(`🖼️ Partial image received, index: ${eventData.partial_image_index}`);
                    
                    // Send partial image to client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'partial_image',
                      image_data: eventData.partial_image_b64 || '',
                      index: eventData.partial_image_index || 0
                    }) + '\n'));
                    break;
                    
                  case 'response.image_generation_call.completed':
                    console.log('✅ Image generation completed');
                    // Image will be processed in response.completed
                    break;
                    
                  case 'response.web_search_call.started':
                    console.log('🔍 Web search started');
                    
                    // Send status to client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'web_search_started',
                      message: 'Pesquisando na web...'
                    }) + '\n'));
                    break;
                    
                  case 'response.web_search_call.completed':
                    console.log('✅ Web search completed');
                    
                    // Send status to client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'web_search_completed',
                      message: 'Pesquisa web concluída'
                    }) + '\n'));
                    break;
                    
                  case 'error':
                    console.error('❌ Stream error event:', eventData);
                    console.error('❌ Full error data:', JSON.stringify(eventData, null, 2));
                    
                    // Determinar a estrutura do erro
                    let errorMessage = 'Erro no stream';
                    let errorCode = 'unknown';
                    
                    if (eventData.error) {
                      errorMessage = eventData.error.message || eventData.error;
                      errorCode = eventData.error.code || 'unknown';
                    } else if (eventData.message) {
                      errorMessage = eventData.message;
                    } else if (eventData.code && eventData.message) {
                      errorCode = eventData.code;
                      errorMessage = eventData.message;
                    }
                    
                    console.error(`❌ Processed error - Code: ${errorCode}, Message: ${errorMessage}`);
                    
                    // Send error to client
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'stream_error',
                      error: errorMessage,
                      error_code: errorCode,
                      details: eventData
                    }) + '\n'));
                    break;
                    
                  case 'response.failed':
                    console.error('❌ Response failed:', eventData.response?.error);
                    controller.enqueue(this.encoder.encode(JSON.stringify({
                      type: 'error',
                      error: eventData.response?.error?.message || 'Response failed'
                    }) + '\n'));
                    break;
                    
                  case 'response.completed':
                    console.log('🏁 Response completed, processing final output');
                    
                    // Store the complete response data
                    this.fullResponseData = eventData.response;
                
                    // Process final output for images
                    if (eventData.response?.output && Array.isArray(eventData.response.output)) {
                      for (const output of eventData.response.output) {
                        if (output.type === 'image_generation_call') {
                          console.log('🖼️ Processing generated image');
                          
                          // Save image to MinIO and database
                          try {
                            const session = await auth();
                            
                            if (session?.user?.id && output.result) {
                              // Convert base64 to buffer
                              const base64Data = output.result.replace(/^data:image\/\w+;base64,/, '');
                              const imageBuffer = Buffer.from(base64Data, 'base64');
                              
                              // Upload to MinIO
                              const uploadResult = await uploadToMinIO(
                                imageBuffer,
                                `generated-image-${Date.now()}.png`,
                                'image/png',
                                true // Generate thumbnail
                              );
                              
                              const imageUrl = uploadResult.url;
                              const thumbnailUrl = uploadResult.thumbnail_url || '';
                              
                              console.log(`💾 Image saved to MinIO: ${imageUrl}`);
                              
                              // Save to database
                              const savedImage = await db.generatedImage.create({
                                data: {
                                  userId: session.user.id,
                                  sessionId: this.sessionIdForDB || null,
                                  prompt: this.userPrompt || 'Imagem gerada',
                                  revisedPrompt: output.revised_prompt || null,
                                  model: this.modelName || '',
                                  imageUrl: imageUrl,
                                  thumbnailUrl: thumbnailUrl,
                                  mimeType: uploadResult.mime_type,
                                  previousResponseId: this.previousResponseId || null,
                                  responseId: this.responseId || null,
                                  createdAt: new Date()
                                }
                              });
                              
                              console.log(`💾 Image saved to database: ${savedImage.id}`);
                              
                              // Store image result for final response
                              const imageResult = {
                                id: output.id,
                                result: output.result,
                                revised_prompt: output.revised_prompt,
                                url: imageUrl,
                                image_url: imageUrl,
                                thumbnail_url: thumbnailUrl
                              };
                              
                              this.imageResults.push(imageResult);
                      
                              // Send image generated event immediately
                              controller.enqueue(this.encoder.encode(JSON.stringify({
                                type: 'image_generated',
                                image_data: output.result,
                                image_url: imageUrl,
                                thumbnail_url: thumbnailUrl,
                                revised_prompt: output.revised_prompt,
                                image_id: output.id
                              }) + '\n'));
                              
                } else {
                              console.log('⚠️ Could not save image: user not authenticated or empty result');
                              
                              // Still send the event with available data
                              const imageResult = {
                                id: output.id,
                                result: output.result,
                                revised_prompt: output.revised_prompt,
                                url: '',
                                image_url: '',
                                thumbnail_url: ''
                              };
                              
                              this.imageResults.push(imageResult);
                              
                              controller.enqueue(this.encoder.encode(JSON.stringify({
                                type: 'image_generated',
                                image_data: output.result || '',
                                image_url: '',
                                thumbnail_url: '',
                                revised_prompt: output.revised_prompt,
                                image_id: output.id
                              }) + '\n'));
                            }
                          } catch (saveError) {
                            console.error('❌ Error saving image to MinIO:', saveError);
                            
                            // Still send the event with available data
                            const imageResult = {
                              id: output.id,
                              result: output.result,
                              revised_prompt: output.revised_prompt,
                              url: '',
                              image_url: '',
                              thumbnail_url: ''
                            };
                            
                            this.imageResults.push(imageResult);
                            
                            controller.enqueue(this.encoder.encode(JSON.stringify({
                              type: 'image_generated',
                              image_data: output.result || '',
                              image_url: '',
                              thumbnail_url: '',
                              revised_prompt: output.revised_prompt,
                              image_id: output.id
                            }) + '\n'));
                          }
                        }
                      }
                    }
                    
                    // IMPORTANTE: Salvar mensagem do assistente no banco também aqui (Responses API)
                    if (this.sessionIdForDB) {
                      try {
                        let contentToSave = this.completeContent;
                        
                        // Se temos imagens, adicionar elas como markdown ao conteúdo
                        if (this.imageResults.length > 0) {
                          // Buscar as imagens salvas no banco para obter as URLs corretas
                          const session = await auth();
                          
                          if (session?.user?.id) {
                            const savedImages = await db.generatedImage.findMany({
                              where: {
                                userId: session.user.id,
                                sessionId: this.sessionIdForDB
                              },
                              orderBy: {
                                createdAt: 'desc'
                              },
                              take: this.imageResults.length
                            });
                            
                            // Usar as URLs das imagens salvas
                            savedImages.forEach((img, index) => {
                              const imageMarkdown = `![Imagem gerada](${img.imageUrl})`;
                            
                              if (contentToSave) {
                                contentToSave += `\n\n${imageMarkdown}`;
                              } else {
                                contentToSave = imageMarkdown;
                              }
                            });
                          } else {
                            // Fallback: usar as URLs dos resultados (se disponíveis)
                            this.imageResults.forEach((img, index) => {
                              const imageUrl = img.url || img.image_url || '';
                              if (imageUrl) {
                                const imageMarkdown = `![Imagem gerada](${imageUrl})`;
                        
                                if (contentToSave) {
                                  contentToSave += `\n\n${imageMarkdown}`;
                                } else {
                                  contentToSave = imageMarkdown;
                                }
                              }
                            });
                          }
                        }
                        
                        // Salvar mensagem com dados completos da Responses API
                        await saveMessageToDatabase(this.sessionIdForDB, {
                          role: 'assistant',
                          content: contentToSave,
                          contentType: 'text',
                          responseId: this.responseId,
                          responsesApiResponse: this.fullResponseData,
                          usage: this.fullResponseData?.usage
                        });

                        // 🔗 Atualizar lastResponseId na sessão
                        if (this.sessionIdForDB && this.responseId) {
                          try {
                            await db.chatSession.update({
                              where: { id: this.sessionIdForDB },
                              data: { lastResponseId: this.responseId }
                            });
                            console.log(`🔗 LastResponseId atualizado na sessão: ${this.responseId}`);
                          } catch (error) {
                            console.error('Erro ao atualizar lastResponseId na sessão:', error);
                          }
                        }
                        
                        console.log('✅ Assistant message saved to database [COMPLETED]');
                      } catch (dbError) {
                        console.error('❌ Error saving message to database [COMPLETED]:', dbError);
                      }
                    }
                    
                    break;
                    
                  default:
                    console.log(`ℹ️ Unhandled event type: ${eventData.type}`);
                }
                  
              } catch (parseErr: any) {
                // Log the error but don't crash the stream
                console.error('❌ Error parsing Responses API event:', parseErr.message);
                console.log('🔍 Problematic data:', data.substring(0, 100) + (data.length > 100 ? '...' : ''));
                console.log('🔍 Full problematic data:', data);
                console.log('🔍 Event data type:', typeof data);
                console.log('🔍 Event data length:', data.length);
                
                // If the error is about unterminated JSON, keep in buffer for next chunk
                if (parseErr.message.includes('Unterminated string') || 
                    parseErr.message.includes('Unexpected end of JSON')) {
                  // Put the data back in the buffer to combine with the next chunk
                  this.buffer = 'data: ' + data + '\n' + this.buffer;
                  console.log('📝 Added incomplete JSON back to buffer for next chunk');
                  continue;
                }
                
                // Se não é um erro de JSON incompleto, tentar tratar como evento especial
                if (data.includes('error') || data.includes('failed')) {
                  console.log('🚨 Detected error-like content, sending error event to client');
                  controller.enqueue(this.encoder.encode(JSON.stringify({
                    type: 'parse_error',
                    error: 'Erro ao processar evento da API',
                    raw_data: data,
                    parse_error: parseErr.message
                  }) + '\n'));
                }
              }
            }
          }
        } catch (outerError) {
          // Catch any errors in the outer processing to prevent the stream from breaking
          console.error('❌ Error processing chunk:', outerError);
          // Continue processing - don't break the stream
        }
      }
    }

    // Create our transformer instance
    const transformer = new ChunkTransformer(sessionId, userContent, apiModel, finalPreviousResponseId);
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
async function saveMessageToDatabase(
  sessionId: string, 
  message: { 
    role: string, 
    content: string, 
    contentType: string,
    previousResponseId?: string,
    responseId?: string,
    imageUrl?: string,
    audioData?: string,
    responsesApiResponse?: any,
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
      reasoning_tokens?: number;
    }
  }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error('Cannot save message: No authenticated user');
      return null;
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
      return null;
    }
    
    // Extrair dados da Responses API se disponível
    const responsesData = message.responsesApiResponse;
    
    // Save the message to the database
    const savedMessage = await db.chatMessage.create({
      data: {
        sessionId,
        role: message.role,
        content: message.content,
        contentType: message.contentType,
        previousResponseId: message.previousResponseId,
        responseId: message.responseId,
        imageUrl: message.imageUrl,
        audioData: message.audioData,
        // Novos campos da Responses API
        modelUsed: responsesData?.model,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
        totalTokens: message.usage?.total_tokens,
        reasoningTokens: message.usage?.reasoning_tokens,
        temperature: responsesData?.temperature,
        topP: responsesData?.top_p,
        responseStatus: responsesData?.status,
        responseCreatedAt: responsesData?.created_at ? new Date(responsesData.created_at * 1000) : undefined
      }
    });
    
    // Update the session's updatedAt timestamp
    await db.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });
    
    console.log(`Message saved to database for session ${sessionId} with responseId: ${message.responseId || 'none'}`);
    if (message.responsesApiResponse) {
      console.log(`📊 Responses API data saved: model=${responsesData?.model}, tokens=${message.usage?.total_tokens}, status=${responsesData?.status}`);
    }
    return savedMessage;
  } catch (error) {
    console.error('Error saving message to database:', error);
    return null;
  }
}

// Helper function to save uploaded images to the database for future reference
async function saveUploadedImageToDatabase(sessionId: string, imageUrl: string, prompt: string = 'Imagem enviada pelo usuário') {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error('Cannot save uploaded image: No authenticated user');
      return null;
    }
    
    // Save the uploaded image to the generatedImage table for consistency
    const savedImage = await db.generatedImage.create({
      data: {
        userId: session.user.id,
        sessionId: sessionId,
        prompt: prompt,
        revisedPrompt: null,
        model: 'user-upload', // Identificar como upload do usuário
        imageUrl: imageUrl,
        thumbnailUrl: imageUrl.replace('.jpg', '_thumb.jpg').replace('.png', '_thumb.png'), // Assumir que há thumbnail
        mimeType: imageUrl.includes('.jpg') ? 'image/jpeg' : 'image/png',
        createdAt: new Date()
      }
    });
    
    console.log(`📸 Uploaded image saved to database: ${savedImage.id}`);
    return savedImage;
  } catch (error) {
    console.error('Error saving uploaded image to database:', error);
    return null;
  }
} 