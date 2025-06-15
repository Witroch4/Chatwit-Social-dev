import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Eye, 
  MoreVertical, 
  Trash, 
  Phone,
  MessageSquare
} from "lucide-react";
import { RowActionsCellProps } from "../types";
import { openChatwitChat, openWhatsApp } from "../utils";
import { toast } from "sonner";

interface RowActionsCellExtendedProps extends RowActionsCellProps {
  onConfirmDelete: () => void;
}

export function RowActionsCell({ 
  lead, 
  onViewDetails, 
  onConfirmDelete 
}: RowActionsCellExtendedProps) {

  const handleChatwitClick = () => {
    const success = openChatwitChat(lead.leadUrl || null);
    if (!success) {
      toast("Erro", { description: "Link do chat não encontrado."  });
    }
  };

  const handleWhatsAppClick = () => {
    const success = openWhatsApp(lead.phoneNumber || null);
    if (!success) {
      toast("Erro", { description: "Número de telefone não encontrado."  });
    }
  };

  return (
    <TableCell className="w-[60px] p-2 align-middle">
      <div className="flex items-center justify-end gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onViewDetails}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver detalhes</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {lead.leadUrl && (
              <DropdownMenuItem onClick={handleChatwitClick}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Abrir chat
              </DropdownMenuItem>
            )}
            {lead.phoneNumber && (
              <DropdownMenuItem onClick={handleWhatsAppClick}>
                <Phone className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600"
              onClick={onConfirmDelete}
            >
              <Trash className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableCell>
  );
} 