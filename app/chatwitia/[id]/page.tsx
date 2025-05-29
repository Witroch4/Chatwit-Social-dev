//app/chatwitia/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';  // ← importe useSearchParams
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import ChatwitIA from '@/app/components/ChatwitIA/ChatwithIA';
import ImageGalleryModal from '@/app/components/ImageGallery';
import ChatSidebar from '@/components/chatwitia/ChatSidebar';

// Define the Model interface
interface Model {
  id: string;
  name: string;
  description: string;
  category?: string;
  beta?: boolean;
  experimental?: boolean;
}

// Main models
const defaultMainModels = [
  { id: "chatgpt-4o-latest", name: "ChatGPT 4o", description: "Excelente para a maioria das perguntas" },
  { id: "o3", name: "o3", description: "Usa reflexão avançada (baseado no gpt-4o-2024-05-13)" },
  { id: "o4-mini", name: "o4-mini", description: "Mais rápido em reflexão avançada" },
  { id: "o4-mini-high", name: "o4-mini High", description: "Reflexão avançada com maior esforço de raciocínio", beta: true },
  { id: "gpt-4.1-nano", name: "GPT-4.1 nano", description: "Fastest, most cost-effective GPT-4.1 model" },
  { id: "gpt-4.1", name: "GPT-4.1", description: "Ótimo para escrita e explorar ideias", beta: true, experimental: true },
];

