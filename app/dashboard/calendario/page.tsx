"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import useAgendamentos from "@/hooks/useAgendamentos";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Agendamento {
  id: string;
  Data: string;
  Descrição: string;
  // Outros campos se necessário…
}

const CalendarioPage: React.FC = () => {
  const { data: session, status } = useSession();
  const userID = session?.user?.id;
  const { agendamentos, loading, error, refetch } = useAgendamentos(userID);
  const { toast } = useToast();
  const router = useRouter();

  // Estado para o dia selecionado e para controlar o diálogo
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filtra os agendamentos do dia selecionado
  const appointmentsForSelectedDay = selectedDay
    ? agendamentos.filter((ag) =>
        isSameDay(new Date(ag.Data), selectedDay)
      )
    : [];

  // Cria um conjunto de strings (no formato "yyyy-MM-dd") para os dias que possuem agendamento
  const appointmentDays = new Set(
    agendamentos.map((ag) => format(new Date(ag.Data), "yyyy-MM-dd"))
  );

  // Quando o usuário seleciona um dia, atualiza o estado e abre o diálogo
  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDay(date);
    setDialogOpen(true);
  };

  // Função para excluir um agendamento
  const handleDelete = async (agendamentoId: string) => {
    try {
      const response = await axios.delete(`/api/agendar/${agendamentoId}`);
      if (response.status === 200) {
        toast({
          title: "Agendamento Excluído",
          description: "O agendamento foi excluído com sucesso.",
        });
        refetch();
      }
    } catch (err: any) {
      toast({
        title: "Erro ao Excluir",
        description:
          err.response?.data?.message ||
          "Ocorreu um erro ao excluir o agendamento.",
        variant: "destructive",
      });
    }
  };

  // Função para editar um agendamento (navega para a página de edição)
  const handleEdit = (agendamentoId: string) => {
    router.push(`/dashboard/agendamento/editar/${agendamentoId}`);
  };

  return (
    <main className="p-4 sm:p-10 space-y-4">
      <h1 className="text-2xl font-bold">Calendário de Agendamentos</h1>

      {loading && (
        <div className="flex justify-center items-center">
          <DotLottieReact
            src="/animations/loading.lottie"
            autoplay
            loop
            style={{ width: 150, height: 150 }}
            aria-label="Carregando agendamentos"
          />
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {!loading && (
        <Calendar
          mode="single"
          selected={selectedDay || undefined}
          onSelect={handleDaySelect}
          locale={ptBR}
          /*
            Utilizando os modificadores para marcar (ex.: sublinhar) os dias
            que possuem algum agendamento. Essa funcionalidade depende da implementação
            do seu componente Calendar (baseado em react-day-picker, por exemplo).
          */
          modifiers={{
            hasAppointments: (date: Date) =>
              appointmentDays.has(format(date, "yyyy-MM-dd")),
          }}
          modifiersClassNames={{
            hasAppointments: "underline",
          }}
        />
      )}

      {/* Diálogo que exibe os agendamentos do dia selecionado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Agendamentos para{" "}
              {selectedDay ? format(selectedDay, "dd/MM/yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              {appointmentsForSelectedDay.length > 0
                ? "Clique em editar ou excluir para gerenciar o agendamento."
                : "Nenhum agendamento para este dia."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            {appointmentsForSelectedDay.map((ag) => (
              <div
                key={ag.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <p className="font-semibold">
                    {format(new Date(ag.Data), "HH:mm:ss")}
                  </p>
                  <p className="text-sm text-muted-foreground">{ag.Descrição}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(ag.id)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(ag.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default CalendarioPage;
