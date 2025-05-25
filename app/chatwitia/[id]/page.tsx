//app/chatwitia/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';  // ← importe useSearchParams
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Plus, ChevronDown, User2, X, ChevronRight, MoreVertical, Share, Edit, Archive, Trash2, ImageIcon } from 'lucide-react';
import ChatwitIA from '@/app/components/ChatwitIA/ChatwithIA';
import ImageGalleryModal from '@/app/components/ImageGallery';

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  createdAt: Date;
  dateGroup: string;
}

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
  { id: "gpt-4.1-nano", name: "GPT-4.1 nano", description: "Fastest, most cost-effective GPT-4.1 model" },
  { id: "gpt-4.1", name: "GPT-4.1", description: "Ótimo para escrita e explorar ideias", beta: true, experimental: true },
  { id: "gpt-4o-tasks", name: "GPT-4o com tarefas agendadas", description: "Peça ao ChatGPT para dar um retorno mais tarde", beta: true },
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

  // Histórico e agrupamentos
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [groupedChats, setGroupedChats] = useState<Record<string, ChatHistory[]>>({});
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [filteredGroups, setFilteredGroups] = useState<Record<string, ChatHistory[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Controles de UI
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMoreModels, setShowMoreModels] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [chatToRename, setChatToRename] = useState<ChatHistory | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [remountKey, setRemountKey] = useState(0);
  
  // Estado para controlar a galeria de imagens
  const [showImageGallery, setShowImageGallery] = useState(false);

  // 🔧 OTIMIZAÇÃO: Modelos carregados apenas uma vez
  const [mainModels, setMainModels] = useState<Model[]>(defaultMainModels);
  const [additionalModels, setAdditionalModels] = useState<Model[]>(defaultAdditionalModels);
  const [apiModels, setApiModels] = useState<any>({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Refs para fechar menus
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fechar o context menu quando clicar fora
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setActiveContextMenu(null);
      }
      
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

  // Format dates helper
  const formatDate = (date: Date) => {
    const now = new Date();
    
    // Resetar horas, minutos, segundos para comparar apenas as datas
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    const nowWithoutTime = new Date(now);
    nowWithoutTime.setHours(0, 0, 0, 0);
    
    // Calcular a diferença em dias
    const diffTime = nowWithoutTime.getTime() - dateWithoutTime.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  // Helper to determine which date group a chat belongs to
  const getDateGroup = (date: Date): string => {
    const now = new Date();
    
    // Resetar horas, minutos, segundos para comparar apenas as datas
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    const nowWithoutTime = new Date(now);
    nowWithoutTime.setHours(0, 0, 0, 0);
    
    // Calcular a diferença em dias
    const diffTime = nowWithoutTime.getTime() - dateWithoutTime.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return 'Últimos 7 dias';
    if (diffDays < 30) return 'Últimos 30 dias';
    
    // Return month name in Portuguese
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[date.getMonth()];
  };

  // Order of date groups for display
  const groupOrder = [
    'Hoje', 
    'Ontem', 
    'Últimos 7 dias', 
    'Últimos 30 dias', 
    'Dezembro', 'Novembro', 'Outubro', 'Setembro', 'Agosto', 
    'Julho', 'Junho', 'Maio', 'Abril', 'Março', 'Fevereiro', 'Janeiro'
  ];
  
  // Load chat histories
  const loadChatHistories = async () => {
    try {
      setIsLoadingChats(true);
      const response = await fetch('/api/chatwitia/sessions');
      if (response.ok) {
        const data = await response.json();
        
        // Format the data with date groups
        const histories: ChatHistory[] = data.map((session: any) => {
          const createdAt = new Date(session.createdAt);
          return {
            id: session.id,
            title: session.title || 'Nova conversa',
            date: formatDate(createdAt),
            createdAt: createdAt,
            dateGroup: getDateGroup(createdAt)
          };
        });
        
        // Sort by most recent creation date first
        histories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setChatHistories(histories);
        
        // Group chats by date category
        const groups: {[key: string]: ChatHistory[]} = {};
        histories.forEach(chat => {
          if (!groups[chat.dateGroup]) {
            groups[chat.dateGroup] = [];
          }
          groups[chat.dateGroup].push(chat);
        });
        
        setGroupedChats(groups);
        setFilteredGroups(groups);
        
        // Set current chat title
        const currentChat = histories.find(chat => chat.id === chatId);
        if (currentChat) {
          setCurrentChatTitle(currentChat.title);
        }
        
        // Initialize collapsed state for groups (all expanded by default)
        const collapsed: {[key: string]: boolean} = {};
        Object.keys(groups).forEach(group => {
          collapsed[group] = false;
        });
        setCollapsedGroups(collapsed);
      }
    } catch (error) {
      console.error("Error fetching chat histories:", error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    loadChatHistories();
  }, [chatId]);

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
        // Recarregar o histórico de chats
        await loadChatHistories();
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
  
  // Filtrar chats com base no termo de pesquisa
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Se não há termo de pesquisa, use os grupos originais
      setFilteredGroups(groupedChats);
      return;
    }
    
    // Filtrar os chats com base no termo de pesquisa (case insensitive)
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    const filteredHistories = chatHistories.filter(chat => {
      const title = chat.title.toLowerCase();
      // Um chat corresponde se TODOS os termos de pesquisa estão presentes no título
      return terms.every(term => title.includes(term));
    });
    
    // Reagrupar os chats filtrados
    const newGroups: {[key: string]: ChatHistory[]} = {};
    filteredHistories.forEach(chat => {
      if (!newGroups[chat.dateGroup]) {
        newGroups[chat.dateGroup] = [];
      }
      newGroups[chat.dateGroup].push(chat);
    });
    
    setFilteredGroups(newGroups);
  }, [searchTerm, chatHistories, groupedChats]);
  
  const toggleGroupCollapse = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };
  
  // Handle chat title changes
  const handleChatTitleChange = useCallback((title: string) => {
    // Prevent unnecessary updates if title is already the same
    if (title === currentChatTitle) return;
    
    setCurrentChatTitle(title);
    
    // Update chat histories list
    setChatHistories(prev => {
      // Check if this would actually change anything
      const chatNeedsUpdate = prev.some(chat => 
        chat.id === chatId && chat.title !== title
      );
      
      if (!chatNeedsUpdate) return prev;
      
      return prev.map(chat => 
        chat.id === chatId ? {...chat, title} : chat
      );
    });
    
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
  
  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent, chatId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveContextMenu(chatId);
  };
  
  const handleOpenRenameModal = (chat: ChatHistory) => {
    setChatToRename(chat);
    setNewChatTitle(chat.title);
    setRenameModalVisible(true);
    setActiveContextMenu(null);
  };
  
  const handleRenameChat = async () => {
    if (!chatToRename || !newChatTitle.trim()) return;
    
    try {
      const response = await fetch(`/api/chatwitia/sessions/${chatToRename.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newChatTitle })
      });
      
      if (response.ok) {
        // Update local state
        setChatHistories(prev => 
          prev.map(chat => 
            chat.id === chatToRename.id ? {...chat, title: newChatTitle} : chat
          )
        );
        
        // Update grouped chats
        setGroupedChats(prev => {
          const newGroups = {...prev};
          Object.keys(newGroups).forEach(group => {
            newGroups[group] = newGroups[group].map(chat => 
              chat.id === chatToRename.id ? {...chat, title: newChatTitle} : chat
            );
          });
          return newGroups;
        });
        
        // Update current chat title if this was the active chat
        if (chatToRename.id === chatId) {
          setCurrentChatTitle(newChatTitle);
        }
      }
    } catch (error) {
      console.error("Error renaming chat:", error);
    } finally {
      setRenameModalVisible(false);
      setChatToRename(null);
    }
  };
  
  const handleDeleteConfirmation = (chatId: string) => {
    setChatToDelete(chatId);
    setConfirmDeleteVisible(true);
    setActiveContextMenu(null);
  };
  
  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      const response = await fetch(`/api/chatwitia/sessions/${chatToDelete}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // If we deleted the current chat, navigate to the main page
        if (chatToDelete === chatId) {
          router.push('/chatwitia');
          return;
        }
        
        // Update local state by removing the deleted chat
        setChatHistories(prev => prev.filter(chat => chat.id !== chatToDelete));
        
        // Update grouped chats
        setGroupedChats(prev => {
          const newGroups = {...prev};
          Object.keys(newGroups).forEach(group => {
            newGroups[group] = newGroups[group].filter(chat => chat.id !== chatToDelete);
          });
          return newGroups;
        });
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setConfirmDeleteVisible(false);
      setChatToDelete(null);
    }
  };
  
  const handleShareChat = (chatId: string) => {
    // For now, just copy the URL to clipboard
    const url = `${window.location.origin}/chatwitia/${chatId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Link copiado para a área de transferência!');
      })
      .catch(err => {
        console.error('Erro ao copiar:', err);
      });
    setActiveContextMenu(null);
  };
  
  const handleArchiveChat = (chatId: string) => {
    // Placeholder for archive functionality
    alert('Funcionalidade de arquivamento será implementada em breve.');
    setActiveContextMenu(null);
  };

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
    <div className="flex h-screen">
      {/* Sidebar with chat history */}
      <div className="w-64 bg-gray-50 border-r h-full flex flex-col">
        {/* New Chat Button */}
        <div className="p-3 space-y-2">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 p-3 bg-white border rounded-md hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            <span>Nova conversa</span>
          </button>
          
          {/* Gallery Button */}
          <button 
            onClick={() => setShowImageGallery(true)}
            className="w-full flex items-center justify-center gap-2 p-3 bg-white border rounded-md hover:bg-gray-50 transition-colors"
          >
            <ImageIcon size={16} />
            <span>Galeria</span>
          </button>
        </div>
        
        {/* Search Box */}
        <div className="px-3 pb-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar conversas..."
              className="w-full p-2 pl-8 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* Chat History List - Grouped by date */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingChats ? (
            <div className="flex justify-center items-center h-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : Object.keys(filteredGroups).length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
              </h3>
              <p className="text-xs text-gray-500">
                {searchTerm 
                  ? `Não encontramos resultados para "${searchTerm}". Tente um termo diferente.` 
                  : 'Comece uma nova conversa para começar a usar o ChatwitIA.'}
              </p>
            </div>
          ) : (
            // Display groups in specific order
            groupOrder.map(group => {
              // Skip groups that don't have any chats
              if (!filteredGroups[group] || filteredGroups[group].length === 0) return null;
              
              return (
                <div key={group} className="mb-2">
                  <button 
                    onClick={() => toggleGroupCollapse(group)}
                    className="flex items-center justify-between w-full text-left text-xs font-medium text-gray-500 hover:text-gray-700 py-1 px-2"
                  >
                    <span>{group}</span>
                    <ChevronRight 
                      size={14} 
                      className={`transition-transform ${collapsedGroups[group] ? '' : 'rotate-90'}`} 
                    />
                  </button>
                  
                  {!collapsedGroups[group] && (
                    <div className="space-y-1 mt-1">
                      {filteredGroups[group].map(chat => (
                        <div key={chat.id} className="relative group">
                          <Link
                            href={`/chatwitia/${chat.id}`}
                            className={`w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors flex items-start gap-2 ${
                              chatId === chat.id ? 'bg-gray-100' : ''
                            }`}
                            onClick={() => setActiveContextMenu(null)}
                          >
                            <MessageSquare size={16} className="mt-1 shrink-0" />
                            <div className="overflow-hidden flex-1">
                              <div className="truncate text-sm font-medium">{chat.title}</div>
                            </div>
                          </Link>
                          
                          {/* Context menu button */}
                          <button
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContextMenu(e, chat.id);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {/* Context menu */}
                          {activeContextMenu === chat.id && (
                            <div 
                              ref={contextMenuRef}
                              className="absolute right-0 top-10 z-50 w-44 bg-white rounded-md shadow-lg border overflow-hidden"
                            >
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  onClick={() => handleShareChat(chat.id)}
                                >
                                  <Share size={16} />
                                  <span>Compartilhar</span>
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  onClick={() => handleOpenRenameModal(chat)}
                                >
                                  <Edit size={16} />
                                  <span>Renomear</span>
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  onClick={() => handleArchiveChat(chat.id)}
                                >
                                  <Archive size={16} />
                                  <span>Arquivar</span>
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  onClick={() => handleDeleteConfirmation(chat.id)}
                                >
                                  <Trash2 size={16} />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* User Info Section */}
        <div className="p-3 border-t">
          <button className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User2 size={18} />
            </div>
            <span className="text-sm">Minha Conta</span>
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header with model selector */}
        <div className="border-b flex items-center justify-between p-2">
          <div className="flex items-center">
            <Link 
              href="/chatwitia" 
              className="mr-3 p-1 rounded hover:bg-gray-100"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </Link>
            
            <div className="relative inline-block" data-model-dropdown="true">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md hover:bg-gray-50 transition-colors"
                data-model-dropdown="true"
              >
                <span>{selectedModelName}</span>
                <ChevronDown size={16} />
              </button>
              
              {showModelDropdown && (
                <div 
                  ref={modelDropdownRef}
                  className="absolute left-0 mt-1 w-80 bg-white border rounded-md shadow-lg z-50"
                  data-model-dropdown="true"
                >
                  <div className="p-3 border-b">
                    <h3 className="font-medium text-sm mb-1">Modelo</h3>
                  </div>
                  
                  <div className="p-2" data-model-dropdown="true">
                    {/* Modelos principais */}
                    {mainModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          handleModelSelect(model.id, model.name);
                        }}
                        className={`w-full text-left flex items-start p-2 rounded-md hover:bg-gray-50 ${
                          selectedModel === model.id ? 'bg-blue-50' : ''
                        }`}
                        data-model-dropdown="true"
                      >
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-sm">{model.name}</span>
                            {model.beta && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                BETA
                              </span>
                            )}
                            {model.experimental && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                PRÉVIA EXPERIMENTAL
                              </span>
                            )}
                            {selectedModel === model.id && (
                              <svg className="w-4 h-4 ml-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                        </div>
                      </button>
                    ))}
                    
                    {/* Seção "Mais Modelos" */}
                    <div className="mt-2 border-t pt-2 relative" data-model-dropdown="true">
                      <div 
                        className="w-full text-left p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => setShowMoreModels(!showMoreModels)}
                        data-model-dropdown="true"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Mais Modelos</span>
                          <ChevronRight 
                            size={16} 
                            className={`transition-transform ${showMoreModels ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>
                      
                      {showMoreModels && (
                        <div 
                          className="absolute left-full top-0 ml-1 w-80 bg-white border rounded-md shadow-lg z-50"
                          data-more-models="true"
                        >
                          <div className="p-2 max-h-96 overflow-y-auto" data-more-models="true">
                            {/* Exibir categorias */}
                            {Object.entries(getModelsByCategory()).map(([category, models]) => (
                              <div key={category} className="mb-2" data-more-models="true">
                                <div 
                                  className="font-medium text-sm p-2 border-b cursor-pointer"
                                  onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                                  data-more-models="true"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{category}</span>
                                    <ChevronRight 
                                      size={14} 
                                      className={`transition-transform ${activeCategory === category ? 'rotate-90' : ''}`} 
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
                                        className={`w-full text-left flex items-start p-2 rounded-md hover:bg-gray-50 ${
                                          selectedModel === model.id ? 'bg-blue-50' : ''
                                        }`}
                                        data-more-models="true"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center">
                                            <span className="font-medium text-sm">{model.name}</span>
                                            {selectedModel === model.id && (
                                              <svg className="w-4 h-4 ml-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                              </svg>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
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
            <h1 className="text-sm font-medium truncate">{currentChatTitle}</h1>
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
      
      {/* Rename Modal */}
      {renameModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Renomear conversa</h3>
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
              placeholder="Digite um novo título"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModalVisible(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleRenameChat}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!newChatTitle.trim()}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Delete Modal */}
      {confirmDeleteVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-2">Excluir conversa</h3>
            <p className="text-gray-600 mb-4">Esta ação não pode ser desfeita. Deseja continuar?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteVisible(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteChat}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Gallery Modal */}
      <ImageGalleryModal 
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
      />
    </div>
  );
} 