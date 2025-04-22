"use client";

// This is a simplified version of the hook that includes only
// the functionality needed to handle session ID for file uploads

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export interface FileWithContent {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
  created_at: number;
  content?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | any;
}

export type UploadPurpose = "vision" | "assistants" | "user_data";

export function useChatwitIA(initialChatId?: string | null, initialModel = 'chatgpt-4o-latest') {
  const { data: authSession } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialChatId || null);
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [activePdfFileId, setActivePdfFileId] = useState<string | null>(null);

  // Update session ID when initialChatId changes
  useEffect(() => {
    if (initialChatId) {
      setCurrentSessionId(initialChatId);
    }
  }, [initialChatId]);

  // Upload de um arquivo
  const uploadFile = async (file: File, purpose: UploadPurpose = 'user_data', fileId?: string) => {
    try {
      setIsFileLoading(true);
      
      // If we already have a fileId, we just need to add it to our list
      if (fileId) {
        const response = {
          id: fileId,
          filename: file.name,
          purpose: purpose,
          bytes: file.size,
          created_at: Date.now()
        };
        
        // Add to files list
        setFiles(prev => [...prev, response]);
        
        // If it's a PDF, prompt to activate it for queries
        if (file.type === 'application/pdf') {
          setActivePdfFileId(fileId);
          toast.success(`PDF "${file.name}" carregado e ativado para consultas.`);
        } else {
          toast.success(`Arquivo "${file.name}" carregado com sucesso.`);
        }
        
        return response;
      }
      
      // Otherwise, we need to upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);
      
      // Include the session ID if we have one
      if (currentSessionId) {
        formData.append('sessionId', currentSessionId);
      }
      
      const response = await fetch('/api/chatwitia/files', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add to files list
      setFiles(prev => [...prev, data]);
      
      // If it's a PDF, prompt to activate it for queries
      if (file.type === 'application/pdf') {
        setActivePdfFileId(data.id);
        toast.success(`PDF "${file.name}" carregado e ativado para consultas.`);
      } else {
        toast.success(`Arquivo "${file.name}" carregado com sucesso.`);
      }
      
      return data;
    } catch (err: any) {
      toast.error(`Erro ao fazer upload: ${err.message}`);
      return null;
    } finally {
      setIsFileLoading(false);
    }
  };

  // Delete a file
  const deleteFile = async (fileId: string) => {
    try {
      setIsFileLoading(true);
      
      const response = await fetch(`/api/chatwitia/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed with status: ${response.status}`);
      }
      
      // Remove the file from our list
      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      // If it was the active PDF, clear it
      if (activePdfFileId === fileId) {
        setActivePdfFileId(null);
      }
      
      toast.success('Arquivo excluído com sucesso.');
      return true;
    } catch (err: any) {
      toast.error(`Erro ao excluir arquivo: ${err.message}`);
      return false;
    } finally {
      setIsFileLoading(false);
    }
  };

  // Simplistic implementation of other required functions
  const sendMessage = async (content: string) => {
    // Implementation will be added as needed
    return Promise.resolve();
  };

  const editImage = async () => {
    // Implementation will be added as needed
    return Promise.resolve(null);
  };

  const createImageVariation = async () => {
    // Implementation will be added as needed
    return Promise.resolve(null);
  };

  const clearMessages = () => {
    // Implementation will be added as needed
  };

  // Return the needed functions and state
  return {
    messages,
    isLoading,
    error,
    currentSessionId,
    files,
    isFileLoading,
    activePdfFileId,
    uploadFile,
    deleteFile,
    sendMessage,
    clearMessages,
    editImage,
    createImageVariation,
    setActivePdf: setActivePdfFileId
  };
} 