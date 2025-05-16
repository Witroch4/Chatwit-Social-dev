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
import { Loader2, FileText, ExternalLink, Send, AlertOctagon } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";

interface AnaliseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  sourceId: string;
  analiseUrl: string | null;
  anotacoes: string | null;
  aguardandoAnalise: boolean;
  onSaveAnotacoes: (anotacoes: string) => Promise<void>;
  onEnviarPdf: (sourceId: string) => Promise<void>;
  onCancelarAnalise?: () => Promise<void>;
}

export function AnaliseDialog({
  isOpen,
  onClose,
  leadId,
  sourceId,
  analiseUrl,
  anotacoes,
  aguardandoAnalise,
  onSaveAnotacoes,
  onEnviarPdf,
  onCancelarAnalise,
}: AnaliseDialogProps) {
  const [textoAnotacoes, setTextoAnotacoes] = useState(anotacoes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isEnviando, setIsEnviando] = useState(false);
  const [isCancelando, setIsCancelando] = useState(false);
  const { toast } = useToast();

  // Atualiza as anotações quando o diálogo for aberto ou as props mudarem
  useEffect(() => {
    if (isOpen) {
      setTextoAnotacoes(anotacoes || '');
    }
  }, [isOpen, anotacoes]);

  const handleSaveAnotacoes = async () => {
    try {
      setIsSaving(true);
      await onSaveAnotacoes(textoAnotacoes);
      toast({
        title: "Sucesso",
        description: "Anotações atualizadas com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as anotações.",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar novamente" onClick={handleSaveAnotacoes}>
            Tentar novamente
          </ToastAction>
        ),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnviarPdf = async () => {
    if (!analiseUrl) {
      toast({
        title: "Erro",
        description: "Não há análise disponível para enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnviando(true);
      await onEnviarPdf(sourceId);
      toast({
        title: "Sucesso",
        description: "PDF de análise enviado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o PDF.",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar novamente" onClick={handleEnviarPdf}>
            Tentar novamente
          </ToastAction>
        ),
      });
    } finally {
      setIsEnviando(false);
    }
  };

  const handleCancelarAnalise = async () => {
    if (!onCancelarAnalise) return;
    
    try {
      setIsCancelando(true);
      await onCancelarAnalise();
      toast({
        title: "Sucesso",
        description: "Solicitação de análise cancelada com sucesso!",
      });
      onClose(); // Fechar o diálogo após cancelamento
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar a análise.",
        variant: "destructive",
      });
    } finally {
      setIsCancelando(false);
    }
  };

  const handleClose = () => {
    if (!isSaving && !isEnviando && !isCancelando) {
      onClose();
    }
  };

  const abrirPdfAnalise = () => {
    if (analiseUrl) {
      window.open(analiseUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Análise da Prova</DialogTitle>
          <DialogDescription>
            {aguardandoAnalise
              ? "A análise está sendo processada. Aguarde..."
              : analiseUrl
                ? "Visualize o PDF de análise e adicione anotações."
                : "Ainda não recebemos a análise da prova."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {/* Status da Análise */}
          <div className="flex flex-col items-center justify-center">
            {aguardandoAnalise ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium">Aguardando Análise</p>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Estamos processando sua solicitação. Isso pode levar alguns minutos.
                </p>
                
                {onCancelarAnalise && (
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelarAnalise}
                    disabled={isCancelando}
                  >
                    {isCancelando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="h-4 w-4 mr-2" />
                        Cancelar Análise
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : analiseUrl ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/30 transition-colors" onClick={abrirPdfAnalise}>
                <FileText className="h-16 w-16 text-red-500 mb-4" />
                <p className="text-lg font-medium">Análise Disponível</p>
                <p className="text-sm text-primary mt-2 flex items-center">
                  Clique para abrir o PDF
                  <ExternalLink className="ml-1 h-3 w-3" />
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Análise Não Disponível</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Ainda não recebemos a análise da prova. Solicite uma análise.
                </p>
              </div>
            )}
          </div>

          {/* Anotações */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Anotações</h3>
            <Textarea
              value={textoAnotacoes}
              onChange={(e) => setTextoAnotacoes(e.target.value)}
              className="min-h-[150px] font-mono"
              placeholder="Adicione suas anotações sobre a análise..."
            />
          </div>
        </div>
        
        <DialogFooter className="flex flex-wrap gap-2 justify-between sm:justify-end">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving || isEnviando || isCancelando}
            >
              Fechar
            </Button>
            <Button
              variant="default"
              onClick={handleSaveAnotacoes}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Anotações
            </Button>
          </div>
          
          {analiseUrl && (
            <Button
              variant="default"
              onClick={handleEnviarPdf}
              disabled={isEnviando || !analiseUrl}
            >
              {isEnviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar para o Chat
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 