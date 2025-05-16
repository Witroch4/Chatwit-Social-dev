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
import { toast, useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { LeadItem } from "./lead-item";
import { RefreshCw, FileUp, Edit3 } from "lucide-react";
import { DialogDetalheLead } from "./dialog-detalhe-lead";
import { LeadChatwit } from "../types";

interface LeadsListProps {
  searchQuery: string;
  onRefresh: () => void;
  initialLoading: boolean;
  refreshCounter?: number;
}

export function LeadsList({ searchQuery, onRefresh, initialLoading, refreshCounter = 0 }: LeadsListProps) {
  const [leads, setLeads] = useState<LeadChatwit[]>([]);
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
  const [currentLead, setCurrentLead] = useState<LeadChatwit | null>(null);

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
        action: (
          <ToastAction altText="Tentar novamente" onClick={fetchLeads}>
            Tentar novamente
          </ToastAction>
        ),
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
    
    // Se for uma edição interna (flag _internal = true) ou tiver _skipDialog, não abrimos o diálogo
    if (lead._internal || lead._skipDialog) {
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
        // Se for uma edição interna, apenas atualizar o lead atual sem recarregar tudo
        if (isInternalEdit && !forceUpdate) {
          // Atualizar apenas o lead atual no estado
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === leadData.id ? { ...lead, ...dataToSend } : lead
            )
          );
          
          // Atualizar o currentLead também para manter o dialog sincronizado
          if (currentLead && currentLead.id === leadData.id) {
            setCurrentLead((prev: LeadChatwit | null) => prev ? { ...prev, ...dataToSend } : null);
          }
        } 
        // Se forçar atualização ou não for uma edição interna, recarregar a lista completa
        else if (forceUpdate || !isInternalEdit) {
          fetchLeads();
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

  const handleDigitarManuscrito = async (lead: any) => {
    try {
      // Obter as imagens convertidas
      let imagensConvertidas: string[] = [];
      if (lead.imagensConvertidas) {
        try {
          imagensConvertidas = JSON.parse(lead.imagensConvertidas);
        } catch (error) {
          console.error("Erro ao processar URLs de imagens convertidas:", error);
        }
      }

      // Se não houver imagens no campo imagensConvertidas, buscar dos arquivos
      if (!imagensConvertidas || imagensConvertidas.length === 0) {
        imagensConvertidas = lead.arquivos
          .filter((a: { pdfConvertido: string | null }) => a.pdfConvertido)
          .map((a: { pdfConvertido: string }) => a.pdfConvertido)
          .filter((url: string | null) => url && url.length > 0);
      }

      // Preparar os dados para enviar ao webhook
      const webhookData = {
        lead_chatwit: true,// Campo booleano para identificação
        manuscrito: true, // Campo booleano para identificação
        id: lead.id,
        nome: lead.nomeReal || lead.name || "Lead sem nome",
        email: lead.email,
        telefone: lead.phoneNumber,
        status: lead.status,
        data_criacao: lead.createdAt,
        usuario: {
          id: lead.usuario.id,
          nome: lead.usuario.name,
          email: lead.usuario.email,
          channel: lead.usuario.channel
        },
        arquivos: lead.arquivos.map((a: { id: string; dataUrl: string; fileType: string }) => ({
          id: a.id,
          url: a.dataUrl,
          tipo: a.fileType,
          nome: a.fileType
        })),
        arquivos_pdf: lead.pdfUnificado ? [{
          id: lead.id,
          url: lead.pdfUnificado,
          nome: "PDF Unificado"
        }] : [],
        arquivos_imagens: imagensConvertidas.map((url: string, index: number) => ({
          id: `${lead.id}-img-${index}`,
          url: url,
          nome: `Página ${index + 1}`
        })),
        recursos: lead.datasRecurso ? JSON.parse(lead.datasRecurso).map((data: string, index: number) => ({
          id: `${lead.id}-recurso-${index}`,
          tipo: "recurso",
          status: "realizado",
          data_criacao: data
        })) : [],
        observacoes: lead.anotacoes || "",
        metadata: {
          leadUrl: lead.leadUrl,
          sourceId: lead.sourceId,
          concluido: lead.concluido,
          fezRecurso: lead.fezRecurso
        }
      };

      const response = await fetch("/api/admin/leads-chatwit/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Solicitação de digitação enviada com sucesso!",
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar solicitação de digitação");
      }
    } catch (error: any) {
      console.error("Erro ao enviar solicitação de digitação:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar a solicitação de digitação. Tente novamente.",
        variant: "destructive",
      });
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
                <TableHead className="w-[100px]">Manuscrito</TableHead>
                <TableHead className="w-[120px]">Espelho de Correção</TableHead>
                <TableHead className="w-[120px]">Análise</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <LeadItem
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLeads.includes(lead.id)}
                  onSelect={handleToggleLead}
                  onDelete={handleDeleteLead}
                  onEdit={handleEditLead}
                  onUnificar={handleUnificarArquivos}
                  onConverter={handleConverterEmImagens}
                  onDigitarManuscrito={handleDigitarManuscrito}
                  isUnifying={isUnifying}
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
