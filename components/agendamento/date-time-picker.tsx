// components/agendamento/date-time-picker.tsx

"use client";

import * as React from "react";
import { add, format } from "date-fns";
import { ptBR } from "date-fns/locale"; // Importando pt-BR
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePickerDemo } from "./time-picker-demo";

interface DateTimePickerProps {
  date: Date;
  setDate: (date: Date) => void;
}

export function DateTimePicker({ date, setDate }: DateTimePickerProps) {
  /**
   * Carregar a hora atual quando um usuário clica em um novo dia
   * em vez de resetar para 00:00
   */
  const handleSelect = (newDay: Date | undefined) => {
    if (!newDay) return;
    if (!date) {
      setDate(newDay);
      return;
    }
    const diff = newDay.getTime() - date.getTime();
    const diffInDays = diff / (1000 * 60 * 60 * 24);
    const newDateFull = add(date, { days: Math.ceil(diffInDays) });
    setDate(newDateFull);
  };

  return (
    <div className="space-y-2">
      {/* Label para o seletor de data e hora */}
      <label className="block text-sm font-medium text-gray-700">
        Escolha Data e Hora (padrão 24h)
      </label>

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
            {date
              ? format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
              : <span>Selecionar data e hora</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
            locale={ptBR} // Passando a localidade para o Calendar
            className="border border-gray-300 rounded-md"
            nextLabel="Próximo" // Customizando o label do botão Próximo
            prevLabel="Anterior" // Customizando o label do botão Anterior
            modifiers={{
              selected: date ? { start: date, end: date } : undefined,
            }}
            modifiersClassNames={{
              selected: "bg-indigo-500 text-white",
              today: "border border-indigo-500",
            }}
          />
          <div className="p-3 border-t border-border">
            <TimePickerDemo setDate={setDate} date={date} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
