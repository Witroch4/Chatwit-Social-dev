"use client";

import { useState, useEffect } from "react";
import { 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Eye, 
  MoreVertical, 
  Edit, 
  Trash, 
  FileText, 
  FilePlus, 
  RefreshCw,
  Phone,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  File,
  Download,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { downloadImagesAsZip } from "../utils/download-zip";
import { ImageGalleryDialog } from "./image-gallery-dialog";

// IMPORTANTE: Este componente NÃO deve envolver <tr> em <div>.
import { LeadContextMenu, ContextType, ContextAction } from "./lead-context-menu";
import { DeleteFileButton } from "./delete-file-button";
import { DialogDetalheLead } from "./dialog-detalhe-lead";
import { ProcessDialog, ProcessType } from "./process-dialog";

interface ArquivoLeadChatwit {
  id: string;
  fileType: string;
  dataUrl: string;
  pdfConvertido?: string | null;
  createdAt: string;
}

interface LeadItemProps {
  lead: {
    id: string;
    name?: string | null;
    nomeReal?: string | null;
    phoneNumber?: string | null;
    thumbnail?: string | null;
    sourceId: string;
    email?: string | null;
    anotacoes?: string | null;
    leadUrl?: string | null;
    usuario: {
      id: string;
      name: string;
      channel: string;
    };
    arquivos: ArquivoLeadChatwit[];
    pdfUnificado?: string | null;
    concluido: boolean;
    fezRecurso: boolean;
    createdAt: string;
    datasRecurso?: string | null;
    imagensConvertidas?: string | null;
  };
  onUnificarArquivos: (leadId: string) => void;
  onConverterEmImagens: (leadId: string) => void;
  onEdit: (lead: any) => void;
  onDelete: (id: string) => void;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  isLoading: boolean;
  isConverting: string | null;
}

export function LeadItem({ 
  lead, 
  onUnificarArquivos, 
  onConverterEmImagens,
  onEdit, 
  onDelete, 
  checked, 
  onCheckedChange,
  isLoading,
  isConverting
}: LeadItemProps) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDeletedFile, setIsDeletedFile] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processType, setProcessType] = useState<ProcessType>("unify");
  const [processStartTime, setProcessStartTime] = useState<number | null>(null);

  const displayName = lead.nomeReal || lead.name || "Lead sem nome";
  const formattedDate = format(new Date(lead.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR });
  
  const handleDelete = () => {
    setConfirmDelete(false);
    onDelete(lead.id);
  };

  const openChatwitChat = () => {
    if (!lead.leadUrl) {
      toast({
        title: "Erro",
        description: "Link do chat não encontrado.",
        variant: "destructive",
      });
      return;
    }
    window.open(lead.leadUrl, "_blank");
  };
  
  const openWhatsApp = () => {
    if (!lead.phoneNumber) {
      toast({
        title: "Erro",
        description: "Número de telefone não encontrado.",
        variant: "destructive",
      });
      return;
    }
    const phoneNumber = lead.phoneNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  const openFile = (url: string) => {
    window.open(url, "_blank");
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="h-3.5 w-3.5 text-red-500" />;
      case "image":
      case "jpg":
      case "jpeg":
      case "png":
        return <ImageIcon className="h-3.5 w-3.5 text-green-500" />;
      case "doc":
      case "docx":
      case "xls":
      case "xlsx":
      case "ppt":
      case "pptx":
        return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <File className="h-3.5 w-3.5" />;
    }
  };

  const handleDeleteFile = async (fileId: string, type: "arquivo" | "pdf" | "imagem") => {
    try {
      setIsDeletedFile(fileId);
      const params = new URLSearchParams();
      
      if (type === "arquivo") {
        params.append("id", fileId);
        params.append("type", "arquivo");
      } else if (type === "pdf" || type === "imagem") {
        params.append("leadId", lead.id);
        params.append("type", type);
      }
      
      const response = await fetch(`/api/admin/leads-chatwit/arquivos?${params.toString()}`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // O toast será exibido pelo componente DeleteFileButton
        return Promise.resolve();
      } else {
        throw new Error(data.error || "Erro ao excluir arquivo");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o arquivo. Tente novamente.",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsDeletedFile(null);
    }
  };
  
  // Função para recarregar dados do lead após a exclusão
  const reloadAfterDelete = () => {
    // A atualização acontecerá em dois momentos:
    // 1. Atualização imediata local (para feedback rápido ao usuário)
    // 2. Atualização completa via API (para sincronizar com o servidor)
    
    // Atualização local imediata (otimista)
    if (typeof onEdit === 'function') {
      // Chama onEdit para recarregar o lead atual
      onEdit({ id: lead.id, _refresh: true, _internal: true });
    }
    
    // Atualização completa via API após um pequeno atraso
    window.setTimeout(() => {
      if (typeof onEdit === 'function') {
        // Força uma atualização completa da lista de leads
        onEdit({ id: lead.id, _refresh: true, _internal: true, _forceUpdate: true });
      }
      
      // Exibe feedback ao usuário
      toast({
        title: "Atualizado",
        description: "Lista de arquivos atualizada com sucesso",
      });
    }, 500);
  };
  
  const handleContextMenuAction = (action: ContextAction, data?: any) => {
    switch (action) {
      case "atualizarLista":
        toast({
          title: "Atualizando",
          description: "Atualizando lista de leads...",
        });
        // Chame aqui a função de recarregar lista, se houver
        break;
      case "abrirLead":
        setDetailsOpen(true);
        break;
      case "reunificarArquivos":
        handleUnificarArquivos(lead.id);
        break;
      case "reconverterImagem":
        handlePdfToImages();
        break;
      case "excluirArquivo":
        if (data) {
          handleDeleteFile(data.id, data.type);
        }
        break;
      default:
        break;
    }
  };

  const handleEditLead = async (leadData: any) => {
    try {
      setIsSaving(true);
      
      // Verifica se é uma edição interna (do próprio dialog)
      // Não abrimos o dialog novamente se for uma edição interna
      await onEdit({
        ...leadData,
        _internal: true // Indicando que é uma edição interna
      });
      
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Houve um erro ao atualizar o lead",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailsOpen(true);
  };

  // Função para obter as imagens convertidas do PDF
  const getConvertedImages = () => {
    // Verificar se o lead tem imagensConvertidas
    if (lead.imagensConvertidas) {
      try {
        // Desserializar a string JSON para obter o array de URLs
        const imageUrls = JSON.parse(lead.imagensConvertidas);
        // Verificar se é um array e retorna somente URLs válidas
        if (Array.isArray(imageUrls)) {
          return imageUrls.filter(url => typeof url === 'string' && url.trim().length > 0);
        }
      } catch (error) {
        console.error("Erro ao processar URLs de imagens convertidas:", error);
      }
    }
    
    // Fallback: se não tiver imagensConvertidas ou ocorrer erro, tenta pegar pelas propriedades dos arquivos
    return lead.arquivos
      .filter(a => a.pdfConvertido)
      .map(a => a.pdfConvertido || "")
      .filter(url => url.length > 0);
  };
  
  // Função para fazer download de todas as imagens como ZIP
  const handleDownloadAllImages = async () => {
    const images = getConvertedImages();
    
    if (images.length === 0) {
      toast({
        title: "Erro",
        description: "Não há imagens para baixar",
        variant: "destructive",
      });
      return;
    }
    
    setIsDownloading(true);
    
    try {
      toast({
        title: "Preparando download",
        description: "Aguarde enquanto preparamos suas imagens...",
      });
      
      const result = await downloadImagesAsZip(images, `lead-${lead.id.substring(0, 8)}`);
      
      if (result && typeof result === 'object' && result.success) {
        toast({
          title: "Download concluído",
          description: `${result.success} de ${result.total} imagens baixadas com sucesso.`,
        });
      } else {
        throw new Error("Falha ao criar o arquivo ZIP");
      }
    } catch (error: any) {
      console.error("Erro ao baixar imagens:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível baixar as imagens",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUnificarArquivos = (leadId: string) => {
    // Configurar para exibir o dialog de unificação
    setProcessType("unify");
    setShowProcessDialog(true);
    setProcessStartTime(Date.now());
    
    // Chamar a função de unificação com pequeno atraso para dar tempo ao dialog abrir
    setTimeout(() => {
      onUnificarArquivos(leadId);
      
      // Fechar o dialog após um tempo mínimo (mesmo que o processo termine rapidamente)
      setTimeout(() => {
        setShowProcessDialog(false);
      }, 8000); // Mínimo de 8 segundos para exibir animações
    }, 500);
  };

  const handlePdfToImages = async () => {
    // Configurar para exibir o dialog de conversão
    setProcessType("convert");
    setShowProcessDialog(true);
    setProcessStartTime(Date.now());
    
    try {
      setIsLoadingImages(true);
      
      // Pequeno atraso para garantir que o dialog apareça primeiro
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch("/api/admin/leads-chatwit/convert-to-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Manter o dialog aberto por pelo menos 8 segundos mesmo que o processo termine
        const processTime = Date.now() - (processStartTime || Date.now());
        const minimumDisplayTime = Math.max(0, 8000 - processTime);
        
        setTimeout(() => {
          toast({
            title: "Sucesso",
            description: data.message || "Conversão de PDF para imagens concluída",
          });
          
          // Atualiza o lead após a conversão
          if (typeof onEdit === 'function') {
            onEdit({ id: lead.id, _refresh: true, _internal: true });
          }
          
          // Fechar o dialog após o tempo mínimo
          setShowProcessDialog(false);
          setIsLoadingImages(false);
        }, minimumDisplayTime);
      } else {
        throw new Error(data.error || "Erro ao converter PDF em imagens");
      }
    } catch (error: any) {
      console.error("Erro ao converter PDF para imagens:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível converter o PDF para imagens. Tente novamente.",
        variant: "destructive",
      });
      
      // Fechar o dialog em caso de erro
      setShowProcessDialog(false);
      setIsLoadingImages(false);
    }
  };

  return (
    <>
      {/* NÃO envolve <tr> em <div>, pois LeadContextMenu retorna Fragment */}
      <LeadContextMenu
        contextType="geral"
        onAction={handleContextMenuAction}
        data={{ id: lead.id }}
      >
        <TableRow className="group hover:bg-secondary/30">
          {/* Checkbox */}
          <TableCell className="w-[40px] p-2">
            <Checkbox 
              checked={checked} 
              onCheckedChange={onCheckedChange}
              aria-label="Selecionar lead"
            />
          </TableCell>
          
          {/* Lead – informações em linhas separadas */}
          <TableCell className="w-[250px] p-2 align-top">
            <div className="flex items-start gap-2">
              <Avatar className="h-9 w-9 mt-1 cursor-pointer" onClick={() => setShowFullImage(true)}>
                {lead.thumbnail ? (
                  <AvatarImage src={lead.thumbnail} alt={displayName} />
                ) : null}
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div 
                  className="font-medium hover:text-primary hover:underline cursor-pointer" 
                  onClick={handleViewDetails}
                >
                  {lead.name || "Lead sem nome"}
                </div>
                {lead.nomeReal && lead.nomeReal !== lead.name && (
                  <div className="text-xs text-muted-foreground">
                    Nome real: {lead.nomeReal}
                  </div>
                )}
                <div className="mt-1">
                  {lead.phoneNumber && (
                    <p className="text-sm">
                      <Phone className="inline-block h-3 w-3 mr-1" />
                      {lead.phoneNumber}
                    </p>
                  )}
                  <p className="text-sm">{formattedDate}</p>
                </div>
              </div>
            </div>
          </TableCell>
          
          {/* Usuário e canal */}
          <TableCell className="w-[100px] p-2">
            <div className="flex flex-col">
              <div className="font-medium">{lead.usuario.name}</div>
              <Badge variant="outline" className="w-fit">
                {lead.usuario.channel}
              </Badge>
            </div>
          </TableCell>
          
          {/* Arquivos */}
          <TableCell className="w-[150px] p-2">
            <div className="flex flex-wrap gap-2">
              {lead.arquivos.length > 0 ? (
                lead.arquivos.map((arquivo) => (
                  <LeadContextMenu
                    key={arquivo.id}
                    contextType="arquivo"
                    onAction={handleContextMenuAction}
                    data={{ id: arquivo.id, type: "arquivo" }}
                  >
                    <div 
                      className="relative rounded-md border p-1 hover:bg-accent hover:text-accent-foreground min-w-[40px] min-h-[40px] flex items-center justify-center group cursor-pointer"
                      onClick={() => openFile(arquivo.dataUrl)}
                    >
                      {getFileTypeIcon(arquivo.fileType)}
                      <span className="text-xs ml-1">{arquivo.fileType}</span>
                      <DeleteFileButton 
                        onDelete={() => handleDeleteFile(arquivo.id, "arquivo")}
                        fileType="arquivo"
                        fileName={arquivo.fileType}
                        onSuccess={reloadAfterDelete}
                      />
                    </div>
                  </LeadContextMenu>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Sem arquivos</span>
              )}
            </div>
          </TableCell>
          
          {/* PDF */}
          <TableCell className="w-[80px] p-2">
            {lead.pdfUnificado ? (
              <LeadContextMenu
                contextType="pdf"
                onAction={handleContextMenuAction}
                data={{ id: lead.id, type: "pdf" }}
              >
                <div 
                  className="relative rounded-md border p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center w-[60px] h-[60px] justify-center group mx-auto"
                  onClick={() => openFile(lead.pdfUnificado || "")}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <FileText className="h-6 w-6 text-red-500" />
                          <span className="text-xs mt-1">PDF</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>PDF Unificado</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DeleteFileButton 
                    onDelete={() => handleDeleteFile(lead.id, "pdf")}
                    fileType="pdf"
                    onSuccess={reloadAfterDelete}
                  />
                </div>
              </LeadContextMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => handleUnificarArquivos(lead.id)}
                disabled={isLoading || lead.arquivos.length === 0}
              >
                <FilePlus className="h-3.5 w-3.5 mr-1" />
                Unificar
              </Button>
            )}
          </TableCell>
          
          {/* Imagens */}
          <TableCell className="w-[80px] p-2">
            {lead.pdfUnificado ? (
              lead.arquivos.some(a => a.pdfConvertido) ? (
                <LeadContextMenu
                  contextType="imagem"
                  onAction={handleContextMenuAction}
                  data={{ id: lead.id, type: "imagem" }}
                >
                  <div 
                    className="relative rounded-md border p-2 hover:bg-accent hover:text-accent-foreground flex items-center w-[60px] h-[60px] justify-center group mx-auto cursor-pointer"
                    onClick={() => setShowGallery(true)}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center">
                            <ImageIcon className="h-6 w-6 text-green-500" />
                            <span className="text-xs mt-1">Imagens</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>PDF Convertido em Imagens</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DeleteFileButton 
                      onDelete={() => handleDeleteFile(lead.id, "imagem")}
                      fileType="imagem"
                      onSuccess={reloadAfterDelete}
                    />
                    
                    {/* Botão de debug temporário */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -bottom-4 -right-4 h-6 w-6 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Lead:', lead);
                        console.log('imagensConvertidas:', lead.imagensConvertidas);
                        console.log('Imagens obtidas via getConvertedImages():', getConvertedImages());
                        toast({
                          title: "Informações de debug",
                          description: `${getConvertedImages().length} imagens encontradas. Veja o console para detalhes.`,
                        });
                      }}
                    >
                      <span className="text-xs">?</span>
                    </Button>
                  </div>
                </LeadContextMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={handlePdfToImages}
                  disabled={isLoading || isLoadingImages}
                >
                  {isLoadingImages ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      Convertendo...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-3.5 w-3.5 mr-1" />
                      Converter
                    </>
                  )}
                </Button>
              )
            ) : (
              <span className="text-xs text-muted-foreground text-center block">
                Sem PDF
              </span>
            )}
          </TableCell>
          
          {/* Ações */}
          <TableCell className="w-[60px] p-2">
            <div className="flex items-center justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleViewDetails}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver detalhes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleViewDetails}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {lead.leadUrl && (
                    <DropdownMenuItem onClick={openChatwitChat}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Abrir chat
                    </DropdownMenuItem>
                  )}
                  {lead.phoneNumber && (
                    <DropdownMenuItem onClick={openWhatsApp}>
                      <Phone className="h-4 w-4 mr-2" />
                      WhatsApp
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </TableRow>
      </LeadContextMenu>
      
      {/* Usando o novo componente DialogDetalheLead */}
      <DialogDetalheLead
        lead={lead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEditLead}
        isSaving={isSaving}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o lead "{displayName}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para exibir a imagem em tela cheia */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Imagem do Perfil</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2">
            {lead.thumbnail && (
              <img 
                src={lead.thumbnail} 
                alt={displayName} 
                className="max-w-full max-h-[70vh] object-contain rounded-md" 
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFullImage(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usando o novo componente ImageGalleryDialog */}
      <ImageGalleryDialog
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        images={getConvertedImages()}
        leadId={lead.id}
        title={`Imagens de ${displayName}`}
        description="Imagens convertidas do PDF. Clique em uma miniatura para ver a imagem completa."
      />

      {/* Dialog de processo (unificação ou conversão) */}
      <ProcessDialog
        isOpen={showProcessDialog}
        onClose={() => setShowProcessDialog(false)}
        processType={processType}
        leadName={displayName}
        numFiles={lead.arquivos.length}
      />
    </>
  );
}
