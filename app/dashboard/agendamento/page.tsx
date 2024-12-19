"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarIcon, MoveRight, Minus, Plus } from "lucide-react";

// Componentes de UI (ajuste paths conforme seu setup):
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/custom/image-upload";
import { cn } from "@/lib/utils";

export default function AgendamentoDePostagens() {
  const [date, setDate] = React.useState<Date>();
  const [hora, setHora] = React.useState<string>("");
  const [tipoPostagem, setTipoPostagem] = React.useState<string[]>([]);

  // Função para lidar com checkboxes:
  const handleCheckChange = (value: string) => {
    setTipoPostagem(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  return (
    <main className="p-10 space-y-4">
      <h1 className="text-2xl font-bold">Agendamento de Postagens</h1>

      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Novo Agendamento</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Agendar nova postagem</DrawerTitle>
              <DrawerDescription>
                Configure as informações do seu agendamento.
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 space-y-4">

              {/* DatePicker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data da Postagem</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Escolher data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora da Postagem</label>
                <input
                  type="time"
                  className="border border-input bg-background rounded-md p-2 w-full"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>

              {/* Texto (legenda) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Legenda da Postagem</label>
                <Textarea placeholder="Digite a legenda da sua postagem aqui." />
              </div>

              {/* Upload de Arquivo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload de Arquivo</label>
                <ImageUpload />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Postagem</label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aleatorio"
                      checked={tipoPostagem.includes("Aleatório")}
                      onCheckedChange={() => handleCheckChange("Aleatório")}
                    />
                    <label htmlFor="aleatorio" className="text-sm font-medium leading-none">
                      Aleatório
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="diario"
                      checked={tipoPostagem.includes("Diario")}
                      onCheckedChange={() => handleCheckChange("Diario")}
                    />
                    <label htmlFor="diario" className="text-sm font-medium leading-none">
                      Diário
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="postnormal"
                      checked={tipoPostagem.includes("Post Normal")}
                      onCheckedChange={() => handleCheckChange("Post Normal")}
                    />
                    <label htmlFor="postnormal" className="text-sm font-medium leading-none">
                      Post Normal
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reels"
                      checked={tipoPostagem.includes("Reels")}
                      onCheckedChange={() => handleCheckChange("Reels")}
                    />
                    <label htmlFor="reels" className="text-sm font-medium leading-none">
                      Reels
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="stories"
                      checked={tipoPostagem.includes("Stories")}
                      onCheckedChange={() => handleCheckChange("Stories")}
                    />
                    <label htmlFor="stories" className="text-sm font-medium leading-none">
                      Stories
                    </label>
                  </div>
                </div>
              </div>

            </div>

            <DrawerFooter>
              <Button>Agendar</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Exemplo de outro conteúdo na página, se necessário */}
      <div>
        <Link className="flex gap-1 items-center" href="https://github.com/ManishBisht777/file-vault">
          Github
          <MoveRight size={15} />
        </Link>
      </div>
    </main>
  );
}
