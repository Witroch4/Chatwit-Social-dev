import { useState, useEffect, useRef, useCallback } from 'react';
import openaiService from '@/services/openai';
import { toast } from 'sonner';
import { useSocket } from './useSocket';

export interface FileWithContent {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
  created_at: number;
  content?: string;
}

export interface UploadContent {
  type: 'upload' | 'document';
  file: {
    name: string;
    type: string;
    content: string;
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | UploadContent | any[];
}

export const useChatwitIA = (initialChatId?: string | null, modelId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialChatId || null);
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [activePdfFileId, setActivePdfFileId] = useState<string | null>(null);
  const [isPdfQuerying, setIsPdfQuerying] = useState(false);

  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Função para perguntar sobre um arquivo PDF
  const askAboutPdf = async (fileId: string, question: string) => {
    try {
      setIsPdfQuerying(true);
      setError(null);
      
      // Enviar a pergunta como mensagem do usuário
      const userMessage: Message = {
        role: 'user',
        content: question
      };
      
      // Adiciona a pergunta às mensagens
      setMessages(prev => [...prev, userMessage]);
      
      // Cria uma mensagem vazia do assistente para mostrar carregamento
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      // Chama a API para processar a pergunta
      const answer = await openaiService.askAboutPdf(fileId, question);
      
      // Atualiza a mensagem do assistente com a resposta
      setMessages(prev => {
        const newMessages = [...prev];
        // Substitui a última mensagem (a vazia do assistente) pela resposta
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: answer
        };
        return newMessages;
      });
      
      return answer;
    } catch (err: any) {
      console.error('Erro ao perguntar sobre PDF:', err);
      setError(err.message || 'Erro ao processar pergunta sobre o PDF');
      
      // Remove a mensagem vazia do assistente em caso de erro
      setMessages(prev => prev.slice(0, prev.length - 1));
      
      toast.error(`Erro ao processar pergunta: ${err.message}`);
      throw err;
    } finally {
      setIsPdfQuerying(false);
    }
  };

  // Configurar o arquivo PDF ativo para consultas
  const setActivePdf = (fileId: string | null) => {
    setActivePdfFileId(fileId);
  };

  // Verificar se há um PDF ativo
  const hasActivePdf = () => {
    return activePdfFileId !== null;
  };

  // Listar todos os arquivos
  const listFiles = async () => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      const fileList = await openaiService.listFiles();
      setFiles(fileList.data || []);
      return fileList.data;
    } catch (err: any) {
      setFileError(err.message || 'Erro ao listar arquivos');
      return [];
    } finally {
      setIsFileLoading(false);
    }
  };

  // Upload de um arquivo
  const uploadFile = async (file: File, purpose: any) => {
    try {
      setIsFileLoading(true);
      setFileError(null);
      const response = await openaiService.uploadFile(file, { purpose });
      
      // Adicionar o arquivo à lista local
      setFiles(prev => [...prev, response]);
      
      // Se for um PDF, perguntar se o usuário deseja ativá-lo para consultas
      if (file.type === 'application/pdf') {
        setActivePdfFileId(response.id);
        toast.success(`PDF "${file.name}" carregado e ativado para consultas.`);
      } else {
        toast.success(`Arquivo "${file.name}" carregado com sucesso.`);
      }
      
      return response;
    } catch (err: any) {
      setFileError(err.message || 'Erro ao fazer upload do arquivo');
      toast.error(`Erro ao fazer upload: ${err.message}`);
      return null;
    } finally {
      setIsFileLoading(false);
    }
  };

  // Resto do hook...
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    currentSessionId,
    files,
    isFileLoading,
    fileError,
    activePdfFileId,
    isPdfQuerying,
    uploadFile,
    listFiles,
    getFile,
    getFileContent,
    deleteFile,
    editImage,
    createImageVariation,
    askAboutPdf,
    setActivePdf,
    hasActivePdf
  };
}; 