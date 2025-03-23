"use client";

import { useState } from "react";
import { 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  MoreVertical, 
  Trash, 
  FileText, 
  Users, 
  FilePlus, 
  RefreshCw 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UsuarioItemProps {
  usuario: {
    id: string;
    name: string;
    accountName: string;
    channel: string;
    leadsCount: number;
    createdAt: string;
  };
  onDelete: (id: string) => void;
  onViewLeads: (usuarioId: string) => void;
  onUnificarArquivos: (usuarioId: string) => void;
  isLoading: boolean;
}

export function UsuarioItem({ 
  usuario, 
  onDelete, 
  onViewLeads, 
  onUnificarArquivos,
  isLoading 
}: UsuarioItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const formattedDate = format(new Date(usuario.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const handleDelete = () => {
    setConfirmDelete(false);
    onDelete(usuario.id);
  };

  return (
    <>
      <TableRow>
        <TableCell>
          {usuario.name}
        </TableCell>
        <TableCell>
          {usuario.accountName}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{usuario.channel}</Badge>
        </TableCell>
        <TableCell>
          <Badge>{usuario.leadsCount}</Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewLeads(usuario.id)}>
                <Users className="mr-2 h-4 w-4" />
                Ver Leads
              </DropdownMenuItem>
              
              {usuario.leadsCount > 0 && (
                <DropdownMenuItem 
                  onClick={() => onUnificarArquivos(usuario.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus className="mr-2 h-4 w-4" />
                  )}
                  Unificar Todos Arquivos
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário "{usuario.name}"? Todos os leads associados a este usuário também serão excluídos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 