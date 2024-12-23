// app/test-scroll-area/page.tsx
"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils"; // Certifique-se de que este utilitário está disponível no seu projeto

/**
 * Componente ScrollArea personalizado com barra de rolagem azul.
 */
const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] pointer-events-auto">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

/**
 * Componente ScrollBar personalizado com cor azul.
 */
const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className="relative flex-1 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

/**
 * Componentes Popover personalizados.
 */
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

/**
 * Componente TimeSelector para seleção de horários.
 */
interface TimeSelectorProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
}

const generateTimeSlots = (): string[] => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    times.push(`${hour.toString().padStart(2, "0")}:00`);
    times.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return times;
};

const formatTimeInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "";
  } else if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  } else {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
};

const isValidTime = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

const TimeSelector: React.FC<TimeSelectorProps> = ({ selectedTime, onTimeChange }) => {
  const [open, setOpen] = useState(false);
  const timeSlots = generateTimeSlots();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formattedTime = formatTimeInput(e.target.value);
    onTimeChange(formattedTime);
  };

  useEffect(() => {
    if (selectedTime && !isValidTime(selectedTime)) {
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
            maxLength={5}
          />
        </PopoverTrigger>
        <PopoverContent className="w-40 p-0 z-50" align="start">
          <ScrollArea className="h-40">
            <ul className="space-y-1 p-2">
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

/**
 * Página de Teste do ScrollArea.
 */
const TestScrollAreaPage: React.FC = () => {
  const [selectedTime, setSelectedTime] = useState("");

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Página de Teste do ScrollArea</h1>

      {/* ScrollArea Independente */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">ScrollArea Independente</h2>
        <ScrollArea className="h-40 border border-gray-300 rounded-md">
          <div className="p-4">
            {Array.from({ length: 30 }).map((_, index) => (
              <p key={index} className="text-sm mb-2">
                Item {index + 1}: Este é um exemplo de conteúdo dentro do ScrollArea para testar a rolagem. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            ))}
          </div>
        </ScrollArea>
      </section>

      {/* TimeSelector Dentro de Popover */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">TimeSelector Dentro de Popover</h2>
        <TimeSelector selectedTime={selectedTime} onTimeChange={setSelectedTime} />
        {selectedTime && (
          <p className="mt-4 text-md">
            Horário Selecionado: <span className="font-medium">{selectedTime}</span>
          </p>
        )}
      </section>
    </div>
  );
};

export default TestScrollAreaPage;
