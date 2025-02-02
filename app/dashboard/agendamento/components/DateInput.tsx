// components/agendamento/DateInput.tsx

import React, { forwardRef, ChangeEvent } from "react";
import MaskedInput from "@react-input/mask";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, ""); // Remove caracteres não numéricos
      if (val.length > 8) val = val.slice(0, 8); // Limita a 8 dígitos

      let formatted = "";
      if (val.length >= 2) {
        const day = parseInt(val.slice(0, 2), 10);
        formatted += day > 31 ? "31/" : val.slice(0, 2) + "/";
      } else {
        formatted += val;
      }

      if (val.length >= 4) {
        const month = parseInt(val.slice(2, 4), 10);
        formatted += month > 12 ? "12/" : val.slice(2, 4) + "/";
      } else if (val.length > 2) {
        formatted += val.slice(2);
      }

      if (val.length >= 5) {
        const year = val.slice(4, 8);
        formatted += year;
      }

      onChange(formatted);
    };

    return (
      <MaskedInput
        mask="99/99/9999"
        value={value}
        onChange={handleChange}
        placeholder="DD/MM/AAAA"
        className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        ref={ref}
      />
    );
  }
);

DateInput.displayName = "DateInput";

export default DateInput;
