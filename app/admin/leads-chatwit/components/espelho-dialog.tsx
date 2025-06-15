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
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Send, ArrowRight, Eye } from "lucide-react";
import { ImageGalleryDialog } from "./image-gallery-dialog";

import { Badge } from "@/components/ui/badge";
import { LeadChatwit } from "../types";

interface EspelhoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadData?: LeadChatwit; // Adicionar dados completos do lead
  textoEspelho: any; // Pode ser null ou um objeto JSON
  imagensEspelho: string[];
  aguardandoEspelho?: boolean;
  onSave: (texto: any, imagens: string[]) => Promise<void>;
  onCancelarEspelho?: () => Promise<void>;
  // Props para modo batch
  batchMode?: boolean;
  batchInfo?: {
    current: number;
    total: number;
    leadName: string;
  };
  onBatchNext?: () => void;
  onBatchSkip?: () => void;
}

export function EspelhoDialog({
  isOpen,
  onClose,
  leadId,
  leadData,
  textoEspelho,
  imagensEspelho,
  aguardandoEspelho = false,
  onSave,
  onCancelarEspelho,
  batchMode = false,
  batchInfo,
  onBatchNext,
  onBatchSkip,
}: EspelhoDialogProps) {
  const [texto, setTexto] = useState<any>(textoEspelho);
  const [imagens, setImagens] = useState<string[]>(imagensEspelho);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isCancelando, setIsCancelando] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  // Atualiza o texto quando as props mudam
  useEffect(() => {
    if (isOpen) {
      setTexto(textoEspelho);
      setImagens(imagensEspelho);
    }
  }, [isOpen, textoEspelho, imagensEspelho]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(texto, imagens);
      toast("Sucesso", { description: "Espelho de correção atualizado com sucesso!"  });
      
      if (batchMode && onBatchNext) {
        onBatchNext();
      } else {
        handleClose();
      }
    } catch (error: any) {
      toast.error("Erro", { description: error.message || "Não foi possível salvar as alterações." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelarEspelho = async () => {
    console.log("[EspelhoDialog] Botão cancelar clicado!");
    console.log("[EspelhoDialog] onCancelarEspelho:", !!onCancelarEspelho);
    
    if (!onCancelarEspelho) {
      console.log("[EspelhoDialog] Função onCancelarEspelho não está disponível!");
      return;
    }
    
    try {
      console.log("[EspelhoDialog] Iniciando cancelamento...");
      setIsCancelando(true);
      await onCancelarEspelho();
      console.log("[EspelhoDialog] Cancelamento concluído!");
      toast("Sucesso", { description: "Processamento do espelho cancelado com sucesso!"  });
      handleClose();
    } catch (error: any) {
      console.error("[EspelhoDialog] Erro ao cancelar:", error);
      toast("Erro", { description: error.message || "Não foi possível cancelar o processamento."  });
    } finally {
      setIsCancelando(false);
    }
  };

  const handleSkip = () => {
    if (batchMode && onBatchSkip) {
      onBatchSkip();
    }
  };

  // Função para garantir a limpeza correta ao fechar
  const handleClose = () => {
    console.log("[EspelhoDialog] handleClose chamado - estado:", { isSaving, isGeneratingText, isCancelando });
    
    if (!isSaving && !isGeneratingText && !isCancelando) {
      // Fecha o diálogo imediatamente para evitar problemas de estado
      console.log("[EspelhoDialog] Fechando diálogo normalmente");
      onClose();
      
      // Reseta o estado local após fechar
      setTexto(textoEspelho);
      setImagens(imagensEspelho);
      setShowConfirmDialog(false);
      setPendingImages([]);
    } else {
      console.log("[EspelhoDialog] Não pode fechar agora - operação em andamento");
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
      // Verificar se a consultoria está ativa
      const consultoriaAtiva = leadData.consultoriaFase2 || false;
      
      const payload = {
        leadID: leadId,
        nome: leadData.nomeReal || leadData.name || "Lead sem nome",
        telefone: leadData.phoneNumber,
        // Usar flag correta dependendo do contexto da consultoria
        ...(consultoriaAtiva ? { espelhoparabiblioteca: true } : { espelho: true }),
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
        (payload as any).espelhoBibliotecaId = leadData.espelhoBibliotecaId;
        (payload as any).usuarioId = leadData.usuarioId;
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
      
      toast("Imagens enviadas", { description: "Imagens enviadas para o sistema externo! O texto será gerado automaticamente."  });
      
    } catch (error: any) {
      console.error("Erro ao enviar imagens para sistema externo:", error);
      toast("Erro", { description: error.message || "Não foi possível enviar para o sistema externo."  });
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <DialogTitle>
                  {batchMode ? "Espelho em Lote" : "Editar Espelho de Correção"}
                </DialogTitle>
              </div>
              {batchMode && batchInfo && (
                <Badge variant="secondary" className="text-xs">
                  {batchInfo.current} de {batchInfo.total}
                </Badge>
              )}
            </div>
            <DialogDescription>
              {batchMode && batchInfo ? (
                <div className="space-y-2">
                  <div>
                    Processando espelho para: <strong>{batchInfo.leadName}</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    💡 Selecione as imagens que serão usadas como espelho de correção. 
                    O texto pode ser gerado automaticamente após selecionar as imagens.
                  </div>
                </div>
              ) : (
                "Visualize e edite as informações do espelho de correção."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {aguardandoEspelho ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium">Aguardando Processamento</p>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Estamos processando o espelho de correção. Isso pode levar alguns minutos.
                </p>
                
                {onCancelarEspelho && (
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelarEspelho}
                    disabled={isCancelando}
                  >
                    {isCancelando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      "Cancelar Processamento"
                    )}
                  </Button>
                )}
              </div>
            ) : (
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
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            {batchMode ? (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isSaving || isGeneratingText || isCancelando}>
                  Cancelar Lote
                </Button>
                <Button variant="ghost" onClick={handleSkip} disabled={isSaving || isGeneratingText || isCancelando}>
                  Pular Este Lead
                </Button>
                {!aguardandoEspelho && (
                  <Button onClick={handleSave} disabled={isSaving || isGeneratingText}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <span>Salvar</span>
                    {batchInfo && batchInfo.current < batchInfo.total && (
                      <>
                        <ArrowRight className="ml-2 h-4 w-4" />
                        <span>Próximo</span>
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isSaving || isGeneratingText || isCancelando}>
                  Fechar
                </Button>
                {!aguardandoEspelho && (
                  <Button onClick={handleSave} disabled={isSaving || isGeneratingText}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                )}
              </>
            )}
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