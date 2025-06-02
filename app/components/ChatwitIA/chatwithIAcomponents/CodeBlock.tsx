import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism, coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useTheme } from "next-themes";

interface CodeBlockProps {
  language: string;
  value: string;
}

export const detectLanguage = (language: string, value: string) => {
  if (language) return language;
  if (value.includes("import ") && value.includes("from ") && value.includes("def "))
    return "python";
  if (value.includes("function") && (value.includes("=>") || value.includes("{")))
    return "javascript";
  if (value.includes("class ") && value.includes("extends ")) return "typescript";
  if (value.includes("#include") && value.includes("int main")) return "cpp";
  if (value.includes("<?php")) return "php";
  if (value.includes("<html>") || value.includes("<!DOCTYPE html>")) return "html";
  if (value.includes("@media") || value.includes(".class {")) return "css";
  if (value.trim().startsWith("SELECT")) return "sql";
  return "";
};

export default function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const detectedLanguage = detectLanguage(language, value);
  const displayLanguage = detectedLanguage || "código";

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 🔧 NOVO: Detectar se está no modo escuro
  const isDark = theme === 'dark';

  // Componente personalizado para substituir o SyntaxHighlighter usando um div em vez de pre
  const HighlighterWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="overflow-auto p-4"
      style={{
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: "0.875rem",
        lineHeight: 1.7,
        backgroundColor: "#F9F9F9",
        color: "#24292e",
        fontWeight: "500",
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="rounded-lg overflow-hidden border border-border my-4 bg-muted/30">
      {/* Header do código com tema apropriado */}
      <div className="bg-muted/50 px-4 py-2 text-xs flex justify-between items-center border-b border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground font-medium cursor-default">
              {displayLanguage}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {detectedLanguage
                ? `Linguagem: ${detectedLanguage}`
                : "Linguagem não detectada automaticamente"}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-green-600 dark:text-green-400" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {copied
                ? "Copiado para a área de transferência!"
                : "Copiar código para a área de transferência"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Conteúdo do código com sintaxe colorida */}
      <SyntaxHighlighter
        language={detectedLanguage || "text"}
        style={isDark ? coldarkDark : prism}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: isDark ? "hsl(var(--muted))" : "hsl(var(--muted))",
          borderRadius: 0,
          fontSize: "0.875rem",
          lineHeight: "1.7",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          color: isDark ? "hsl(var(--foreground))" : "hsl(var(--foreground))",
          fontWeight: "500",
        }}
        PreTag="div" // Usar div em vez de pre para evitar erros de hidratação
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
