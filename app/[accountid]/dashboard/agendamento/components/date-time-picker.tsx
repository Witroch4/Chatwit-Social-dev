"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";

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
  setDate: (date: Date | undefined) => void;
  isPostagemDiaria?: boolean;
}

export function DateTimePicker({ date, setDate, isPostagemDiaria = false }: DateTimePickerProps) {
  const handleSelect = (selectedDay: Date | undefined) => {
    if (!selectedDay) return;

    // Preserva a hora do "date" atual
    const oldHours = date.getHours();
    const oldMinutes = date.getMinutes();
    const oldSeconds = date.getSeconds();
    const oldMs = date.getMilliseconds();

    // Cria nova data juntando o dia/mes/ano do 'selectedDay'
    // com a hora do 'date' atual
    const newDateWithOldTime = new Date(
      selectedDay.getFullYear(),
      selectedDay.getMonth(),
      selectedDay.getDate(),
      oldHours,
      oldMinutes,
      oldSeconds,
      oldMs
    );

    setDate(newDateWithOldTime);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {isPostagemDiaria ? "Escolha a Hora" : "Escolha Data e Hora"}
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
            {isPostagemDiaria ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                {date
                  ? format(date, "HH:mm:ss", { locale: ptBR })
                  : <span>Selecionar hora</span>}
              </>
            ) : (
              <>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date
                  ? format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                  : <span>Selecionar data e hora</span>}
              </>
            )}
          </Button>
        </PopoverTrigger>
        {/* Adicione as classes 'z-50' e 'pointer-events-auto' */}
        <PopoverContent
          className="w-auto p-0 z-50 pointer-events-auto"
          align="start"
        >
          {!isPostagemDiaria && (
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              initialFocus
              locale={ptBR}
              className="border border-gray-300 rounded-md"
            />
          )}
          <div className={cn("p-3", !isPostagemDiaria && "border-t border-border")}>
            <TimePickerDemo setDate={setDate} date={date} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
