// app/dashboard/automação/components/PalavraExpressaoSelection.tsx

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  setInputPalavra
}: Props) {
  return (
    <div>
      <h2 style={{margin:"20px 0 10px"}}>Palavra ou Expressão</h2>
      <RadioGroup
        defaultValue="qualquer-palavra"
        onValueChange={(v)=>setSelectedOptionPalavra(v)}
        style={{marginBottom:"10px"}}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="especifica" id="especifica"/>
          <Label htmlFor="especifica">Uma palavra ou expressão específica</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="qualquer-palavra" id="qualquer-palavra" />
          <Label htmlFor="qualquer-palavra">Qualquer palavra</Label>
        </div>
      </RadioGroup>

      {selectedOptionPalavra === "especifica" && (
        <div style={{marginBottom:"20px"}}>
          <Input
            type="text"
            placeholder="Digite a palavra ou expressão..."
            value={inputPalavra}
            onChange={(e)=>setInputPalavra(e.target.value)}
            style={{marginBottom:"10px"}}
          />
          <div style={{fontSize:"12px", color:"#ccc"}}>
            Exemplos: <span style={{color:"#0af"}}>Preço</span>,{" "}
            <span style={{color:"#0af"}}>Link</span>,{" "}
            <span style={{color:"#0af"}}>Comprar</span>
          </div>
        </div>
      )}
    </div>
  );
}
