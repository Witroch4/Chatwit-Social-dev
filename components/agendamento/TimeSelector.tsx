// components/agendamento/TimeSelector.tsx
"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface TimeSelectorProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
}

/**
 * Gera uma lista de horários em intervalos de 30 minutos.
 * @returns {string[]} Lista de horários no formato "HH:MM".
 */
const generateTimeSlots = (): string[] => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    times.push(`${hour.toString().padStart(2, "0")}:00`);
    times.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return times;
};

/**
 * Formata a entrada do usuário para o formato "HH:MM".
 * Insere automaticamente ":" após os dois primeiros dígitos.
 * @param {string} value - Valor digitado pelo usuário.
 * @returns {string} Valor formatado.
 */
const formatTimeInput = (value: string): string => {
  // Remove todos os caracteres que não são dígitos
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "";
  } else if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  } else {
    // Ignora caracteres além dos 4 primeiros dígitos
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
};

/**
 * Valida se o horário está no formato correto e dentro dos limites válidos.
 * @param {string} time - Horário no formato "HH:MM".
 * @returns {boolean} Retorna true se o horário for válido, caso contrário, false.
 */
const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

const TimeSelector: React.FC<TimeSelectorProps> = ({ selectedTime, onTimeChange }) => {
  const [open, setOpen] = useState(false);
  const timeSlots = generateTimeSlots();

  /**
   * Manipula a mudança na entrada do usuário, aplicando a máscara e validando o formato.
   * @param {ChangeEvent<HTMLInputElement>} e - Evento de mudança do input.
   */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formattedTime = formatTimeInput(e.target.value);
    onTimeChange(formattedTime);
  };

  /**
   * Verifica a validade do horário sempre que selectedTime é atualizado.
   */
  useEffect(() => {
    if (selectedTime && !isValidTime(selectedTime)) {
      // Se o horário não for válido, podemos opcionalmente resetar ou notificar o usuário
      // Aqui apenas removemos o último caractere inválido
      onTimeChange(formatTimeInput(selectedTime));
    }
  }, [selectedTime, onTimeChange]);

  return (
    <div>
      <label htmlFor="time-input" className="block text-sm font-medium mb-1">
        Hora da Postagem
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <input
            id="time-input"
            type="text"
            value={selectedTime}
            onChange={handleInputChange}
            placeholder="HH:MM"
            onFocus={() => setOpen(true)}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Selecionar hora da postagem"
            maxLength={5} // Limita a entrada a 5 caracteres (HH:MM)
          />
        </PopoverTrigger>
        <PopoverContent
              className="w-40 p-2 z-50" // Remova o flex-col se não for necessário
              align="start"
            >


          <ScrollArea className="h-40">
            <ul className="space-y-1">
              {timeSlots.map((slot) => (
                <li key={slot}>
                  <button
                    type="button"
                    onClick={() => {
                      onTimeChange(slot);
                      setOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
                    aria-label={`Selecionar horário ${slot}`}
                  >
                    {slot}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimeSelector;
