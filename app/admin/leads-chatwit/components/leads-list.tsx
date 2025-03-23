"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { LeadItem } from "./lead-item";
import { RefreshCw, FileUp } from "lucide-react";
import { DialogDetalheLead } from "./dialog-detalhe-lead";

interface LeadsListProps {
  searchQuery: string;
  onRefresh: () => void;
  initialLoading: boolean;
  refreshCounter?: number;
}

export function LeadsList({ searchQuery, onRefresh, initialLoading, refreshCounter = 0 }: LeadsListProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnifying, setIsUnifying] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
  }, [searchQuery, pagination.page, pagination.limit, refreshCounter]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/admin/leads-chatwit/leads?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setLeads(data.leads);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || "Erro ao buscar leads");
      }
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os leads. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnificarArquivos = async (leadId: string) => {
    setIsUnifying(true);
    try {
      const response = await fetch("/api/admin/leads-chatwit/unify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Arquivos unificados com sucesso!",
        });
        fetchLeads(); // Recarrega a lista para mostrar o PDF unificado
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

  const handleConverterEmImagens = async (leadId: string) => {
    setIsConverting(leadId);
    try {
      const response = await fetch("/api/admin/leads-chatwit/convert-to-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "PDF convertido em imagens com sucesso!",
        });
        fetchLeads(); // Recarrega a lista para mostrar as imagens
      } else {
        throw new Error(data.error || "Erro ao converter PDF em imagens");
      }
    } catch (error) {
      console.error("Erro ao converter PDF em imagens:", error);
      toast({
        title: "Erro",
        description: "Não foi possível converter o PDF em imagens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(null);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/leads-chatwit/leads?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Lead excluído com sucesso!",
        });
        setLeads(leads.filter(lead => lead.id !== id));
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir lead");
      }
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lead. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEditLead = (lead: any) => {
    if (!lead || !lead.id) {
      toast({
        title: "Erro",
        description: "Não foi possível obter os dados do lead",
        variant: "destructive",
      });
      return;
    }
    
    // Se for uma edição interna (flag _internal = true), não abrimos o diálogo novamente
    if (lead._internal) {
      handleSaveLead(lead);
      return;
    }
    
    setCurrentLead(lead);
    setDetailsOpen(true);
  };

  const handleSaveLead = async (leadData: any) => {
    // Verificar se a edição é interna (do diálogo) ou externa (de outra parte da aplicação)
    const isInternalEdit = leadData._internal;
    const forceUpdate = leadData._forceUpdate;
    
    // Remover flags temporárias antes de enviar para a API
    const { _internal, _forceUpdate, _refresh, ...dataToSend } = leadData;
    
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/leads-chatwit/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        // Se forçar atualização ou não for uma edição interna, recarregar a lista completa
        if (forceUpdate || !isInternalEdit || leadData._refresh) {
          fetchLeads(); 
        }
        
        // Se for apenas um refresh, atualizar o item específico na lista
        else if (leadData._refresh) {
          // Buscar dados atualizados para este lead específico
          const responseItem = await fetch(`/api/admin/leads-chatwit/leads?id=${leadData.id}`);
          const dataItem = await responseItem.json();
          
          if (responseItem.ok && dataItem.lead) {
            // Atualizar apenas este item na lista
            setLeads(prevLeads => prevLeads.map(lead => 
              lead.id === leadData.id ? dataItem.lead : lead
            ));
          }
        }
        
        return Promise.resolve();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao atualizar lead");
      }
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o lead. Tente novamente.",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleToggleLead = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, id]);
    } else {
      setSelectedLeads(prev => prev.filter(leadId => leadId !== id));
    }
  };

  return (
    <div className="space-y-4">
      {selectedLeads.length > 0 && (
        <div className="flex items-center justify-between bg-muted p-2 rounded-md">
          <span>{selectedLeads.length} leads selecionados</span>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedLeads([])}
            >
              Limpar seleção
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => toast({
                title: "Não implementado",
                description: "Esta funcionalidade será adicionada em breve.",
              })}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Exportar Selecionados
            </Button>
          </div>
        </div>
      )}

      {(isLoading || initialLoading) ? (
        <div className="flex justify-center items-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum lead encontrado.
        </div>
      ) : (
        <div className="overflow-auto">
          {/* Removemos a classe "table-fixed" para que as colunas se ajustem naturalmente */}
          <Table className="w-full border">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                    onCheckedChange={handleToggleAllLeads}
                    aria-label="Selecionar todos os leads"
                  />
                </TableHead>
                <TableHead className="w-[250px]">Lead</TableHead>
                <TableHead className="w-[100px]">Usuário</TableHead>
                <TableHead className="w-[150px]">Arquivos</TableHead>
                <TableHead className="w-[80px]">PDF</TableHead>
                <TableHead className="w-[80px]">Imagens</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <LeadItem
                  key={lead.id}
                  lead={lead}
                  onUnificarArquivos={handleUnificarArquivos}
                  onConverterEmImagens={handleConverterEmImagens}
                  onEdit={handleEditLead}
                  onDelete={handleDeleteLead}
                  checked={selectedLeads.includes(lead.id)}
                  onCheckedChange={(checked) => handleToggleLead(lead.id, checked)}
                  isLoading={isUnifying}
                  isConverting={isConverting}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {leads.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Exibindo {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} leads
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

      {currentLead && (
        <DialogDetalheLead
          lead={currentLead}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onEdit={handleSaveLead}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
