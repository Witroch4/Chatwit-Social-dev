// components/agendamento/AgendamentoForm.tsx

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";
import LegendaInput from "./LegendaInput";
import MediaUploader from "./MediaUploader";
import PostTypeSelector from "./PostTypeSelector";
import AgendarFooter from "./AgendarFooter";
import { UploadedFile } from "@/components/custom/FileUpload";

interface AgendamentoFormProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  hora: string;
  setHora: (hora: string) => void;
  tipoPostagem: string[];
  setTipoPostagem: (tipo: string[]) => void;
  legenda: string;
  setLegenda: (legenda: string) => void;
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[]) => void;
  handleAgendar: () => void;
  uploading: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const AgendamentoForm: React.FC<AgendamentoFormProps> = ({
  date,
  setDate,
  hora,
  setHora,
  tipoPostagem,
  setTipoPostagem,
  legenda,
  setLegenda,
  uploadedFiles,
  setUploadedFiles,
  handleAgendar,
  uploading,
  setDrawerOpen,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Removido o botão "Cancelar" do topo */}
      <DrawerHeader>
        <DrawerTitle>Agendar nova postagem</DrawerTitle>
        <DrawerDescription>
          Configure as informações do seu agendamento.
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex flex-1 p-4 space-x-4">
        {/* Coluna 1: Data e Hora */}
        <div className="w-full sm:w-1/6 flex flex-col space-y-4">
          <DateSelector selectedDate={date} onDateChange={setDate} />
          <TimeSelector selectedTime={hora} onTimeChange={setHora} />
        </div>

        {/* Coluna 2: Legenda */}
        <div className="w-full sm:w-1/4 flex flex-col space-y-4 mt-4 sm:mt-0">
          <LegendaInput legenda={legenda} setLegenda={setLegenda} />
        </div>

        {/* Coluna 3: Upload de Mídia */}
        <div className="w-full sm:w-1/4 flex flex-col space-y-4 mt-4 sm:mt-0">
          <MediaUploader
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
          />
        </div>

        {/* Coluna 4: Checkboxes */}
        <div className="w-full sm:w-1/4 flex flex-col space-y-4 mt-4 sm:mt-0">
          <PostTypeSelector
            tipoPostagem={tipoPostagem}
            setTipoPostagem={setTipoPostagem}
          />
        </div>
      </div>

      <AgendarFooter onAgendar={handleAgendar} uploading={uploading} />
    </div>
  );
};

export default AgendamentoForm;
