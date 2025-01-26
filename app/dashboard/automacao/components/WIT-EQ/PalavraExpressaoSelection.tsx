// app/dashboard/automacao/components/PalavraExpressaoSelection.tsx

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

  // NOVO: Adicionando props para desabilitar o componente
  disabled?: boolean;
  className?: string;
}

export default function PalavraExpressaoSelection({
  selectedOptionPalavra,
  setSelectedOptionPalavra,
  inputPalavra,
  setInputPalavra,
  disabled = false, // Valor padrão como false
  className = "",
}: Props) {
  // Referência para o campo de input, para focar após inserir uma palavra
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista de exemplos
  const exemplos = ["Preço", "Link", "Comprar"];

  // Função para lidar com o clique em um exemplo
  const handleExemploClick = (exemplo: string) => {
    if (disabled) return; // <<< BLOQUEIA A INSERÇÃO SE ESTIVER DESABILITADO
    setInputPalavra(exemplo);
    // Opcional: Focar no campo de input após a inserção
    inputRef.current?.focus();
  };

  return (
    <div className={className} style={{ pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.6 : 1 }}>
      <h2 style={{ margin: "20px 0 10px" }}>Palavra ou Expressão</h2>
      <RadioGroup
        value={selectedOptionPalavra}
        onValueChange={(v) => {
          if (disabled) return; // <<< BLOQUEIA A MUDANÇA SE ESTIVER DESABILITADO
          setSelectedOptionPalavra(v);
        }}
        style={{ marginBottom: "10px" }}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="especifica" id="especifica" disabled={disabled} />
          <Label htmlFor="especifica">Uma palavra ou expressão específica</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="qualquer-palavra" id="qualquer-palavra" disabled={disabled} />
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
            onChange={(e) => {
              if (disabled) return; // <<< BLOQUEIA A MUDANÇA SE ESTIVER DESABILITADO
              setInputPalavra(e.target.value);
            }}
            style={{ marginBottom: "10px", cursor: disabled ? "not-allowed" : "text" }}
            aria-label="Palavra ou Expressão específica"
            disabled={disabled} // <<< DESABILITA O INPUT
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
                  cursor: disabled ? "not-allowed" : "pointer", // <<< ALTERAÇÃO DO CURSOR
                  pointerEvents: disabled ? "none" : "auto", // <<< IMPEDIR CLIQUE
                }}
                aria-label={`Inserir a palavra ${exemplo}`}
                disabled={disabled} // <<< DESABILITA O BOTÃO
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
