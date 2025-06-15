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
import { Loader2, ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ManuscritoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  textoManuscrito: string;
  aguardandoManuscrito?: boolean;
  onSave: (texto: string) => Promise<void>;
  onCancelarManuscrito?: () => Promise<void>;
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

export function ManuscritoDialog({
  isOpen,
  onClose,
  leadId,
  textoManuscrito,
  aguardandoManuscrito = false,
  onSave,
  onCancelarManuscrito,
  batchMode = false,
  batchInfo,
  onBatchNext,
  onBatchSkip,
}: ManuscritoDialogProps) {
  const [texto, setTexto] = useState(textoManuscrito || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelando, setIsCancelando] = useState(false);

  // Atualiza o texto quando as props mudam
  useEffect(() => {
    if (isOpen) {
      setTexto(textoManuscrito || '');
    }
  }, [isOpen, textoManuscrito]);

  const handleSave = async () => {
    if (!texto.trim()) {
      toast("Aviso", { description: "O texto do manuscrito não pode ser vazio."  });
      return;
    }

    try {
      setIsSaving(true);
      await onSave(texto);
      toast.success("Sucesso", {
        description: "Manuscrito atualizado com sucesso!",
      });
      
      if (batchMode && onBatchNext) {
        onBatchNext();
      } else {
        handleClose();
      }
    } catch (error: any) {
      toast.error("Erro", {
        description: error.message || "Não foi possível salvar as alterações.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelarManuscrito = async () => {
    if (!onCancelarManuscrito) return;
    
    try {
      setIsCancelando(true);
      await onCancelarManuscrito();
      toast("Sucesso", { description: "Processamento do manuscrito cancelado com sucesso!"  });
      handleClose();
    } catch (error: any) {
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
    if (!isSaving && !isCancelando) {
      // Fecha o diálogo imediatamente para evitar problemas de estado
      onClose();
      
      // Reseta o estado local após fechar
      setTexto(textoManuscrito || '');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle>
                {batchMode ? "Manuscrito em Lote" : "Editar Manuscrito"}
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
                  Processando manuscrito para: <strong>{batchInfo.leadName}</strong>
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 Selecione as imagens que serão enviadas para digitação automática. 
                  Este processo pode levar alguns minutos após o envio.
                </div>
              </div>
            ) : (
              "Faça as alterações necessárias no texto do manuscrito."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {aguardandoManuscrito ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Aguardando Processamento</p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Estamos processando o manuscrito. Isso pode levar alguns minutos.
              </p>
              
              {onCancelarManuscrito && (
                <Button 
                  variant="destructive" 
                  onClick={handleCancelarManuscrito}
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
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-[400px] font-mono"
              placeholder="Digite o texto do manuscrito..."
            />
          )}
        </div>
        <DialogFooter className="gap-2">
          {batchMode ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSaving || isCancelando}>
                Cancelar Lote
              </Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isSaving || isCancelando}>
                Pular Este Lead
              </Button>
              {!aguardandoManuscrito && (
                <Button onClick={handleSave} disabled={isSaving}>
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
              <Button variant="outline" onClick={handleClose} disabled={isSaving || isCancelando}>
                Fechar
              </Button>
              {!aguardandoManuscrito && (
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 