// components/agendamento/AgendamentosList.tsx

"use client";

import React from "react";
import AgendamentoItem from "./AgendamentoItem";

interface Agendamento {
  id: string;
  Data: string;
  Descrição: string;
  // Adicione outros campos conforme necessário
}

interface AgendamentosListProps {
  agendamentos: Agendamento[];
  refetch: () => void;
  userID: string;
}

const AgendamentosList: React.FC<AgendamentosListProps> = ({ agendamentos, refetch, userID }) => {
  return (
    <ul className="space-y-4">
      {agendamentos.map((agendamento) => (
        <AgendamentoItem
          key={agendamento.id}
          agendamento={agendamento}
          onExcluir={() => {}} // Remover ou ajustar conforme a lógica
          refetch={refetch}
          userID={userID}
        />
      ))}
    </ul>
  );
};

export default AgendamentosList;
