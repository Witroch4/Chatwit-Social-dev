// app/dashboard/automação/components/PalavraExpressaoSelection.tsx

"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

interface Props {
  selectedOptionPalavra: string;
  setSelectedOptionPalavra: (val: string) => void;
  inputPalavra: string;
  setInputPalavra: (val: string) => void;
}

export default function PalavraExpressaoSelection({
  selectedOptionPalavra,
  setSelectedOptionPalavra,
  inputPalavra,
  setInputPalavra,
}: Props) {
  // Referência para o campo de input, para focar após inserir uma palavra
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista de exemplos
  const exemplos = ["Preço", "Link", "Comprar"];

  // Função para lidar com o clique em um exemplo
  const handleExemploClick = (exemplo: string) => {
    setInputPalavra(exemplo);
    // Opcional: Focar no campo de input após a inserção
    inputRef.current?.focus();
  };

  return (
    <div>
      <h2 style={{ margin: "20px 0 10px" }}>Palavra ou Expressão</h2>
      <RadioGroup
        value={selectedOptionPalavra}
        onValueChange={(v) => setSelectedOptionPalavra(v)}
        style={{ marginBottom: "10px" }}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="especifica" id="especifica" />
          <Label htmlFor="especifica">Uma palavra ou expressão específica</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="qualquer-palavra" id="qualquer-palavra" />
          <Label htmlFor="qualquer-palavra">Qualquer palavra</Label>
        </div>
      </RadioGroup>

      {selectedOptionPalavra === "especifica" && (
        <div style={{ marginBottom: "20px" }}>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Digite a palavra ou expressão..."
            value={inputPalavra}
            onChange={(e) => setInputPalavra(e.target.value)}
            style={{ marginBottom: "10px" }}
            aria-label="Palavra ou Expressão específica"
          />
          <div style={{ display: "flex", gap: "10px" }}>
            {exemplos.map((exemplo, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleExemploClick(exemplo)}
                style={{
                  textTransform: "capitalize", // Deixa a primeira letra maiúscula
                  cursor: "pointer",
                }}
                aria-label={`Inserir a palavra ${exemplo}`}
              >
                {exemplo}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
