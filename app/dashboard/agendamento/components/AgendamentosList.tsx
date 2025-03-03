// components/agendamento/AgendamentosList.tsx
"use client";

import React from "react";
import AgendamentoItem from "./AgendamentoItem";
import { Agendamento } from "@/types/agendamento";

interface AgendamentosListProps {
  agendamentos: Partial<Agendamento>[]; // Permite objetos parciais
  refetch: () => void;
  userID: string;
}

const AgendamentosList: React.FC<AgendamentosListProps> = ({ agendamentos, refetch, userID }) => {
  return (
    <ul className="space-y-4">
      {agendamentos.map((agendamento) => (
        <AgendamentoItem
          key={agendamento.id}
          agendamento={agendamento as Agendamento} // ou ajuste dentro do AgendamentoItem para lidar com parciais
          onExcluir={() => {}}
          refetch={refetch}
          userID={userID}
        />
      ))}
    </ul>
  );
};

export default AgendamentosList;

