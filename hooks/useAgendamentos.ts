// hooks/useAgendamentos.ts

import { useEffect, useState } from "react";
import axios from "axios";

interface Agendamento {
  id: string;
  Data: string;
  Descrição: string;
  // Adicione outros campos conforme necessário
}

const useAgendamentos = (userID: string | undefined) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgendamentos = async () => {
    if (!userID) return;
    setLoading(true);
    try {
      const response = await axios.get("/api/agendar", {
        headers: {
          "user-id": userID, // Enviar userID nos headers
        },
      });
      setAgendamentos(response.data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao buscar agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, [userID]);

  return { agendamentos, loading, error, refetch: fetchAgendamentos };
};

export default useAgendamentos;
