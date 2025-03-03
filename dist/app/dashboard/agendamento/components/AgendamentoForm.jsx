"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const drawer_1 = require("@/components/ui/drawer");
const date_time_picker_1 = require("./date-time-picker");
const LegendaInput_1 = __importDefault(require("./LegendaInput"));
const MediaUploader_1 = __importDefault(require("./MediaUploader"));
const PostTypeSelector_1 = __importDefault(require("./PostTypeSelector"));
const AgendarFooter_1 = __importDefault(require("./AgendarFooter"));
const AgendamentoForm = ({ dateTime, setDateTime, tipoPostagem, setTipoPostagem, legenda, setLegenda, uploadedFiles, setUploadedFiles, handleAgendar, uploading, setDrawerOpen, }) => {
    return (<div className="flex flex-col h-full">
      <drawer_1.DrawerHeader>
        <drawer_1.DrawerTitle>Agendar nova postagem</drawer_1.DrawerTitle>
        <drawer_1.DrawerDescription>
          Configure as informações do seu agendamento.
        </drawer_1.DrawerDescription>
      </drawer_1.DrawerHeader>

      <div className="flex flex-1 p-4 space-x-4">
        {/* Coluna 1: Data e Hora */}
        <div className="w-full sm:w-1/3 flex flex-col space-y-4">
          <date_time_picker_1.DateTimePicker date={dateTime !== null && dateTime !== void 0 ? dateTime : new Date()} setDate={(d) => {
            if (d !== undefined)
                setDateTime(d);
        }}/>
        </div>

        {/* Coluna 2: Legenda */}
        <div className="w-full sm:w-1/3 flex flex-col space-y-4 mt-4 sm:mt-0">
          <LegendaInput_1.default legenda={legenda} setLegenda={setLegenda}/>
        </div>

        {/* Coluna 3: Upload de Mídia */}
        <div className="w-full sm:w-1/3 flex flex-col space-y-4 mt-4 sm:mt-0">
          <MediaUploader_1.default uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}/>
        </div>

        {/* Coluna 4: Checkboxes */}
        <div className="w-full sm:w-1/3 flex flex-col space-y-4 mt-4 sm:mt-0">
          <PostTypeSelector_1.default tipoPostagem={tipoPostagem} setTipoPostagem={setTipoPostagem}/>
        </div>
      </div>

      <AgendarFooter_1.default onAgendar={handleAgendar} uploading={uploading}/>
    </div>);
};
exports.default = AgendamentoForm;
