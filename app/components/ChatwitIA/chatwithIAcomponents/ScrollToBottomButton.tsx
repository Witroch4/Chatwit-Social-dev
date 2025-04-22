import React from "react";
import { ArrowDown } from "lucide-react";

interface ScrollBtnProps {
  unread: number;
  onClick: () => void;
}

export default function ScrollToBottomButton({ unread, onClick }: ScrollBtnProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-8 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-all z-20 flex flex-col items-center animate-pulse-light"
      aria-label="Rolar para novas mensagens"
    >
      <ArrowDown size={20} />
      {unread > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unread}
        </div>
      )}
      <span className="text-xs mt-1 font-medium">Nova(s)</span>
    </button>
  );
}
