// components/agendamento/DateSelector.tsx
"use client";

import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Data da Postagem</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Escolher data</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateChange}
            initialFocus
            locale={ptBR}
            className="border border-gray-300 rounded-md"
            modifiers={{
              selected: selectedDate ? { start: selectedDate, end: selectedDate } : undefined,
            }}
            modifiersClassNames={{
              selected: "bg-indigo-500 text-white",
              today: "border border-indigo-500",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateSelector;
