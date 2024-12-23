// components/agendamento/PostTypeSelector.tsx
"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface PostTypeSelectorProps {
  tipoPostagem: string[];
  setTipoPostagem: (types: string[]) => void;
}

const postTypes = ["Aleatório", "Diario", "Post Normal", "Reels", "Stories"];

const PostTypeSelector: React.FC<PostTypeSelectorProps> = ({ tipoPostagem, setTipoPostagem }) => {
  const handleCheckChange = (value: string) => {
    setTipoPostagem((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Tipo de Postagem</label>
      <div className="space-y-2">
        {postTypes.map((type) => (
          <div key={type} className="flex items-center">
            <Checkbox
              id={type.toLowerCase()}
              checked={tipoPostagem.includes(type)}
              onCheckedChange={() => handleCheckChange(type)}
            />
            <label htmlFor={type.toLowerCase()} className="ml-2 text-sm">
              {type}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostTypeSelector;
