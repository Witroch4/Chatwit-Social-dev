'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  ImageIcon, 
  X, 
  ChevronRight, 
  MessageSquare, 
  MoreVertical, 
  Share, 
  Edit, 
  Archive, 
  Trash2, 
  User2,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LoginBadge from '@/components/auth/login-badge';

interface ChatHistory {
  id: string;
  title: string;
  date: string;
  createdAt: Date;
  dateGroup: string;
}

interface ChatSidebarProps {
  currentChatId?: string;
  onCreateNewChat: () => void;
  onOpenGallery: () => void;
  selectedModel: string;
}

export default function ChatSidebar({ 
  currentChatId, 
  onCreateNewChat, 
  onOpenGallery,
  selectedModel 
}: ChatSidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [groupedChats, setGroupedChats] = useState<{[key: string]: ChatHistory[]}>({});
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [filteredGroups, setFilteredGroups] = useState<{[key: string]: ChatHistory[]}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<{[key: string]: boolean}>({});
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [chatToRename, setChatToRename] = useState<ChatHistory | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setActiveContextMenu(null);
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
            title: session.title || `Conversa de ${formatDate(createdAt)}`,
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
        // If we deleted the current chat, navigate to the main page
        if (chatToDelete === currentChatId) {
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

  return (
    <>
      <div className="w-64 bg-muted/30 border-r border-border h-full flex flex-col">
        {/* New Chat Button */}
        <div className="p-3 space-y-2">
          <button 
            onClick={onCreateNewChat}
            className="w-full flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Plus size={16} />
            <span className="text-foreground">Nova conversa</span>
          </button>
          
          {/* Gallery Button */}
          <button 
            onClick={onOpenGallery}
            className="w-full flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-md hover:bg-accent transition-colors"
          >
            <ImageIcon size={16} />
            <span className="text-foreground">Galeria</span>
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
              className="w-full p-2 pl-8 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground"
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
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : Object.keys(filteredGroups).length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-foreground mb-2">
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
              </h3>
              <p className="text-xs text-muted-foreground">
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
                    className="flex items-center justify-between w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground py-1 px-2"
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
                            className={`w-full text-left p-3 rounded-md hover:bg-accent transition-colors flex items-start gap-2 ${
                              currentChatId === chat.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => setActiveContextMenu(null)}
                          >
                            <MessageSquare size={16} className="mt-1 shrink-0 text-muted-foreground" />
                            <div className="overflow-hidden flex-1">
                              <div className="truncate text-sm font-medium text-foreground">{chat.title}</div>
                            </div>
                          </Link>
                          
                          {/* Context menu button */}
                          <button 
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
                              className="absolute right-0 top-10 z-50 w-44 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
                            >
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
                                  onClick={() => handleShareChat(chat.id)}
                                >
                                  <Share size={16} />
                                  <span>Compartilhar</span>
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
                                  onClick={() => handleOpenRenameModal(chat)}
                                >
                                  <Edit size={16} />
                                  <span>Renomear</span>
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
                                  onClick={() => handleArchiveChat(chat.id)}
                                >
                                  <Archive size={16} />
                                  <span>Arquivar</span>
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
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
        
        {/* User Info Section with LoginBadge dropdown */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <User2 size={18} className="text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground flex-1 text-left">Minha Conta</span>
                <ChevronDown size={16} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="top" 
              align="start" 
              className="w-64 p-0"
            >
              <LoginBadge user={session?.user} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rename Modal */}
      {renameModalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 text-foreground">Renomear conversa</h3>
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              className="w-full p-2 border border-border rounded-md mb-4 bg-background text-foreground placeholder:text-muted-foreground"
              placeholder="Digite um novo título"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModalVisible(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleRenameChat}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-2 text-foreground">Excluir conversa</h3>
            <p className="text-muted-foreground mb-4">Esta ação não pode ser desfeita. Deseja continuar?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteVisible(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteChat}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 