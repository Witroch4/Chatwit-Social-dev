// components/agendamento/EmojiPicker.tsx
"use client";

import React from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const emojis = ["😊", "😂", "😍", "😎", "👍", "🙏", "🎉", "🔥", "❤️", "✨", "🥳", "🤔", "🤩", "😭", "😴"];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-2xl focus:outline-none hover:bg-gray-200 p-1 rounded"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;
