"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast, useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { UsuarioItem } from "./usuario-item";
import { RefreshCw } from "lucide-react";

interface UsuariosListProps {
  searchQuery: string;
  onRefresh: () => void;
  initialLoading: boolean;
  onViewLeads: (usuarioId: string) => void;
}

export function UsuariosList({ 
  searchQuery, 
  onRefresh, 
  initialLoading,
  onViewLeads 
}: UsuariosListProps) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnifying, setIsUnifying] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchUsuarios();
  }, [searchQuery, pagination.page, pagination.limit]);

  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/admin/leads-chatwit/usuarios?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setUsuarios(data.usuarios);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || "Erro ao buscar usuários");
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/leads-chatwit/usuarios?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Usuário excluído com sucesso!",
        });
        setUsuarios(usuarios.filter(usuario => usuario.id !== id));
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir usuário");
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUnificarArquivos = async (usuarioId: string) => {
    setIsUnifying(true);
    try {
      const response = await fetch("/api/admin/leads-chatwit/unify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usuarioId }),
      });

      const data = await response.json();

      if (response.ok && data.pdfUrl) {
        toast({
          title: "Sucesso",
          description: "Arquivos unificados com sucesso!",
        });
        
        // Abrir o PDF em nova aba
        window.open(data.pdfUrl, "_blank");
      } else {
        throw new Error(data.error || "Erro ao unificar arquivos");
      }
    } catch (error) {
      console.error("Erro ao unificar arquivos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível unificar os arquivos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUnifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {(isLoading || initialLoading) ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead className="w-10">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map(usuario => (
              <UsuarioItem
                key={usuario.id}
                usuario={usuario}
                onDelete={handleDeleteUsuario}
                onViewLeads={onViewLeads}
                onUnificarArquivos={handleUnificarArquivos}
                isLoading={isUnifying}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {/* Navegação de paginação */}
      {usuarios.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Exibindo {(pagination.page - 1) * pagination.limit + 1} a {
              Math.min(pagination.page * pagination.limit, pagination.total)
            } de {pagination.total} usuários
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || isLoading}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages || isLoading}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 