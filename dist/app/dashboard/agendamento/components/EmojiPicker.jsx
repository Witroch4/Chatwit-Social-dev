"use strict";
// components/agendamento/EmojiPicker.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const emojis = ["😊", "😂", "😍", "😎", "👍", "🙏", "🎉", "🔥", "❤️", "✨", "🥳", "🤔", "🤩", "😭", "😴"];
const EmojiPicker = ({ onSelect }) => {
    return (<div className="flex flex-wrap gap-2">
      {emojis.map((emoji) => (<button key={emoji} type="button" onClick={() => onSelect(emoji)} className="text-2xl focus:outline-none hover:bg-gray-200 p-1 rounded">
          {emoji}
        </button>))}
    </div>);
};
exports.default = EmojiPicker;
