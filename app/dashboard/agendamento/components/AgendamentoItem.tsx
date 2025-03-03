"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import EditAgendamentoDialog from "./EditAgendamentoDialog";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Agendamento } from "@/types/agendamento"; // Importa o tipo completo

interface AgendamentoItemProps {
  agendamento: Agendamento;
  onExcluir: (id: string) => void;
  refetch: () => void;
  userID: string;
}

const AgendamentoItem: React.FC<AgendamentoItemProps> = ({ agendamento, onExcluir, refetch, userID }) => {
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

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

    try {
      const response = await axios.delete(`/api/agendar/delete/${agendamento.id}`, {
        headers: {
          "user-id": userID,
        },
      });

      if (response.status === 200) {
        toast({
          title: "Agendamento Excluído",
          description: "Seu agendamento foi excluído com sucesso.",
        });
        refetch();
      } else {
        toast({
          title: "Erro ao Excluir",
          description: "Ocorreu um erro ao excluir o agendamento.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao excluir agendamento:", error);
      toast({
        title: "Erro ao Excluir",
        description: error.response?.data?.error || "Ocorreu um erro ao excluir o agendamento.",
        variant: "destructive",
      });
    }
  };

  return (
    <li className="p-4 border rounded-md shadow-sm">
      <p className="text-lg font-medium">
        {format(new Date(agendamento.Data), "PPP", { locale: ptBR })} às{" "}
        {format(new Date(agendamento.Data), "HH:mm")}
      </p>
      <p className="text-gray-600">{agendamento.Descrição}</p>
      <div className="mt-2 flex space-x-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={handleExcluir}>
          Excluir
        </Button>
      </div>
      {isEditOpen && (
        <EditAgendamentoDialog
          agendamento={agendamento}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          refetch={refetch}
        />
      )}
    </li>
  );
};

export default AgendamentoItem;
