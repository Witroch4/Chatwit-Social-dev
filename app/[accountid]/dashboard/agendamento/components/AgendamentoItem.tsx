"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import EditAgendamentoDialog from "./EditAgendamentoDialog";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Agendamento } from "@/types/agendamento";
import { Badge } from "@/components/ui/badge";

// Estende o tipo Agendamento para incluir informações de grupo
interface AgendamentoExtendido extends Agendamento {
  isGrupo?: boolean;
  totalNoGrupo?: number;
  idsNoGrupo?: string[];
}

interface AgendamentoItemProps {
  agendamento: AgendamentoExtendido;
  onExcluir: (id: string) => void;
  refetch: () => void;
  accountid: string;
}

const AgendamentoItem: React.FC<AgendamentoItemProps> = ({ agendamento, onExcluir, refetch, accountid }) => {
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Função para deletar agendamento
  const handleExcluir = async () => {
    if (!agendamento.id) {
      toast({
        title: "Erro",
        description: "ID do agendamento não fornecido.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Se for um grupo, exclui todos os agendamentos do grupo
      if (agendamento.isGrupo && agendamento.idsNoGrupo) {
        // Exclui todos os agendamentos do grupo
        await Promise.all(
          agendamento.idsNoGrupo.map(id =>
            axios.delete(`/api/${accountid}/agendar/delete/${id}`)
          )
        );

        toast({
          title: "Grupo de Agendamentos Excluído",
          description: `Foram excluídos ${agendamento.totalNoGrupo} agendamentos com sucesso.`,
        });
        refetch();
      } else {
        // Exclui um único agendamento
        const response = await axios.delete(`/api/${accountid}/agendar/delete/${agendamento.id}`);

        if (response.status === 200) {
          toast({
            title: "Agendamento Excluído",
            description: "Seu agendamento foi excluído com sucesso.",
          });
          refetch();
        } else {
          throw new Error("Erro ao excluir agendamento");
        }
      }
    } catch (error: any) {
      console.error("Erro ao excluir agendamento:", error);
      toast({
        title: "Erro ao Excluir",
        description: error.response?.data?.error || "Ocorreu um erro ao excluir o agendamento.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Determina o título do agendamento
  const getTitulo = () => {
    if (agendamento.isGrupo) {
      return `Grupo de ${agendamento.totalNoGrupo} postagens`;
    }
    return "Agendamento";
  };

  return (
    <li className="p-4 border rounded-md shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-medium">
              {getTitulo()}
            </p>
            {agendamento.isGrupo && (
              <Badge variant="outline" className="bg-blue-50">
                Grupo
              </Badge>
            )}
            {agendamento.Diario && (
              <Badge variant="outline" className="bg-green-50">
                Diário
              </Badge>
            )}
            {agendamento.Randomizar && (
              <Badge variant="outline" className="bg-purple-50">
                Aleatório
              </Badge>
            )}
          </div>
          <p className="text-gray-600">
            {format(new Date(agendamento.Data), "PPP", { locale: ptBR })} às{" "}
            {format(new Date(agendamento.Data), "HH:mm")}
          </p>
          <p className="text-gray-600 mt-1">{agendamento.Descricao}</p>

          {agendamento.isGrupo && (
            <p className="text-sm text-gray-500 mt-2">
              Este grupo contém {agendamento.totalNoGrupo} postagens que serão publicadas {agendamento.Diario ? "diariamente" : ""}
              {agendamento.Diario && agendamento.Randomizar ? ", " : ""}
              {agendamento.Randomizar ? "aleatoriamente" : ""}.
            </p>
          )}
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleExcluir}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>

      {isEditOpen && (
        <EditAgendamentoDialog
          agendamento={agendamento}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          refetch={refetch}
          accountid={accountid}
        />
      )}
    </li>
  );
};

export default AgendamentoItem;
