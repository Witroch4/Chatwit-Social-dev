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
import { Loader2, Image as ImageIcon } from "lucide-react";
import { ImageGalleryDialog } from "./image-gallery-dialog";
import { ToastAction } from "@/components/ui/toast";

interface EspelhoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  textoEspelho: any; // Pode ser null ou um objeto JSON
  imagensEspelho: string[];
  onSave: (texto: any, imagens: string[]) => Promise<void>;
}

export function EspelhoDialog({
  isOpen,
  onClose,
  leadId,
  textoEspelho,
  imagensEspelho,
  onSave,
}: EspelhoDialogProps) {
  const [texto, setTexto] = useState<any>(textoEspelho);
  const [imagens, setImagens] = useState<string[]>(imagensEspelho);
  const [isSaving, setIsSaving] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
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
    if (!isSaving) {
      // Fecha o diálogo imediatamente para evitar problemas de estado
      onClose();
      
      // Reseta o estado local após fechar
      setTexto(textoEspelho);
      setImagens(imagensEspelho);
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
  };

  // Formatar o texto JSON para exibição
  const formatEspelhoTexto = () => {
    if (!texto) return "";
    
    try {
      if (typeof texto === 'string') {
        // Tentar parsear como JSON se for uma string
        try {
          const parsed = JSON.parse(texto);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // Se não for JSON válido, retorna a string como está
          return texto;
        }
      } else if (Array.isArray(texto)) {
        // Se for um array, formata cada item
        const formattedText = texto.map((item, index) => {
          if (item.output) {
            return `#### Parte ${index + 1} ####\n${item.output}`;
          } else if (typeof item === 'string') {
            return `#### Parte ${index + 1} ####\n${item}`;
          } else {
            return `#### Parte ${index + 1} ####\n${JSON.stringify(item, null, 2)}`;
          }
        }).join('\n\n---------------------------------\n\n');
        
        return formattedText;
      } else if (typeof texto === 'object' && texto !== null) {
        // Se for um objeto, tenta detectar estruturas específicas
        if (texto.output) {
          return texto.output;
        }
        // Caso contrário, formata como JSON
        return JSON.stringify(texto, null, 2);
      } else {
        // Para qualquer outro tipo, converte para string
        return String(texto);
      }
    } catch (error) {
      console.error("Erro ao formatar texto do espelho:", error);
      // Fallback seguro
      try {
        return typeof texto === 'string' ? texto : JSON.stringify(texto, null, 2);
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
              />
            </>
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Imagens do Espelho</h3>
              <Button variant="outline" onClick={handleOpenImageGallery}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Gerenciar Imagens
              </Button>
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