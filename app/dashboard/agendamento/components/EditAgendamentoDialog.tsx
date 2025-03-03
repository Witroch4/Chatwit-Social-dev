"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "./date-time-picker";
import LegendaInput from "./LegendaInput";
import FileUpload, { UploadedFile } from "@/components/custom/FileUpload";
import PostTypeSelector from "./PostTypeSelector";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Agendamento } from "@/types/agendamento";

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

  // Estado para data/hora – agendamento.Data vem como string
  const [date, setDate] = useState<Date>(new Date(agendamento.Data));

  // Função wrapper para setDate
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
    }
  };

  const [tipoPostagem, setTipoPostagem] = useState<string[]>(getTipoPostagemFromAgendamento(agendamento));
  const [legenda, setLegenda] = useState<string>(agendamento.Descrição);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    agendamento.midia.map((m) => ({
      id: m.name,
      name: m.name,
      original_name: m.visible_name,
      progress: 100, // Mídias existentes já estão uploadadas
      url: m.url,
      thumbnails: m.thumbnails,
      mime_type: m.mime_type,
      is_image: m.is_image,
      image_width: m.image_width,
      image_height: m.image_height,
      uploaded_at: m.uploaded_at,
    }))
  );
  const [uploading, setUploading] = useState<boolean>(false);

  function getTipoPostagemFromAgendamento(agendamento: Agendamento): string[] {
    const tipos: string[] = [];
    if (agendamento.Randomizar) tipos.push("Aleatório");
    if (agendamento.Diario) tipos.push("Diario");
    if (agendamento.PostNormal) tipos.push("Post Normal");
    if (agendamento.Reels) tipos.push("Reels");
    if (agendamento.Stories) tipos.push("Stories");
    return tipos;
  }

  const handleEditar = async () => {
    if (!date) {
      toast({
        title: "Edição Incompleta",
        description: "Por favor, selecione data e hora para o agendamento.",
      });
      return;
    }

    setUploading(true);

    try {
      const midiaNames = uploadedFiles.map((file) => file.name).filter(Boolean) as string[];
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

      const isoDate = date.toISOString();

      const updatedRow = {
        Data: isoDate,
        Descrição: legenda,
        midia: uploadedFiles
          .filter((file) => file.url)
          .map((file) => ({
            name: file.name,
            // Adicione outros campos se necessário
          })),
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
        headers: { "Content-Type": "application/json" },
      });

      setUploading(false);

      if (response.status === 200) {
        toast({
          title: "Agendamento Atualizado com Sucesso!",
          description: `Data: ${format(date, "PPP 'às' p", { locale: ptBR })}`,
        });
        refetch();
        onClose();
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
        description: error.response?.data?.error || "Ocorreu um erro ao atualizar o agendamento.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:w-full max-w-lg sm:max-w-[600px] max-h-[calc(100vh-100px)] p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
          <DialogDescription>
            Faça as alterações necessárias no agendamento.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(100vh-250px)]">
          <div className="flex flex-col space-y-4 pr-4">
            {/* Use o wrapper handleDateChange */}
            <DateTimePicker date={date} setDate={handleDateChange} />
            <LegendaInput legenda={legenda} setLegenda={setLegenda} />
            <FileUpload uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
            <PostTypeSelector tipoPostagem={tipoPostagem} setTipoPostagem={setTipoPostagem} />
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
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
