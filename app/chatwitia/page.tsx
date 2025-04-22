'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Plus, ChevronDown, User2, X, ChevronRight, MoreVertical, Share, Edit, Archive, Trash2, LightbulbIcon, ArrowUp, Type, Mic, Settings, Upload, Image, Bold, Italic, List, ListOrdered, Heading, Code, FileCode } from 'lucide-react';
import ChatwitIA from '@/app/components/ChatwitIA/ChatwithIA';
import ChatwitIAWrapper from '@/app/components/ChatwitIA/ChatwitIAWrapper';

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  createdAt: Date;
  dateGroup: string;
}

// Main models
const defaultMainModels = [
  { id: "chatgpt-4o-latest", name: "ChatGPT 4o", description: "Excelente para a maioria das perguntas" },
  { id: "o3", name: "o3", description: "Usa reflexão avançada (baseado no gpt-4o-2024-05-13)" },
  { id: "o4-mini", name: "o4-mini", description: "Mais rápido em reflexão avançada" },
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", description: "Modelo Claude da Anthropic para tarefas avançadas" },
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
  
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [groupedChats, setGroupedChats] = useState<{[key: string]: ChatHistory[]}>({});
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [selectedModel, setSelectedModel] = useState('chatgpt-4o-latest');
  const [selectedModelName, setSelectedModelName] = useState('ChatGPT 4o');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMoreModels, setShowMoreModels] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<{[key: string]: boolean}>({});
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [chatToRename, setChatToRename] = useState<ChatHistory | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGroups, setFilteredGroups] = useState<{[key: string]: ChatHistory[]}>({});
  const [mainModels, setMainModels] = useState(defaultMainModels);
  const [additionalModels, setAdditionalModels] = useState(defaultAdditionalModels);
  const [apiModels, setApiModels] = useState<any>({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [forceRemount, setForceRemount] = useState(0);
  
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
        // Recarregar o histórico de chats
        await loadChatHistories();
          router.push(`/chatwitia/${newChat.id}`);
        }
      } catch (error) {
        console.error("Error creating new chat:", error);
    }
  };
  
  const handleModelSelect = (modelId: string, modelName: string) => {
    console.log(`Modelo selecionado - ID: ${modelId}, Nome: ${modelName}`);
    setSelectedModel(modelId);
    setSelectedModelName(modelName);
    setShowModelDropdown(false);
    setShowMoreModels(false);
    setActiveCategory(null);
  };
  
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
    const categories: {[key: string]: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      beta?: boolean;
      experimental?: boolean;
    }>} = {};
    
    additionalModels.forEach(model => {
      if (!categories[model.category]) {
        categories[model.category] = [];
      }
      categories[model.category].push(model);
    });
    
    return categories;
  };

  // Carregar modelos disponíveis da API
  const loadAvailableModels = async () => {
    try {
      setIsLoadingModels(true);
      const response = await fetch('/api/chatwitia');
      if (response.ok) {
        const data = await response.json();
        setApiModels(data);
        
        // Log para debug dos modelos disponíveis
        console.log('Modelos disponíveis da API:', data);
        
        // Processar GPT-4o e O Series para os modelos principais (manter os originais e adicionar novos)
        const gpt4oModels = data.models?.gpt4o || [];
        const oSeriesModels = data.models?.oSeries || [];
        
        // Adicionar modelos da API à lista de modelos adicionais
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
              description: `Modelo Anthropic ${model.id} (${model.created_at?.split('T')[0] || 'Data desconhecida'})`,
              category: 'Claude / Anthropic'
            });
          });
        }

        // Processar GPT-4
        if (data.models?.gpt4?.length) {
          data.models.gpt4.forEach((model: any) => {
            newAdditionalModels.push({
              id: model.id,
              name: model.id.replace('gpt-', 'GPT-').replace(/-/g, ' '),
              description: `Modelo ${model.id} (${model.created})`,
              category: 'GPT-4'
            });
          });
        }
        
        // Processar GPT-4o que não estão nos modelos principais
        if (data.models?.gpt4o?.length) {
          data.models.gpt4o.forEach((model: any) => {
            // Verificar se já não está nos modelos principais
            if (!mainModels.some(m => m.id === model.id)) {
              newAdditionalModels.push({
                id: model.id,
                name: model.id.replace('gpt-', 'GPT-').replace(/-/g, ' '),
                description: `Modelo ${model.id} (${model.created})`,
                category: 'GPT-4o'
              });
            }
          });
        }
        
        // Processar O Series que não estão nos modelos principais
        if (data.models?.oSeries?.length) {
          data.models.oSeries.forEach((model: any) => {
            // Verificar se já não está nos modelos principais
            if (!mainModels.some(m => m.id === model.id)) {
              newAdditionalModels.push({
                id: model.id,
                name: model.id,
                description: `Modelo ${model.id} (${model.created})`,
                category: 'O Series'
              });
            }
          });
        }
        
        // Processar GPT-3
        if (data.models?.gpt3?.length) {
          data.models.gpt3.forEach((model: any) => {
            newAdditionalModels.push({
              id: model.id,
              name: model.id.replace('gpt-', 'GPT-').replace(/-/g, ' '),
              description: `Modelo ${model.id} (${model.created})`,
              category: 'GPT-3'
            });
          });
        }
        
        // Adicionar outros modelos que existem como padrão
        defaultAdditionalModels.forEach(model => {
          if (!newAdditionalModels.some(m => m.id === model.id)) {
            newAdditionalModels.push(model);
          }
        });
        
        // Atualizar estado
        setAdditionalModels(newAdditionalModels);
      }
    } catch (error) {
      console.error("Erro ao carregar modelos disponíveis:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };
  
  // Carregar modelos quando o componente é montado
  useEffect(() => {
    loadAvailableModels();
  }, []);

  const handleChatTitleChange = useCallback((title: string) => {
    // No action needed for direct title changes on the main page
  }, []);

  // This function will handle when a chat session is created and update the URL
  const handleSessionChange = useCallback((sessionId: string | null) => {
    if (sessionId) {
      // Redirect to the specific chat session page
      router.push(`/chatwitia/${sessionId}`);
    }
  }, [router]);

  // Function to handle initial user message submission
  const handleInitialMessage = async (userInput: string) => {
    if (!userInput.trim()) return;
    
    try {
      console.log("Criando nova sessão para mensagem:", userInput);
      // 1. Create a new session with the current model
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
        console.log("Nova sessão criada com ID:", newChat.id);
        
        // 2. Store the pending message to be sent after navigation
        setPendingMessage(userInput);
        console.log("Mensagem armazenada para envio após navegação:", userInput);
        
        // 3. Navigate to the new chat with the message in query params for reliability
        router.push(`/chatwitia/${newChat.id}?initialMessage=${encodeURIComponent(userInput)}`);
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with chat history */}
      <div className="w-64 bg-gray-50 border-r h-full flex flex-col">
        {/* New Chat Button */}
        <div className="p-3">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 p-3 bg-white border rounded-md hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            <span>Nova conversa</span>
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
                            className={`w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors flex items-start gap-2`}
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
            <h1 className="text-sm font-medium truncate">Nova conversa</h1>
          </div>
          
          <div className="w-8"></div> {/* Spacer for balance */}
        </div>
        
        {/* Chat Interface - Agora usando o wrapper em vez do componente real */}
        <div className="flex-1 overflow-hidden">
          <ChatwitIAWrapper onSendInitialMessage={handleInitialMessage} />
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
    </div>
  );
} 