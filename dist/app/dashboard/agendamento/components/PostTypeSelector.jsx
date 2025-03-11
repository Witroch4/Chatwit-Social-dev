"use strict";
// components/agendamento/PostTypeSelector.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const checkbox_1 = require("../../../../components/ui/checkbox");
const postTypes = ["Aleatório", "Diario", "Post Normal", "Reels", "Stories"];
const PostTypeSelector = ({ tipoPostagem, setTipoPostagem }) => {
    const handleCheckChange = (value) => {
        setTipoPostagem((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
    };
    return (<div>
      <label className="block text-sm font-medium mb-1">Tipo de Postagem</label>
      <div className="space-y-2">
        {postTypes.map((type) => (<div key={type} className="flex items-center">
            <checkbox_1.Checkbox id={type.toLowerCase()} checked={tipoPostagem.includes(type)} onCheckedChange={() => handleCheckChange(type)}/>
            <label htmlFor={type.toLowerCase()} className="ml-2 text-sm">
              {type}
            </label>
          </div>))}
      </div>
    </div>);
};
exports.default = PostTypeSelector;
