import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Image as ImageIcon, FileUp, Loader2, Library } from "lucide-react";
import { CellProps } from "../types";
import { LeadContextMenu, ContextAction } from "@/app/admin/leads-chatwit/components/lead-context-menu";

interface EspelhoCellProps extends CellProps {
  manuscritoProcessadoLocal: boolean;
  hasEspelho: boolean;
  consultoriaAtiva: boolean;
  isEnviandoEspelho: boolean;
  isUploadingEspelho: boolean;
  refreshKey: number;
  localEspelhoState: {
    hasEspelho: boolean;
    aguardandoEspelho: boolean;
    espelhoCorrecao: any;
    textoDOEspelho: any;
  };
  onContextMenuAction: (action: ContextAction, data?: any) => void;
  onEspelhoClick: () => void;
  onOpenFileUpload: () => void;
  onOpenBiblioteca?: () => void;
  onOpenEspelhoSeletor?: () => void;
}

export function EspelhoCell({ 
  lead,
  manuscritoProcessadoLocal,
  hasEspelho,
  consultoriaAtiva,
  isEnviandoEspelho,
  isUploadingEspelho,
  refreshKey,
  localEspelhoState,
  onContextMenuAction,
  onEspelhoClick,
  onOpenFileUpload,
  onOpenBiblioteca,
  onOpenEspelhoSeletor
}: EspelhoCellProps) {
  if (!manuscritoProcessadoLocal) {
    return <TableCell className="w-[120px] p-2 align-middle"></TableCell>;
  }

  // Verificar se há espelho processado (database) ou estado local
  const temEspelhoProcessado = lead.espelhoProcessado || (lead.espelhoCorrecao && lead.textoDOEspelho);
  const estaAguardandoEspelho = lead.aguardandoEspelho || localEspelhoState.aguardandoEspelho;

  const handleButtonClick = () => {
    // Sempre permitir abrir o diálogo, mesmo quando aguardando
    if (estaAguardandoEspelho) {
      onEspelhoClick();
      return;
    }
    
    if (consultoriaAtiva) {
      if (temEspelhoProcessado) {
        onEspelhoClick();
      } else {
        if (onOpenBiblioteca) {
          onOpenBiblioteca();
        }
      }
    } else {
      if (temEspelhoProcessado) {
        onEspelhoClick();
      } else {
        onOpenEspelhoSeletor?.();
      }
    }
  };

  return (
    <TableCell className="w-[120px] p-2 align-middle">
      <LeadContextMenu
        contextType="espelho"
        onAction={onContextMenuAction}
        data={{
          id: lead.id,
          hasEspelho: temEspelhoProcessado,
          aguardandoEspelho: estaAguardandoEspelho
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleButtonClick}
          disabled={isEnviandoEspelho || isUploadingEspelho}
          className="whitespace-nowrap w-full"
          key={`espelho-btn-${refreshKey}-${temEspelhoProcessado ? 'edit' : 'select'}-${consultoriaAtiva ? 'consultoria' : 'normal'}`}
        >
          {(() => {
            if (estaAguardandoEspelho) {
              return (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Aguardando
                </>
              );
            }
            
            if (isUploadingEspelho) {
              return (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Fazendo Upload...
                </>
              );
            }
            
            if (temEspelhoProcessado) {
              if (consultoriaAtiva) {
                return (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Espelho
                  </>
                );
              } else {
                return (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Editar Espelho
                  </>
                );
              }
            } else {
              if (consultoriaAtiva) {
                return (
                  <>
                    <Library className={`h-4 w-4 mr-1 ${isEnviandoEspelho ? "animate-spin" : ""}`} />
                    {isEnviandoEspelho ? "Carregando..." : "Biblioteca de Espelho"}
                  </>
                );
              } else {
                return (
                  <>
                    <ImageIcon className={`h-4 w-4 mr-1 ${isEnviandoEspelho ? "animate-spin" : ""}`} />
                    {isEnviandoEspelho ? "Enviando..." : "Selecionar Espelho"}
                  </>
                );
              }
            }
          })()}
        </Button>
      </LeadContextMenu>
    </TableCell>
  );
} 