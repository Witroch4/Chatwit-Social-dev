"use client";

import axios from "axios";
import {
  Video,
  Image as ImageIcon,
  FileImage,
  UploadCloud,
  X,
  Check,
  Loader2,
  ExternalLink
} from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MetaMediaFile {
  id: string;
  file?: File;
  progress: number;
  status: 'uploading' | 'success' | 'error' | 'waiting';
  url?: string; // URL original (MinIO)
  mediaHandle?: string; // Handle da API Meta
  mime_type?: string;
  error?: string;
}

interface MetaMediaUploadProps {
  uploadedFiles: MetaMediaFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<MetaMediaFile[]>>;
  allowedTypes?: string[]; // e.g. ['video/mp4', 'image/jpeg']
  maxSizeMB?: number;
  title?: string;
  description?: string;
  maxFiles?: number;
  onUploadComplete?: (mediaHandle: string, file: MetaMediaFile) => void;
}

export default function MetaMediaUpload({
  uploadedFiles,
  setUploadedFiles,
  allowedTypes = ['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/jpg'],
  maxSizeMB = 16,
  title = "Upload para API Meta",
  description = "Faça upload de mídia para a API Meta (vídeos, imagens)",
  maxFiles = 1,
  onUploadComplete,
}: MetaMediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Verificar se já temos arquivos suficientes
      if (uploadedFiles.length >= maxFiles) {
        toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
        return;
      }

      // Verificar tamanho e tipo dos arquivos
      const validFiles = acceptedFiles.filter(file => {
        // Verificar tamanho
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`Arquivo ${file.name} excede o tamanho máximo de ${maxSizeMB}MB`);
          return false;
        }

        // Verificar tipo
        if (!allowedTypes.includes(file.type)) {
          toast.error(`Tipo de arquivo não permitido: ${file.type}`);
          return false;
        }

        return true;
      });

      // Se não há arquivos válidos, retornar
      if (validFiles.length === 0) return;

      // Se há limites, verificar quantos arquivos ainda podemos adicionar
      const remainingSlots = maxFiles - uploadedFiles.length;
      const filesToAdd = validFiles.slice(0, remainingSlots);

      // Adicionar arquivos à lista
      const newFiles: MetaMediaFile[] = filesToAdd.map(file => ({
        id: Math.random().toString(36).substring(2, 11),
        file,
        progress: 0,
        status: 'waiting',
        mime_type: file.type,
      }));

      setUploadedFiles(prev => [...prev, ...newFiles]);

      // Iniciar upload automaticamente
      for (const fileData of newFiles) {
        uploadFileToMetaApi(fileData);
      }
    },
    [uploadedFiles, maxFiles, maxSizeMB, allowedTypes, setUploadedFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: isUploading || uploadedFiles.length >= maxFiles,
  });

  // Função para fazer upload de uma URL existente do MinIO para a API Meta
  const uploadExistingUrlToMeta = async (url: string, mimeType: string) => {
    if (!url) return;
    
    // Criar um novo arquivo na lista
    const newFile: MetaMediaFile = {
      id: Math.random().toString(36).substring(2, 11),
      progress: 0,
      status: 'uploading',
      url,
      mime_type: mimeType,
    };
    
    setUploadedFiles(prev => [...prev, newFile]);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("fileUrl", url);
      formData.append("mimeType", mimeType);
      formData.append("destination", "meta");

      const response = await axios.post("/api/upload-media", formData);

      if (response.data && response.data.success) {
        const updatedFile = {
          ...newFile,
          progress: 100,
          status: 'success' as const,
          mediaHandle: response.data.mediaHandle,
          url: newFile.url, // Manter a URL original para exibição
        };
        
        setUploadedFiles(prev =>
          prev.map(f => (f.id === newFile.id ? updatedFile : f))
        );

        toast.success("Upload da URL concluído");
        
        // Chamar callback se fornecido
        if (onUploadComplete) {
          onUploadComplete(response.data.mediaHandle, updatedFile);
        }
      } else {
        throw new Error(response.data.error || "Erro desconhecido no upload");
      }
    } catch (error: any) {
      console.error("Erro ao fazer upload da URL para API Meta:", error);
      
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === newFile.id
            ? {
                ...f,
                progress: 0,
                status: 'error',
                error: error.message || "Erro no upload",
              }
            : f
        )
      );

      toast.error("Erro no upload da URL", {
        description: error.message || "Não foi possível completar o upload para a API Meta",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Função para fazer upload do arquivo para o endpoint de upload da API Meta
  const uploadFileToMetaApi = async (fileData: MetaMediaFile) => {
    if (!fileData.file) return;
    
    setIsUploading(true);
    
    // Atualizar status para uploading
    setUploadedFiles(prev => 
      prev.map(f => f.id === fileData.id ? { ...f, status: 'uploading' } : f)
    );

    try {
      // Primeiro, fazer upload para o MinIO para obter a URL para preview
      const fileBuffer = await fileData.file.arrayBuffer();
      const formDataMinIO = new FormData();
      formDataMinIO.append("file", fileData.file);
      formDataMinIO.append("destination", "minio");
      
      const minioResponse = await axios.post("/api/upload-media", formDataMinIO, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / (progressEvent.total ?? 0)) * 50
          ); // Metade do progresso total para o upload no MinIO

          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileData.id ? { ...f, progress } : f
            )
          );
        },
      });
      
      if (!minioResponse.data.success) {
        throw new Error("Falha ao fazer upload para MinIO: " + minioResponse.data.error);
      }
      
      // Agora temos a URL do MinIO para preview
      const minioUrl = minioResponse.data.url;
      
      // Atualizar o arquivo com a URL do MinIO
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileData.id ? { ...f, url: minioUrl, progress: 50 } : f
        )
      );
      
      // Agora enviar para a API Meta
      const formDataMeta = new FormData();
      formDataMeta.append("fileUrl", minioUrl);
      formDataMeta.append("mimeType", fileData.file.type);
      formDataMeta.append("destination", "meta");

      const metaResponse = await axios.post("/api/upload-media", formDataMeta, {
        onUploadProgress: (progressEvent) => {
          const progress = 50 + Math.round(
            (progressEvent.loaded / (progressEvent.total ?? 0)) * 50
          ); // Segunda metade do progresso (50-100%)

          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileData.id ? { ...f, progress } : f
            )
          );
        },
      });

      // Se o upload foi bem-sucedido
      if (metaResponse.data && metaResponse.data.success) {
        const updatedFile = {
          ...fileData,
          progress: 100,
          status: 'success' as const,
          mediaHandle: metaResponse.data.mediaHandle,
          url: minioUrl, // Usar a URL do MinIO para exibição
          mime_type: fileData.file.type,
        };
        
        setUploadedFiles(prev =>
          prev.map(f => (f.id === fileData.id ? updatedFile : f))
        );

        toast.success(`Upload completo: ${fileData.file.name}`);
        
        // Chamar callback se fornecido
        if (onUploadComplete) {
          onUploadComplete(metaResponse.data.mediaHandle, updatedFile);
        }
      } else {
        throw new Error(metaResponse.data.error || "Erro desconhecido no upload para Meta API");
      }
    } catch (error: any) {
      console.error(`Erro ao fazer upload para API Meta: ${fileData.file.name}`, error);
      
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileData.id
            ? {
                ...f,
                progress: 0,
                status: 'error',
                error: error.message || "Erro no upload",
              }
            : f
        )
      );

      toast.error(`Erro no upload: ${fileData.file.name}`, {
        description: error.message || "Não foi possível completar o upload para a API Meta",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const [urlToUpload, setUrlToUpload] = useState("");
  const [mimeTypeToUpload, setMimeTypeToUpload] = useState("video/mp4");

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground mb-2">{description}</p>
        </div>

        {/* URL Input para upload de arquivos existentes */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              type="url"
              placeholder="URL da mídia já existente no MinIO"
              value={urlToUpload}
              onChange={(e) => setUrlToUpload(e.target.value)}
              disabled={isUploading || uploadedFiles.length >= maxFiles}
            />
          </div>
          <div className="w-28">
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={mimeTypeToUpload}
              onChange={(e) => setMimeTypeToUpload(e.target.value)}
              disabled={isUploading || uploadedFiles.length >= maxFiles}
            >
              <option value="video/mp4">Vídeo</option>
              <option value="image/jpeg">Imagem</option>
            </select>
          </div>
          <Button
            onClick={() => uploadExistingUrlToMeta(urlToUpload, mimeTypeToUpload)}
            disabled={!urlToUpload || isUploading || uploadedFiles.length >= maxFiles}
            size="sm"
          >
            Upload
          </Button>
        </div>

        {/* Área de Drag & Drop */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
          } ${
            isUploading || uploadedFiles.length >= maxFiles ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2">
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              Arraste arquivos ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: MP4, WebM, JPEG, PNG (Máx. {maxSizeMB}MB)
            </p>
          </div>
        </div>

        {/* Arquivos em upload */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Arquivos</p>
            
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-md border bg-card"
                >
                  {/* Ícone baseado no tipo */}
                  <div className="flex-shrink-0">
                    {file.mime_type?.includes("video") ? (
                      <Video className="h-8 w-8 text-blue-500" />
                    ) : file.mime_type?.includes("image") ? (
                      <FileImage className="h-8 w-8 text-green-500" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-500" />
                    )}
                  </div>

                  {/* Informações do arquivo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.file?.name || file.url?.split("/").pop() || "Arquivo"}
                    </p>
                    
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="h-1 mt-1" />
                    )}
                    
                    {file.status === 'success' && (
                      <div className="flex flex-col text-xs text-green-500 mt-1">
                        <div className="flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          <span className="truncate">
                            Processado com sucesso
                          </span>
                        </div>
                        {file.mediaHandle && (
                          <div className="mt-1 text-muted-foreground">
                            <span className="font-mono text-[10px] truncate">
                              Handle: {file.mediaHandle.substring(0, 12)}...
                            </span>
                          </div>
                        )}
                        {file.url && (
                          <div className="mt-1 flex items-center">
                            {file.mime_type?.includes("video") && (
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline flex items-center"
                              >
                                <span>Visualizar vídeo</span>
                                <ExternalLink className="h-2 w-2 ml-1" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {file.status === 'error' && (
                      <div className="text-xs text-red-500 mt-1 truncate">
                        Erro: {file.error}
                      </div>
                    )}
                    
                    {file.status === 'waiting' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Aguardando upload...
                      </div>
                    )}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex-shrink-0">
                    {file.status === 'uploading' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveFile(file.id)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerta sobre API Meta */}
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertTitle className="text-sm font-medium">Importante!</AlertTitle>
          <AlertDescription className="text-xs">
            Para usar a API Meta (WhatsApp), é necessário ter as credenciais corretas configuradas:
            <ul className="list-disc pl-5 mt-1">
              <li>WHATSAPP_TOKEN com permissões corretas</li>
              <li>META_APP_ID configurado no .env</li>
              <li>O token deve ter permissão para a API de Carregamento Retomável</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </TooltipProvider>
  );
} 