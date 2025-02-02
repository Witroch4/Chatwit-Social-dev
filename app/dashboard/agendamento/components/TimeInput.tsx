// components/agendamento/TimeInput.tsx

import React, { forwardRef, ChangeEvent } from "react";
import MaskedInput from "@react-input/mask";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
}

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value, onChange }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, ""); // Remove caracteres não numéricos
      if (val.length > 4) val = val.slice(0, 4); // Limita a 4 dígitos

      let formatted = "";
      if (val.length >= 2) {
        const hours = parseInt(val.slice(0, 2), 10);
        formatted += hours > 23 ? "23:" : val.slice(0, 2) + ":";
      } else {
        formatted += val;
      }

      if (val.length >= 4) {
        const minutes = parseInt(val.slice(2, 4), 10);
        formatted += minutes > 59 ? "59" : val.slice(2, 4);
      } else if (val.length > 2) {
        formatted += val.slice(2);
      }

      onChange(formatted);
    };

    return (
      <MaskedInput
        mask="99:99"
        value={value}
        onChange={handleChange}
        placeholder="HH:MM"
        className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        ref={ref}
      />
    );
  }
);

TimeInput.displayName = "TimeInput";

export default TimeInput;
