"use strict";
// app/dashboard/automacao/components/PalavraExpressaoSelection.tsx
"use client";
// app/dashboard/automacao/components/PalavraExpressaoSelection.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PalavraExpressaoSelection;
const radio_group_1 = require("@/components/ui/radio-group");
const label_1 = require("@/components/ui/label");
const input_1 = require("@/components/ui/input");
const button_1 = require("@/components/ui/button");
const react_1 = require("react");
function PalavraExpressaoSelection({ selectedOptionPalavra, setSelectedOptionPalavra, inputPalavra, setInputPalavra, disabled = false, // Valor padrão como false
className = "", }) {
    // Referência para o campo de input, para focar após inserir uma palavra
    const inputRef = (0, react_1.useRef)(null);
    // Lista de exemplos
    const exemplos = ["Preço", "Link", "Comprar"];
    // Função para lidar com o clique em um exemplo
    const handleExemploClick = (exemplo) => {
        var _a;
        if (disabled)
            return; // <<< BLOQUEIA A INSERÇÃO SE ESTIVER DESABILITADO
        setInputPalavra(exemplo);
        // Opcional: Focar no campo de input após a inserção
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    };
    return (<div className={className} style={{ pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.6 : 1 }}>
      <h2 style={{ margin: "20px 0 10px" }}>Palavra ou Expressão</h2>
      <radio_group_1.RadioGroup value={selectedOptionPalavra} onValueChange={(v) => {
            if (disabled)
                return; // <<< BLOQUEIA A MUDANÇA SE ESTIVER DESABILITADO
            setSelectedOptionPalavra(v);
        }} style={{ marginBottom: "10px" }}>
        <div className="flex items-center space-x-2">
          <radio_group_1.RadioGroupItem value="especifica" id="especifica" disabled={disabled}/>
          <label_1.Label htmlFor="especifica">Uma palavra ou expressão específica</label_1.Label>
        </div>
        <div className="flex items-center space-x-2">
          <radio_group_1.RadioGroupItem value="qualquer-palavra" id="qualquer-palavra" disabled={disabled}/>
          <label_1.Label htmlFor="qualquer-palavra">Qualquer palavra</label_1.Label>
        </div>
      </radio_group_1.RadioGroup>

      {selectedOptionPalavra === "especifica" && (<div style={{ marginBottom: "20px" }}>
          <input_1.Input ref={inputRef} type="text" placeholder="Digite a palavra ou expressão..." value={inputPalavra} onChange={(e) => {
                if (disabled)
                    return; // <<< BLOQUEIA A MUDANÇA SE ESTIVER DESABILITADO
                setInputPalavra(e.target.value);
            }} style={{ marginBottom: "10px", cursor: disabled ? "not-allowed" : "text" }} aria-label="Palavra ou Expressão específica" disabled={disabled} // <<< DESABILITA O INPUT
        />
          <div style={{ display: "flex", gap: "10px" }}>
            {exemplos.map((exemplo, index) => (<button_1.Button key={index} variant="outline" size="sm" onClick={() => handleExemploClick(exemplo)} style={{
                    textTransform: "capitalize", // Deixa a primeira letra maiúscula
                    cursor: disabled ? "not-allowed" : "pointer", // <<< ALTERAÇÃO DO CURSOR
                    pointerEvents: disabled ? "none" : "auto", // <<< IMPEDIR CLIQUE
                }} aria-label={`Inserir a palavra ${exemplo}`} disabled={disabled} // <<< DESABILITA O BOTÃO
            >
                {exemplo}
              </button_1.Button>))}
          </div>
        </div>)}
    </div>);
}
