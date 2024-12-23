// components/agendamento/EditAgendamentoDialog.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";
import LegendaInput from "./LegendaInput";
import MediaUploader from "./MediaUploader";
import PostTypeSelector from "./PostTypeSelector";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { UploadedFile } from "@/components/custom/FileUpload";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  Data: string;
  Descrição: string;
  Facebook: boolean;
  midia: Array<{ name: string }>;
  X: boolean;
  Linkedin: boolean;
  Instagram: boolean;
  Concluido_FB: boolean;
  Concluido_IG: boolean;
  Concluido_LK: boolean;
  Concluido_X: boolean;
  Stories: boolean;
  Reels: boolean;
  PostNormal: boolean;
  Diario: boolean;
  contador: number | null;
  Randomizar: boolean;
  MidiaID: number | null;
  igUserId: number | null;
  igContainerId: string;
  ReelsID: number | null;
  StoriesID: number | null;
  CarrosselID: string;
  MultStoriesID: string;
  userID: string;
  IGtoken: string;
}

interface EditAgendamentoDialogProps {
  agendamento: Agendamento;
  isOpen: boolean;
  onClose: () => void;
  refetch: () => void;
}

const EditAgendamentoDialog: React.FC<EditAgendamentoDialogProps> = ({
  agendamento,
  isOpen,
  onClose,
  refetch,
}) => {
  const { toast } = useToast();

  // Estados para os campos de edição
  const [date, setDate] = useState<Date | undefined>(new Date(agendamento.Data));
  const [hora, setHora] = useState<string>(
    formatTime(new Date(agendamento.Data))
  );
  const [tipoPostagem, setTipoPostagem] = useState<string[]>([
    ...getTipoPostagemFromAgendamento(agendamento),
  ]);
  const [legenda, setLegenda] = useState<string>(agendamento.Descrição);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    agendamento.midia.map((m) => ({ name: m.name }))
  );
  const [uploading, setUploading] = useState<boolean>(false);

  // Função auxiliar para formatar a hora
  function formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // Função auxiliar para extrair os tipos de postagem do agendamento
  function getTipoPostagemFromAgendamento(agendamento: Agendamento): string[] {
    const tipos: string[] = [];
    if (agendamento.Randomizar) tipos.push("Aleatório");
    if (agendamento.Diario) tipos.push("Diario");
    if (agendamento.PostNormal) tipos.push("Post Normal");
    if (agendamento.Reels) tipos.push("Reels");
    if (agendamento.Stories) tipos.push("Stories");
    return tipos;
  }

  // Função para lidar com a submissão do formulário de edição
  const handleEditar = async () => {
    if (!date || !hora) {
      toast({
        title: "Edição Incompleta",
        description: "Por favor, selecione data e hora para o agendamento.",
      });
      return;
    }

    setUploading(true);

    try {
      const midiaNames = uploadedFiles
        .map((file) => file.name)
        .filter(Boolean) as string[];

      if (midiaNames.length === 0) {
        toast({
          title: "Mídia Não Enviada",
          description: "Por favor, faça upload de pelo menos um arquivo de mídia.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const tipos = {
        "Post Normal": tipoPostagem.includes("Post Normal"),
        Reels: tipoPostagem.includes("Reels"),
        Stories: tipoPostagem.includes("Stories"),
        Diario: tipoPostagem.includes("Diario"),
        Aleatorio: tipoPostagem.includes("Aleatório"),
      };

      const [hours, minutes] = hora.split(":").map(Number);
      const combinedDate = new Date(date);
      combinedDate.setHours(hours, minutes, 0, 0);
      const isoDate = combinedDate.toISOString();

      const updatedRow = {
        Data: isoDate,
        Descrição: legenda,
        midia: midiaNames.map((name) => ({ name })),
        X: tipos.Aleatorio,
        Instagram: true,
        Stories: tipos.Stories,
        Reels: tipos.Reels,
        PostNormal: tipos["Post Normal"],
        Diario: tipos.Diario,
        Randomizar: tipos.Aleatorio,
        IGtoken: agendamento.IGtoken,
        userID: agendamento.userID,
      };

      const response = await axios.patch(`/api/agendar/update/${agendamento.id}`, updatedRow, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      setUploading(false);

      if (response.status === 200) {
        toast({
          title: "Agendamento Atualizado com Sucesso!",
          description: `Data: ${format(combinedDate, "PPP", {
            locale: ptBR,
          })} às ${hora}`,
        });

        refetch(); // Atualizar a lista de agendamentos
        onClose(); // Fechar o diálogo
      } else {
        toast({
          title: "Erro ao Atualizar Agendamento",
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setUploading(false);
      console.error("Erro ao atualizar o agendamento:", error);
      toast({
        title: "Erro ao Atualizar Agendamento",
        description:
          error.response?.data?.error || "Ocorreu um erro ao atualizar o agendamento.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias no agendamento.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          {/* Data da Postagem */}
          <DateSelector selectedDate={date} onDateChange={setDate} />

          {/* Hora da Postagem */}
          <TimeSelector selectedTime={hora} onTimeChange={setHora} />

          {/* Legenda da Postagem */}
          <LegendaInput legenda={legenda} setLegenda={setLegenda} />

          {/* Upload de Mídia */}
          <MediaUploader
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
          />

          {/* Tipo de Postagem */}
          <PostTypeSelector
            tipoPostagem={tipoPostagem}
            setTipoPostagem={setTipoPostagem}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleEditar} disabled={uploading}>
            {uploading ? "Concluindo..." : "Concluir"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAgendamentoDialog;
