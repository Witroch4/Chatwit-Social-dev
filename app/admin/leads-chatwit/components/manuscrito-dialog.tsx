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
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface ManuscritoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  textoManuscrito: string;
  onSave: (texto: string) => Promise<void>;
}

export function ManuscritoDialog({
  isOpen,
  onClose,
  leadId,
  textoManuscrito,
  onSave,
}: ManuscritoDialogProps) {
  const [texto, setTexto] = useState(textoManuscrito);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Atualiza o texto quando as props mudam
  useEffect(() => {
    if (isOpen) {
      setTexto(textoManuscrito);
    }
  }, [isOpen, textoManuscrito]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(texto);
      toast({
        title: "Sucesso",
        description: "Manuscrito atualizado com sucesso!",
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
    if (!isSaving) {
      // Fecha o diálogo imediatamente para evitar problemas de estado
      onClose();
      
      // Reseta o estado local após fechar
      setTexto(textoManuscrito);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar Manuscrito</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias no texto do manuscrito.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-h-[400px] font-mono"
            placeholder="Digite o texto do manuscrito..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 