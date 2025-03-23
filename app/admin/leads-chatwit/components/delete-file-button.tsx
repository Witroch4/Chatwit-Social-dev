"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteFileButtonProps {
  onDelete: () => Promise<void>;
  fileType: string;
  fileName?: string;
  onSuccess?: () => void;
}

export function DeleteFileButton({ onDelete, fileType, fileName, onSuccess }: DeleteFileButtonProps) {
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Captura e impede a propagação do evento de clique
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirm(true);
  };
  
  // Impede que o clique no dialog seja propagado para o elemento pai
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    
    try {
      // Mensagem personalizada com base no tipo de arquivo
      const fileDesc = 
        fileType === 'pdf' 
          ? 'PDF unificado' 
          : fileType === 'imagem' 
            ? 'conjunto de imagens convertidas' 
            : `arquivo ${fileName || ''}`;
      
      await onDelete();
      
      toast({
        title: "Arquivo excluído",
        description: `O ${fileDesc} foi excluído com sucesso.`,
      });
      
      // Callback opcional após exclusão bem-sucedida
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro na exclusão",
        description: "Não foi possível excluir o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };
  
  return (
    <>
      <button
        onClick={handleClick}
        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 m-0.5 z-10 scale-75 hover:scale-100 hover:bg-red-600"
        aria-label="Excluir arquivo"
      >
        <X className="h-3 w-3" />
      </button>
      
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent 
          className="sm:max-w-[425px]" 
          onClick={handleDialogClick}
        >
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este {
                fileType === 'pdf' 
                  ? 'PDF unificado' 
                  : fileType === 'imagem' 
                    ? 'conjunto de imagens convertidas' 
                    : `arquivo ${fileName || ''}`
              }?
              <p className="text-red-500 font-semibold mt-2">Esta ação não pode ser desfeita.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(false);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 