"use strict";
// components/agendamento/LegendaInput.tsx
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const textarea_1 = require("@/components/ui/textarea");
const button_1 = require("@/components/ui/button");
const dotlottie_react_1 = require("@lottiefiles/dotlottie-react");
const popover_1 = require("@/components/ui/popover");
const EmojiPicker_1 = __importDefault(require("./EmojiPicker"));
const LegendaInput = ({ legenda, setLegenda }) => {
    const legendaRef = (0, react_1.useRef)(null);
    const [openEmojiSelector, setOpenEmojiSelector] = (0, react_1.useState)(false);
    const insertEmoji = (emoji) => {
        if (legendaRef.current) {
            const textarea = legendaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = legenda;
            const before = text.substring(0, start);
            const after = text.substring(end, text.length);
            const newText = before + emoji + after;
            setLegenda(newText);
            // Move cursor após o emoji
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
                textarea.focus();
            }, 0);
        }
    };
    return (<div>
      <label className="block text-sm font-medium mb-1">Legenda da Postagem</label>
      <div className="flex items-center mb-2">
        <textarea_1.Textarea ref={legendaRef} placeholder="Digite a legenda da sua postagem aqui." value={legenda} onChange={(e) => setLegenda(e.target.value)} className="resize-none h-24 flex-1"/>
        <popover_1.Popover open={openEmojiSelector} onOpenChange={setOpenEmojiSelector}>
          <popover_1.PopoverTrigger asChild>
            <button_1.Button variant="outline" size="icon" className="ml-2 flex items-center justify-center" aria-label="Adicionar Emoji">
              <dotlottie_react_1.DotLottieReact src="/animations/smile.lottie" autoplay loop={true} style={{
            width: "24px",
            height: "24px",
        }}/>
            </button_1.Button>
          </popover_1.PopoverTrigger>
          <popover_1.PopoverContent className="w-40 p-2" align="start">
            <EmojiPicker_1.default onSelect={insertEmoji}/>
          </popover_1.PopoverContent>
        </popover_1.Popover>
      </div>
    </div>);
};
exports.default = LegendaInput;
