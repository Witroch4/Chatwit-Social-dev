import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon, Send } from "lucide-react";
import { ImageGalleryDialog } from "./image-gallery-dialog";
import { ToastAction } from "@/components/ui/toast";
import { LeadChatwit } from "../types";

interface EspelhoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadData?: LeadChatwit; // Adicionar dados completos do lead
  textoEspelho: any; // Pode ser null ou um objeto JSON
  imagensEspelho: string[];
  onSave: (texto: any, imagens: string[]) => Promise<void>;
}

export function EspelhoDialog({
  isOpen,
  onClose,
  leadId,
  leadData,
  textoEspelho,
  imagensEspelho,
  onSave,
}: EspelhoDialogProps) {
  const [texto, setTexto] = useState<any>(textoEspelho);
  const [imagens, setImagens] = useState<string[]>(imagensEspelho);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const { toast } = useToast();

  // Atualiza o texto quando as props mudam
  useEffect(() => {
    if (isOpen) {
      console.log("Espelho aberto. Formato dos dados:", {
        tipo: typeof textoEspelho,
        éArray: Array.isArray(textoEspelho),
        conteúdo: textoEspelho
      });
      
      setTexto(textoEspelho);
      setImagens(imagensEspelho);
    }
  }, [isOpen, textoEspelho, imagensEspelho]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(texto, imagens);
      toast({
        title: "Sucesso",
        description: "Espelho de correção atualizado com sucesso!",
        action: (
          <ToastAction altText="Fechar" onClick={handleClose}>
            Fechar
          </ToastAction>
        ),
      });
      handleClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar novamente" onClick={handleSave}>
            Tentar novamente
          </ToastAction>
        ),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função para garantir a limpeza correta ao fechar
  const handleClose = () => {
    if (!isSaving && !isGeneratingText) {
      // Fecha o diálogo imediatamente para evitar problemas de estado
      onClose();
      
      // Reseta o estado local após fechar
      setTexto(textoEspelho);
      setImagens(imagensEspelho);
      setShowConfirmDialog(false);
      setPendingImages([]);
    }
  };

  // Função para abrir o gerenciador de imagens
  const handleOpenImageGallery = () => {
    setShowGallery(true);
  };

  // Função para receber as imagens selecionadas da galeria
  const handleImageSelection = async (selectedImages: string[]) => {
    setImagens(selectedImages);
    setShowGallery(false);
    
    // Se houver imagens selecionadas, perguntar via dialog se quer enviar para sistema externo
    if (selectedImages.length > 0) {
      setPendingImages(selectedImages);
      setShowConfirmDialog(true);
    }
  };

  // Confirmar envio para sistema externo
  const handleConfirmSendToExternal = async () => {
    setShowConfirmDialog(false);
    await handleGenerateTextFromImages(pendingImages);
    setPendingImages([]);
  };

  // Cancelar envio para sistema externo
  const handleCancelSendToExternal = () => {
    setShowConfirmDialog(false);
    setPendingImages([]);
  };

  // Função para enviar imagens para o sistema externo e gerar texto
  const handleGenerateTextFromImages = async (imageUrls: string[]) => {
    try {
      setIsGeneratingText(true);
      
      if (!leadData) {
        throw new Error("Dados do lead não disponíveis");
      }
      
      // Verificar se está editando um espelho da biblioteca
      const isEspelhoBiblioteca = leadData.espelhoBibliotecaId !== undefined;
      
      const payload = {
        leadID: leadId,
        nome: leadData.nomeReal || leadData.name || "Lead sem nome",
        telefone: leadData.phoneNumber,
        // Usar flag correta dependendo do contexto
        [isEspelhoBiblioteca ? 'espelhoparabiblioteca' : 'espelhoconsultoriafase2']: true,
        arquivos: leadData.arquivos?.map((a: { id: string; dataUrl: string; fileType: string }) => ({
          id: a.id,
          url: a.dataUrl,
          tipo: a.fileType,
          nome: a.fileType
        })) || [],
        arquivos_pdf: leadData.pdfUnificado ? [{
          id: leadId,
          url: leadData.pdfUnificado,
          nome: "PDF Unificado"
        }] : [],
        arquivos_imagens_espelho: imageUrls.map((url: string, index: number) => ({
          id: `${leadId}-espelho-${index}`,
          url: url,
          nome: `Espelho ${index + 1}`
        })),
        metadata: {
          leadUrl: leadData.leadUrl,
          sourceId: leadData.sourceId,
          concluido: leadData.concluido,
          fezRecurso: leadData.fezRecurso
        }
      };
      
      // Adicionar dados específicos da biblioteca se for o caso
      if (isEspelhoBiblioteca) {
        payload.espelhoBibliotecaId = leadData.espelhoBibliotecaId;
        payload.usuarioId = leadData.usuarioId;
      }
      
      const response = await fetch("/api/admin/leads-chatwit/enviar-manuscrito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar espelho para processamento");
      }
      
      toast({
        title: "Imagens enviadas",
        description: "Imagens enviadas para o sistema externo! O texto será gerado automaticamente.",
      });
      
    } catch (error: any) {
      console.error("Erro ao enviar imagens para sistema externo:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar para o sistema externo.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingText(false);
    }
  };

  // Formatar o texto JSON para exibição
  const formatEspelhoTexto = () => {
    if (!texto) return "";
    
    // Função auxiliar para processar quebras de linha
    const processLineBreaks = (text: string) => {
      return text.replace(/\\n/g, '\n');
    };
    
    try {
      if (typeof texto === 'string') {
        // Tentar parsear como JSON se for uma string
        try {
          const parsed = JSON.parse(texto);
          // Se é um objeto JSON com output, processar quebras de linha
          if (parsed && typeof parsed === 'object' && parsed.output) {
            return processLineBreaks(parsed.output);
          }
          return JSON.stringify(parsed, null, 2);
        } catch {
          // Se não for JSON válido, processar quebras de linha e retornar
          return processLineBreaks(texto);
        }
      } else if (Array.isArray(texto)) {
        // Se for um array, formata cada item
        const formattedText = texto.map((item, index) => {
          if (item.output) {
            return `#### Parte ${index + 1} ####\n${processLineBreaks(item.output)}`;
          } else if (typeof item === 'string') {
            return `#### Parte ${index + 1} ####\n${processLineBreaks(item)}`;
          } else {
            return `#### Parte ${index + 1} ####\n${JSON.stringify(item, null, 2)}`;
          }
        }).join('\n\n---------------------------------\n\n');
        
        return formattedText;
      } else if (typeof texto === 'object' && texto !== null) {
        // Se for um objeto, tenta detectar estruturas específicas
        if (texto.output) {
          return processLineBreaks(texto.output);
        }
        // Caso contrário, formata como JSON
        return JSON.stringify(texto, null, 2);
      } else {
        // Para qualquer outro tipo, converte para string e processa quebras de linha
        return processLineBreaks(String(texto));
      }
    } catch (error) {
      console.error("Erro ao formatar texto do espelho:", error);
      // Fallback seguro
      try {
        const fallbackText = typeof texto === 'string' ? texto : JSON.stringify(texto, null, 2);
        return processLineBreaks(fallbackText);
      } catch {
        return "Erro ao exibir o conteúdo do espelho. Edite com cuidado.";
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Espelho de Correção</DialogTitle>
            <DialogDescription>
              Visualize e edite as informações do espelho de correção.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <>
              <h3 className="text-lg font-medium">Texto do Espelho</h3>
              <Textarea
                value={formatEspelhoTexto()}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Tenta preservar o formato original dos dados
                  try {
                    // Primeiro tenta considerar como JSON
                    const parsed = JSON.parse(inputValue);
                    setTexto(parsed);
                  } catch {
                    // Se não for JSON válido, mantém como texto simples
                    setTexto(inputValue);
                  }
                }}
                className="min-h-[300px] font-mono"
                placeholder="Texto do espelho de correção..."
                disabled={isGeneratingText}
              />
              {isGeneratingText && (
                <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="text-sm">Gerando texto automaticamente...</span>
                </div>
              )}
            </>
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Imagens do Espelho</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleOpenImageGallery}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Gerenciar Imagens
                </Button>
                {imagens.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateTextFromImages(imagens)}
                    disabled={isGeneratingText || !leadData}
                  >
                    {isGeneratingText ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Gerar Texto
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {imagens.length > 0 ? (
                imagens.map((url, index) => (
                  <div key={index} className="border rounded-md overflow-hidden h-32">
                    <img 
                      src={url} 
                      alt={`Espelho ${index + 1}`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Nenhuma imagem selecionada
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSaving || isGeneratingText}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isGeneratingText}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Sistema Externo */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Texto Automaticamente</DialogTitle>
            <DialogDescription>
              Deseja enviar as {pendingImages.length} imagem(ns) selecionada(s) para o sistema externo 
              gerar o texto do espelho automaticamente?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação irá enviar as imagens para processamento automático e o texto 
              será gerado em alguns minutos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSendToExternal}>
              Não, apenas salvar imagens
            </Button>
            <Button onClick={handleConfirmSendToExternal}>
              <Send className="h-4 w-4 mr-2" />
              Sim, gerar texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageGalleryDialog
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        images={imagens.length > 0 ? imagens : []}
        leadId={leadId}
        title="Gerenciar Imagens do Espelho"
        description="Selecione as imagens que serão usadas como espelho de correção."
        selectionMode={true}
        onSend={handleImageSelection}
      />
    </>
  );
} 