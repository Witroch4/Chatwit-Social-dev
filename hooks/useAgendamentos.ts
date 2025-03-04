import { useEffect, useState } from "react";
import axios from "axios";

interface Agendamento {
  id: string;
  Data: string;
  Descrição: string;
  // Adicione outros campos conforme necessário
}

/**
 * Agora o hook recebe userID e igUserId
 */
const useAgendamentos = (
  userID: string | undefined,
  igUserId: string | undefined
) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgendamentos = async () => {
    // Se não existir userID ou igUserId, não faz a busca
    if (!userID || !igUserId) return;

    setLoading(true);

    try {
      // Passamos userID e igUserId via query string
      const response = await axios.get(
        `/api/agendar?userID=${userID}&igUserId=${igUserId}`
      );
      console.log("Resposta da API:", response.data);

      // O Baserow geralmente retorna { count, next, previous, results: [ ... ] }
      setAgendamentos(response.data.results || []);
      setError(null);
    } catch (err: any) {
      console.error("Erro ao buscar agendamentos:", err);
      setError(err.response?.data?.error || "Erro ao buscar agendamentos.");
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  // Faz a busca inicial assim que userID / igUserId forem definidos
  useEffect(() => {
    fetchAgendamentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userID, igUserId]);

  return { agendamentos, loading, error, refetch: fetchAgendamentos };
};

export default useAgendamentos;
