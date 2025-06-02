import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Image as ImageIcon, FileUp, Loader2 } from "lucide-react";
import { CellProps } from "../types";
import { LeadContextMenu, ContextAction } from "@/app/admin/leads-chatwit/components/lead-context-menu";

interface EspelhoCellProps extends CellProps {
  manuscritoProcessadoLocal: boolean;
  hasEspelho: boolean;
  consultoriaAtiva: boolean;
  isEnviandoEspelho: boolean;
  isUploadingEspelho: boolean;
  refreshKey: number;
  onContextMenuAction: (action: ContextAction, data?: any) => void;
  onEspelhoClick: () => void;
  onOpenFileUpload: () => void;
}

export function EspelhoCell({ 
  lead,
  manuscritoProcessadoLocal,
  hasEspelho,
  consultoriaAtiva,
  isEnviandoEspelho,
  isUploadingEspelho,
  refreshKey,
  onContextMenuAction,
  onEspelhoClick,
  onOpenFileUpload
}: EspelhoCellProps) {
  if (!manuscritoProcessadoLocal) {
    return <TableCell className="w-[120px] p-2 align-middle"></TableCell>;
  }

  return (
    <TableCell className="w-[120px] p-2 align-middle">
      <LeadContextMenu
        contextType="espelho"
        onAction={onContextMenuAction}
        data={{
          id: lead.id,
          hasEspelho: hasEspelho
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={consultoriaAtiva 
            ? (hasEspelho ? onEspelhoClick : onOpenFileUpload)
            : onEspelhoClick
          }
          disabled={isEnviandoEspelho || isUploadingEspelho}
          className="whitespace-nowrap w-full"
          key={`espelho-btn-${refreshKey}-${hasEspelho ? 'edit' : 'select'}-${consultoriaAtiva ? 'consultoria' : 'normal'}`}
        >
          {(() => {
            if (isUploadingEspelho) {
              return (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Fazendo Upload...
                </>
              );
            }
            
            if (hasEspelho) {
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
                    <FileUp className={`h-4 w-4 mr-1 ${isEnviandoEspelho ? "animate-spin" : ""}`} />
                    {isEnviandoEspelho ? "Enviando..." : "Enviar Espelho"}
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