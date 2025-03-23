import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, ExternalLink, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { downloadImagesAsZip } from "../utils/download-zip";

interface ImageGalleryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  title?: string;
  description?: string;
  leadId?: string;
}

export function ImageGalleryDialog({
  isOpen,
  onClose,
  images,
  title = "Galeria de Imagens",
  description = "Imagens convertidas do PDF. Clique em uma miniatura para ver a imagem completa.",
  leadId
}: ImageGalleryDialogProps) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [fullImageLoading, setFullImageLoading] = useState(false);
  const [fullImageError, setFullImageError] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Função para fazer download de todas as imagens como ZIP
  const handleDownloadAllImages = async () => {
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
      
      const result = await downloadImagesAsZip(
        images, 
        leadId ? `lead-${leadId.substring(0, 8)}` : "imagens"
      );
      
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
  
  // Navegar para a próxima imagem
  const goToNextImage = () => {
    if (selectedIndex < images.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedImage(images[newIndex]);
    }
  };
  
  // Navegar para a imagem anterior
  const goToPrevImage = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedImage(images[newIndex]);
    }
  };
  
  // Fechar visualização de imagem ampliada
  const closeImageView = () => {
    setSelectedImage(null);
    setSelectedIndex(-1);
  };
  
  // Abrir imagem ampliada
  const openImage = (url: string, index: number) => {
    setSelectedImage(url);
    setSelectedIndex(index);
    setFullImageLoading(true);
    setFullImageError(false);
  };
  
  // Manipular teclas de navegação
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedImage) {
      if (e.key === 'ArrowRight') {
        goToNextImage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      } else if (e.key === 'Escape') {
        closeImageView();
      }
    }
  };
  
  // Função mais detalhada para depuração de URLs de miniaturas
  const getThumbnailUrl = (imageUrl: string) => {
    // URL já pode estar no formato de miniatura
    if (imageUrl.includes("/thumb_")) {
      return imageUrl;
    }
    
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      
      // Log para depuração
      if (showDebug) {
        console.log("Processando URL:", {
          original: imageUrl,
          host: url.host,
          pathname: url.pathname,
          pathParts
        });
      }
      
      // Última parte é o nome do arquivo
      if (pathParts.length > 0) {
        const lastIndex = pathParts.length - 1;
        const fileName = pathParts[lastIndex];
        
        // Insere "thumb_" antes do nome do arquivo
        pathParts[lastIndex] = `thumb_${fileName}`;
        
        // Reconstrói o caminho
        url.pathname = pathParts.join('/');
        const thumbnailUrl = url.toString();
        
        // Log para depuração
        if (showDebug) {
          console.log("URL de miniatura gerada:", thumbnailUrl);
        }
        
        return thumbnailUrl;
      }
      
      return imageUrl;
    } catch (e) {
      console.warn("Erro ao processar URL de miniatura:", e);
      return imageUrl;
    }
  };
  
  // Função para marcar imagem como em carregamento
  const handleImageLoading = (index: number, isLoading: boolean) => {
    setLoadingImages(prev => ({ ...prev, [index]: isLoading }));
  };
  
  // Função para marcar erro na imagem
  const handleImageError = (index: number, hasError: boolean) => {
    setImageErrors(prev => ({ ...prev, [index]: hasError }));
  };
  
  return (
    <>
      {/* Dialog principal da galeria */}
      <Dialog open={isOpen && !selectedImage} onOpenChange={(open) => !open && onClose()}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-auto"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
            {images.map((imageUrl, index) => (
              <div 
                key={index} 
                className="cursor-pointer border rounded-md overflow-hidden relative group"
                onClick={() => openImage(imageUrl, index)}
              >
                <div className="w-full h-40 flex items-center justify-center relative">
                  {loadingImages[index] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  
                  <img 
                    src={getThumbnailUrl(imageUrl)}
                    alt={`Imagem ${index + 1}`}
                    className={`w-full h-full object-contain ${imageErrors[index] ? 'opacity-60' : ''}`}
                    onLoad={() => handleImageLoading(index, false)}
                    onLoadStart={() => handleImageLoading(index, true)}
                    onError={(e) => {
                      console.warn(`Erro ao carregar miniatura: ${getThumbnailUrl(imageUrl)}`);
                      handleImageLoading(index, false);
                      handleImageError(index, true);
                      // Fallback para a imagem original em caso de erro
                      e.currentTarget.src = imageUrl;
                    }}
                  />
                  
                  {imageErrors[index] && (
                    <div className="absolute bottom-1 left-1 right-1 bg-red-500/70 text-white text-xs p-1 rounded text-center">
                      Erro na miniatura
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="text-white bg-black/60 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Imagem {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleDownloadAllImages}
                disabled={isDownloading || images.length === 0}
              >
                {isDownloading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloading ? "Processando..." : "Download ZIP"}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDebug(!showDebug)}
                title="Modo depuração"
                className="h-9 w-9"
              >
                <span className="text-xs">DEBUG</span>
              </Button>
            </div>
            
            {showDebug && (
              <div className="fixed bottom-20 left-4 right-4 max-h-60 overflow-auto bg-black/80 text-white p-2 text-xs rounded z-50">
                <h4 className="font-bold mb-2">Informações de Depuração</h4>
                <p>Total de imagens: {images.length}</p>
                <div className="mt-2">
                  <p className="font-bold">URLs originais:</p>
                  <ul className="list-disc pl-4">
                    {images.map((url, i) => (
                      <li key={i} className="truncate">
                        {url} {loadingImages[i] && "(carregando)"} {imageErrors[i] && "(erro)"}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2">
                  <p className="font-bold">URLs de miniaturas:</p>
                  <ul className="list-disc pl-4">
                    {images.map((url, i) => (
                      <li key={i} className="truncate">
                        {getThumbnailUrl(url)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para imagem ampliada da galeria */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && closeImageView()}>
        <DialogContent 
          className="max-w-5xl h-[90vh] flex flex-col"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Imagem {selectedIndex + 1} de {images.length}</DialogTitle>
              <Button variant="ghost" size="icon" onClick={closeImageView}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-grow flex items-center justify-center relative overflow-hidden">
            {selectedImage && (
              <>
                {fullImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20 z-10">
                    <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                  </div>
                )}
                
                <img 
                  src={selectedImage} 
                  alt={`Imagem ${selectedIndex + 1}`} 
                  className={`max-w-full max-h-[calc(90vh-10rem)] object-contain ${fullImageError ? 'opacity-60' : ''}`}
                  onLoad={() => setFullImageLoading(false)}
                  onError={() => {
                    setFullImageLoading(false);
                    setFullImageError(true);
                    console.error(`Erro ao carregar imagem: ${selectedImage}`);
                  }}
                />
                
                {fullImageError && (
                  <div className="absolute bottom-4 left-4 right-4 bg-red-500/80 text-white p-2 rounded text-center">
                    Erro ao carregar a imagem. Tente abrir em uma nova aba.
                  </div>
                )}
              </>
            )}
            
            {/* Botões de navegação */}
            {selectedIndex > 0 && (
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute left-2 rounded-full bg-background/80 hover:bg-background"
                onClick={goToPrevImage}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            
            {selectedIndex < images.length - 1 && (
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute right-2 rounded-full bg-background/80 hover:bg-background"
                onClick={goToNextImage}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-4 flex justify-between">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.open(selectedImage || "", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em Nova Aba
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={closeImageView}
              >
                Voltar para a Galeria
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 