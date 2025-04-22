import React from "react";
import { Trash2, Settings, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatHeaderProps {
  modelId: string;
  canClear: boolean;
  onClear: () => void;
  onToggleSettings: () => void;
}

export default function ChatHeader({
  modelId,
  canClear,
  onClear,
  onToggleSettings,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <Brain size={20} className="text-blue-600" />
        <h2 className="text-lg font-medium">ChatwitIA</h2>
        <Badge className="ml-2">{modelId}</Badge>
      </div>

      <div className="flex items-center gap-2">
        {canClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs"
            title="Limpar conversa"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        )}

        <button
          onClick={onToggleSettings}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs"
          title="Configurações"
        >
          <Settings size={14} />
          <span className="hidden sm:inline">Config</span>
        </button>
      </div>
    </header>
  );
}