// Modelos adicionais - serão substituídos pelos modelos da API
const defaultAdditionalModels = [
  // GPT-4.1 Series
  { id: "gpt-4.1-latest", name: "GPT-4.1", description: "GPT-4.1 mais recente (gpt-4.1-2025-04-14)", category: "GPT-4.1" },
  { id: "gpt-4.1-mini-latest", name: "GPT-4.1 Mini", description: "Versão mais leve do GPT-4.1 (gpt-4.1-mini-2025-04-14)", category: "GPT-4.1" },
  // Exemplos de modelos que serão substituídos pela API
];

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();

  const searchParams = useSearchParams();
  const chatId = params?.id as string;
  
  // State for pending message to handle async loading
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [hasProcessedPending, setHasProcessedPending] = useState(false);
  
  // 🔧 OTIMIZAÇÃO: Processar sessionStorage apenas uma vez
  useEffect(() => {
    if (typeof window !== "undefined" && chatId && !hasProcessedPending) {
      const pendingData = sessionStorage.getItem(`pending_${chatId}`);
      console.log(`🔍 [${chatId}] Verificando sessionStorage:`, pendingData);
      
      if (pendingData) {
        try {
          const parsed = JSON.parse(pendingData);
          setPendingMessage(parsed.message);
          setPendingModel(parsed.model);
          console.log(`📦 [${chatId}] Dados parseados:`, parsed.message, "com modelo:", parsed.model);
        } catch (e) {
          setPendingMessage(pendingData);
          console.log(`📦 [${chatId}] Formato legado:`, pendingData);
        }
        // Limpar sessionStorage imediatamente após processar
        sessionStorage.removeItem(`pending_${chatId}`);
      }
      setHasProcessedPending(true);
    }
  }, [chatId, hasProcessedPending]);

  // 🔧 OTIMIZAÇÃO: Modelo inicial mais inteligente
  const urlModel = searchParams?.get('model');
  const initialModel = pendingModel || urlModel || 'chatgpt-4o-latest';
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [selectedModelName, setSelectedModelName] = useState<string>(() => {
    const m = [...defaultMainModels, ...defaultAdditionalModels].find(m => m.id === initialModel);
    return m?.name ?? 'ChatGPT 4o';
  });
  const [currentChatTitle, setCurrentChatTitle] = useState<string>('Nova conversa');

  // Controles de UI
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMoreModels, setShowMoreModels] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Estado para controlar a galeria de imagens
  const [showImageGallery, setShowImageGallery] = useState(false);

  // 🔧 OTIMIZAÇÃO: Modelos carregados apenas uma vez
  const [mainModels, setMainModels] = useState<Model[]>(defaultMainModels);
  const [additionalModels, setAdditionalModels] = useState<Model[]>(defaultAdditionalModels);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Refs para fechar menus
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fechar os dropdowns de modelos quando clicar fora
      const targetElement = event.target as Element;
      
      // Se o clique não foi em um botão de modelo ou dentro do dropdown
      if (!targetElement.closest('[data-model-dropdown]') && 
          !targetElement.closest('[data-more-models]')) {
        setShowModelDropdown(false);
        setShowMoreModels(false);
        setActiveCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chatwitia/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Nova conversa',
          model: selectedModel
        })
      });
      
      if (response.ok) {
        const newChat = await response.json();
        router.push(`/chatwitia/${newChat.id}`);
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };
  
  // Add this function to update the session's model in the database
  const updateSessionModel = async (sessionId: string, model: string) => {
    try {
      const response = await fetch(`/api/chatwitia/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model })
      });
      
      if (response.ok) {
        console.log(`Model updated in database to: ${model}`);
        return true;
      } else {
        console.error("Failed to update model in database");
        return false;
      }
    } catch (error) {
      console.error("Error updating model in database:", error);
      return false;
    }
  };

  // Modify handleModelSelect function
  const handleModelSelect = (modelId: string, modelName: string) => {
    console.log(`Modelo selecionado - ID: ${modelId}, Nome: ${modelName}`);
    
    // First update the UI state
    setSelectedModel(modelId);
    setSelectedModelName(modelName);
    setShowModelDropdown(false);
    setShowMoreModels(false);
    setActiveCategory(null);
    
    // Then update the database if we have a chat session
    if (chatId) {
      updateSessionModel(chatId, modelId);
    }
  };
  
  // Debug de modelo selecionado
  useEffect(() => {
    console.log(`Página com modelo selecionado: ${selectedModel}`);
  }, [selectedModel]);
  
  // Handle chat title changes
  const handleChatTitleChange = useCallback((title: string) => {
    // Prevent unnecessary updates if title is already the same
    if (title === currentChatTitle) return;
    
    setCurrentChatTitle(title);
    
    // Also persist to backend
    fetch(`/api/chatwitia/sessions/${chatId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    }).catch(error => {
      console.error("Error updating chat title:", error);
    });
  }, [chatId, currentChatTitle]);
  
  // Organizing modelos adicionais por categoria
  const getModelsByCategory = () => {
    const modelCategories: {[key: string]: Model[]} = {};
    
    additionalModels.forEach(model => {
      const categoryName = model.category || 'Outros';
      if (!modelCategories[categoryName]) {
        modelCategories[categoryName] = [];
      }
      modelCategories[categoryName].push(model);
    });
    
    return modelCategories;
  };

  // 🔧 OTIMIZAÇÃO: Carregar modelos apenas uma vez
  const loadAvailableModels = async () => {
    if (modelsLoaded || isLoadingModels) {
      console.log('⏭️ Modelos já carregados ou carregando, pulando...');
      return;
    }
    
    setIsLoadingModels(true);
    try {
      const response = await fetch('/api/chatwitia');
      if (response.ok) {
        const data = await response.json();
        
        // Log apenas uma vez para debug
        console.log('Modelos disponíveis da API:', data);
        
        // Processar modelos sem logs excessivos
        const newAdditionalModels: Array<{
          id: string;
          name: string;
          description: string;
          category: string;
          beta?: boolean;
          experimental?: boolean;
        }> = [];
        
        // Processar modelos Claude da Anthropic
        if (data.models?.claude?.length) {
          data.models.claude.forEach((model: any) => {
            newAdditionalModels.push({
              id: model.id,
              name: model.display_name || model.id,
              description: `Modelo Anthropic ${model.id}`,
              category: 'Claude / Anthropic'
            });
          });
        }

        // Processar outros modelos sem logs excessivos
        ['gpt4', 'gpt4o', 'oSeries', 'gpt3'].forEach(category => {
          if (data.models?.[category]?.length) {
            data.models[category].forEach((model: any) => {
              if (!mainModels.some(m => m.id === model.id)) {
                newAdditionalModels.push({
                  id: model.id,
                  name: model.id.replace('gpt-', 'GPT-').replace(/-/g, ' '),
                  description: `Modelo ${model.id}`,
                  category: category === 'gpt4o' ? 'GPT-4o' : category === 'oSeries' ? 'O Series' : category.toUpperCase()
                });
              }
            });
          }
        });
        
        // Adicionar modelos padrão que não existem na API
        defaultAdditionalModels.forEach(model => {
          if (!newAdditionalModels.some(m => m.id === model.id)) {
            newAdditionalModels.push(model);
          }
        });
        
        setAdditionalModels(newAdditionalModels);
        setModelsLoaded(true);
      }
    } catch (error) {
      console.error("Erro ao carregar modelos disponíveis:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };
  
  // 🔧 OTIMIZAÇÃO: Carregar modelos apenas uma vez quando componente monta
  useEffect(() => {
    if (!modelsLoaded) {
      loadAvailableModels();
    }
  }, [modelsLoaded]);

  // 🔧 OTIMIZAÇÃO: Carregar info do chat apenas uma vez e de forma mais eficiente
  useEffect(() => {
    if (chatId && modelsLoaded) {
      const fetchChatInfo = async () => {
        try {
          const response = await fetch(`/api/chatwitia/sessions/${chatId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.model && data.model !== selectedModel) {
              console.log(`🔄 Carregando modelo do chat: ${data.model}`);
              setSelectedModel(data.model);
              
              // Atualizar nome do modelo
              const allModels = [...mainModels, ...additionalModels];
              const modelInfo = allModels.find(m => m.id === data.model);
              if (modelInfo) {
                setSelectedModelName(modelInfo.name);
              }
            }
            
            // Set current chat title
            if (data.title) {
              setCurrentChatTitle(data.title);
            }
          }
        } catch (error) {
          console.error("Error fetching chat info:", error);
        }
      };
      
      fetchChatInfo();
    }
  }, [chatId, modelsLoaded]); // Remover dependências desnecessárias

  // 🔧 OTIMIZAÇÃO: Atualizar nome do modelo apenas quando necessário
  useEffect(() => {
    if (modelsLoaded) {
      const allModels = [...mainModels, ...additionalModels];
      const modelInfo = allModels.find(m => m.id === selectedModel);
      const newModelName = modelInfo?.name || selectedModel.replace('gpt-', 'GPT-').replace(/-/g, ' ');
      
      if (newModelName !== selectedModelName) {
        console.log(`Atualizando nome do modelo para: ${selectedModel}`);
        setSelectedModelName(newModelName);
      }
    }
  }, [selectedModel, modelsLoaded]); // Remover dependências desnecessárias

  // 🔧 OTIMIZAÇÃO: Limpar URL apenas uma vez
  useEffect(() => {
    if (!chatId) return;
    
    const cleanupUrl = () => {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('model')) {
          url.searchParams.delete('model');
          window.history.replaceState({}, document.title, url.toString());
        }
      }
    };
    
    // Executar apenas uma vez por chatId
    const timeoutId = setTimeout(cleanupUrl, 100);
    return () => clearTimeout(timeoutId);
  }, [chatId]);

  // 🔧 OTIMIZAÇÃO: Processar modelo pendente apenas quando necessário
  useEffect(() => {
    if (pendingModel && pendingModel !== selectedModel && hasProcessedPending) {
      console.log(`🔄 [${chatId}] Aplicando modelo pendente: ${pendingModel}`);
      setSelectedModel(pendingModel);
    }
  }, [pendingModel, hasProcessedPending, chatId]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with chat history */}
      <ChatSidebar 
        currentChatId={chatId}
        onCreateNewChat={createNewChat}
        onOpenGallery={() => setShowImageGallery(true)}
        selectedModel={selectedModel}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header with model selector */}
        <div className="border-b border-border flex items-center justify-between p-2">
          <div className="flex items-center">
            <Link 
              href="/chatwitia" 
              className="mr-3 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </Link>
            
            <div className="relative inline-block" data-model-dropdown="true">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md hover:bg-accent transition-colors"
                data-model-dropdown="true"
              >
                <span className="text-foreground">{selectedModelName}</span>
                <ChevronDown size={16} className="text-muted-foreground" />
              </button>
              
              {showModelDropdown && (
                <div 
                  ref={modelDropdownRef}
                  className="absolute left-0 mt-1 w-80 bg-popover border border-border rounded-md shadow-lg z-50"
                  data-model-dropdown="true"
                >
                  <div className="p-3 border-b border-border">
                    <h3 className="font-medium text-sm mb-1 text-foreground">Modelo</h3>
                  </div>
                  
                  <div className="p-2" data-model-dropdown="true">
                    {/* Modelos principais */}
                    {mainModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          handleModelSelect(model.id, model.name);
                        }}
                        className={`w-full text-left flex items-start p-2 rounded-md hover:bg-accent ${
                          selectedModel === model.id ? 'bg-accent' : ''
                        }`}
                        data-model-dropdown="true"
                      >
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-sm text-foreground">{model.name}</span>
                            {model.beta && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full">
                                BETA
                              </span>
                            )}
                            {model.experimental && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                                PRÉVIA EXPERIMENTAL
                              </span>
                            )}
                            {selectedModel === model.id && (
                              <svg className="w-4 h-4 ml-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                        </div>
                      </button>
                    ))}
                    
                    {/* Seção "Mais Modelos" */}
                    <div className="mt-2 border-t border-border pt-2 relative" data-model-dropdown="true">
                      <div 
                        className="w-full text-left p-2 rounded-md hover:bg-accent cursor-pointer"
                        onClick={() => setShowMoreModels(!showMoreModels)}
                        data-model-dropdown="true"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-foreground">Mais Modelos</span>
                          <ChevronRight 
                            size={16} 
                            className={`transition-transform text-muted-foreground ${showMoreModels ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>
                      
                      {showMoreModels && (
                        <div 
                          className="absolute left-full top-0 ml-1 w-80 bg-popover border border-border rounded-md shadow-lg z-50"
                          data-more-models="true"
                        >
                          <div className="p-2 max-h-96 overflow-y-auto" data-more-models="true">
                            {/* Exibir categorias */}
                            {Object.entries(getModelsByCategory()).map(([category, models]) => (
                              <div key={category} className="mb-2" data-more-models="true">
                                <div 
                                  className="font-medium text-sm p-2 border-b border-border cursor-pointer"
                                  onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                                  data-more-models="true"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-foreground">{category}</span>
                                    <ChevronRight 
                                      size={14} 
                                      className={`transition-transform text-muted-foreground ${activeCategory === category ? 'rotate-90' : ''}`} 
                                    />
                                  </div>
                                </div>
                                
                                {(activeCategory === category || activeCategory === null) && (
                                  <div className="mt-1" data-more-models="true">
                                    {models.map(model => (
                                      <button
                                        key={model.id}
                                        onClick={() => {
                                          handleModelSelect(model.id, model.name);
                                          setShowMoreModels(false);
                                          setActiveCategory(null);
                                        }}
                                        className={`w-full text-left flex items-start p-2 rounded-md hover:bg-accent ${
                                          selectedModel === model.id ? 'bg-accent' : ''
                                        }`}
                                        data-more-models="true"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center">
                                            <span className="font-medium text-sm text-foreground">{model.name}</span>
                                            {selectedModel === model.id && (
                                              <svg className="w-4 h-4 ml-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                              </svg>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Title display in header */}
          <div className="flex-1 text-center overflow-hidden px-4">
            <h1 className="text-sm font-medium truncate text-foreground">{currentChatTitle}</h1>
          </div>
          
          <div className="w-8"></div> {/* Spacer for balance */}
        </div>
        
        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatwitIA
            key={chatId}
            chatId={chatId}
            modelId={selectedModel}
            initialMessage={pendingMessage}
            onTitleChange={handleChatTitleChange}
          />
        </div>
      </div>
      
      {/* Image Gallery Modal */}
      <ImageGalleryModal 
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
      />
    </div>
  );
} 