import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Settings,
  Type,
  ArrowUp,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading,
  Code,
  FileCode,
  Upload,
  Image as ImageIcon,
  Mic,
  FileText as FileTextIcon,
  File as PdfIcon,
  BookOpen,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FileWithContent } from "@/hooks/useChatwitIA";
import FileManager from "./ChatwitIA/FileManager";
import DocumentViewer from "./ChatwitIA/DocumentViewer";
import ImageEditor from "./ChatwitIA/ImageEditor";
import axios from "axios";
import { toast } from "sonner";

export type UploadPurpose = "vision" | "assistants" | "user_data";

export interface ChatInputFormProps {
  input: string;
  setInput: (v: string | ((p: string) => string)) => void;
  onSubmit: (content: string) => void;
  isLoading?: boolean;
  systemPrompt?: string;
  setSystemPrompt?: (v: string) => void;
  onToggleSettings?: () => void;
  onAudioCapture?: () => void;
  onImageGenerate?: () => void;
  files?: FileWithContent[];
  onUploadFile?: (file: File, purpose: UploadPurpose, fileId?: string) => Promise<any>;
  onDeleteFile?: (id: string) => Promise<any>;
  onEditImage?: (file: File, prompt: string, mask?: File) => Promise<any>;
  onVariationImage?: (file: File) => Promise<any>;
  isFileLoading?: boolean;
  handleTranscriptReady?: (t: string) => void;
  activePdfFileId?: string | null;
  onAskPdf?: (id: string, q: string) => Promise<any>;
  onSetActivePdf?: (id: string | null) => void;
  currentSessionId?: string;
  isCnisAnalysisActive?: boolean;
  onToggleCnisAnalysis?: (isActive: boolean) => void;
}

const MAX_CHAR_LIMIT = 39935;

/* ---------------- UTIL --------------- */
const validateFileForOpenAI = (file: File): { valid: boolean; error?: string } => {
  if (file.size > 25 * 1024 * 1024) return { valid: false, error: `Arquivo ${file.name} excede 25 MB.` };
  const okTypes = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "text/plain", "text/csv", "text/markdown",
    "application/json", "application/jsonl",
  ];
  if (!okTypes.some(t => file.type.includes(t))) return { valid: false, error: `Tipo ${file.type} não suportado.` };
  return { valid: true };
};
/* ------------------------------------- */

const ChatInputForm: React.FC<ChatInputFormProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading = false,
  onToggleSettings,
  onAudioCapture,
  onImageGenerate,
  files = [],
  onUploadFile,
  onDeleteFile,
  onEditImage,
  onVariationImage,
  isFileLoading = false,
  handleTranscriptReady,
  activePdfFileId,
  onAskPdf,
  onSetActivePdf,
  currentSessionId,
  isCnisAnalysisActive = false,
  onToggleCnisAnalysis,
}) => {
  // estado local
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [cnisAnalysisActive, setCnisAnalysisActive] = useState(isCnisAnalysisActive);

  const [viewingFile, setViewingFile] = useState<FileWithContent | null>(null);
  const [editingFile, setEditingFile] = useState<FileWithContent | null>(null);

  const [fileUploadPurpose, setFileUploadPurpose] = useState<UploadPurpose>("user_data");
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});

  const [showAskPdfDialog, setShowAskPdfDialog] = useState(false);
  const [pdfQuestion, setPdfQuestion] = useState("");

  const [pendingPdfRefs, setPendingPdfRefs] = useState<{ id: string; name: string }[]>([]);

  const inputRef      = useRef<HTMLTextAreaElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // fechar menus ao clicar fora
  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  // formatação
  const applyFormat = (fmt: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart || 0;
    const end   = inputRef.current.selectionEnd   || 0;
    const wrap  = (p: string, s = p) => ({ pre: p, suf: s });
    const map: Record<string, { pre:string; suf:string }> = {
      bold:      wrap("**"),
      italic:    wrap("*"),
      heading:   wrap("\n## ", "\n"),
      list:      wrap("\n- "),
      ol:        wrap("\n1. "),
      code:      wrap("`"),
      codeblock: wrap("\n```\n", "\n```\n"),
    };
    const { pre, suf } = map[fmt] || { pre: "", suf: "" };
    setInput(input.slice(0, start) + pre + input.slice(start, end) + suf + input.slice(end));
    setShowFormatMenu(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // auto-size + limite
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const t = e.target.value;
    if (t.length <= MAX_CHAR_LIMIT) {
      setInput(t);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 100), 280)}px`;
    }
  };

  // upload de arquivos
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    for (const file of Array.from(e.target.files)) {
      const { valid, error } = validateFileForOpenAI(file);
      if (!valid) { toast.error(error); continue; }

      const purpose = fileUploadPurpose;
      try {
        setFileUploadProgress(p => ({ ...p, [file.name]: 0 }));
        const fd = new FormData();
        fd.append("file", file);
        fd.append("purpose", purpose);
        
        // Add sessionId to the form data if we're in an active chat session
        // This will allow the backend to associate the file with the chat session
        if (currentSessionId) {
          fd.append("sessionId", currentSessionId);
        }
        
        const res = await axios.post("/api/chatwitia/files", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: evt => {
            setFileUploadProgress(p => ({
              ...p,
              [file.name]: Math.round((evt.loaded / (evt.total || 1)) * 100),
            }));
          },
        });
        setFileUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n; });
        if (res.data.error) throw new Error(res.data.error);
        const fileId = res.data.id as string;
        toast.success(`${file.name} enviado com sucesso`);
        onUploadFile && await onUploadFile(file, purpose, fileId);

        if (purpose === "vision") {
          setPendingPdfRefs(p => [...p, { id: fileId, name: file.name }]);
        }
      } catch (err: any) {
        toast.error(`Erro ao enviar ${file.name}: ${err.message}`);
        setFileUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n; });
      }
    }
    e.target.value = "";
  };

  const openFileSelector = (purpose: UploadPurpose) => {
    setFileUploadPurpose(purpose);
    fileInputRef.current?.click();
  };

  // FileManager helpers
  const handleViewFile        = (id: string) => setViewingFile(files.find(f => f.id === id) || null);
  const handleEditImageFile   = (id: string) => setEditingFile(files.find(f => f.id === id) || null);
  const handleSaveEditedImage = (file: File, prompt: string, mask?: File) =>
    onEditImage ? onEditImage(file, prompt, mask) : Promise.resolve();
  const handleVariation       = async (id: string) => {
    if (!onVariationImage) return;
    const f = files.find(f => f.id === id);
    if (!f) return;
    const blob = await (await fetch(`/api/chatwitia/files/${f.id}/content`)).blob();
    const img = new File([blob], f.filename, { type: "image/png" });
    onVariationImage(img);
  };
  const handleInsertRef = (id: string, name: string) => {
    setPendingPdfRefs(p => [...p, { id, name }]);
    setShowFileManager(false);
  };

  // PDF helpers
  const charPct   = (input.length / MAX_CHAR_LIMIT) * 100;
  const charColor = charPct > 90 ? "text-red-600" : charPct > 75 ? "text-amber-500" : "text-gray-400";

  const renderActivePdfIcon = () => {
    if (!activePdfFileId) return null;
    const f = files.find(x => x.id === activePdfFileId);
    if (!f) return null;
    return (
      <div
        className="absolute left-10 top-2 flex items-center bg-blue-50 px-2 py-1 rounded-md cursor-pointer border border-blue-200"
        onClick={() => setShowAskPdfDialog(true)}
        title="Clique para perguntar sobre este PDF"
      >
        <PdfIcon size={16} className="text-blue-600 mr-1" />
        <span className="text-xs text-blue-700 font-medium truncate max-w-[120px]">
          {f.filename}
        </span>
      </div>
    );
  };

  const handleAskPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfQuestion.trim() || !activePdfFileId || !onAskPdf) return;
    onAskPdf(activePdfFileId, pdfQuestion);
    setPdfQuestion("");
    setShowAskPdfDialog(false);
  };

  const handleRemoveActivePdf = () => {
    onSetActivePdf?.(null);
    setShowAskPdfDialog(false);
  };

  // juntando input + markdown links
  const handleSend = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading) return;
  
    const mdLinks = pendingPdfRefs
      .map(r => `[${r.name}](file_id:${r.id})`)
      .join("\n");
    const content = input.trim() + (mdLinks ? "\n" + mdLinks : "");
  
    if (!content) return;
  
    onSubmit(content);     // 👈 agora mandamos só a string
    setInput("");
    setPendingPdfRefs([]);
  };
  
  // Toggle CNIS Analysis mode
  const handleToggleCnisAnalysis = () => {
    const newState = !cnisAnalysisActive;
    setCnisAnalysisActive(newState);
    console.log("CNIS Análise Profunda:", newState ? "Ativado" : "Desativado");
    
    // Notify parent component if callback exists
    if (onToggleCnisAnalysis) {
      onToggleCnisAnalysis(newState);
    }
  };

  return (
    <>
      {/* badges de PDF pendentes */}
      {pendingPdfRefs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-4">
          {pendingPdfRefs.map(ref => (
            <Tooltip key={ref.id}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full text-sm text-blue-700">
                  <FileTextIcon size={16} />
                  {ref.name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <code className="text-xs">{`[${ref.name}](file_id:${ref.id})`}</code>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* modais e gerenciadores */}
      {showFileManager && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-4xl z-10">
          <FileManager
            files={files}
            loading={isFileLoading}
            onViewFile={handleViewFile}
            onDeleteFile={onDeleteFile || (() => Promise.resolve())}
            onEditImage={onEditImage ? handleEditImageFile : undefined}
            onVariationImage={onVariationImage ? handleVariation : undefined}
            onInsertFileReference={handleInsertRef}
          />
        </div>
      )}
      {viewingFile && (
        <DocumentViewer
          fileUrl={
            viewingFile.content ||
            `/api/chatwitia/files/${viewingFile.id}/content`
          }
          fileName={viewingFile.filename}
          fileType={
            viewingFile.filename.endsWith(".pdf")
              ? "application/pdf"
              : viewingFile.filename.match(/\.(jpe?g|png|gif)$/i)
              ? "image"
              : "text"
          }
          onClose={() => setViewingFile(null)}
        />
      )}
      {editingFile && (
        <ImageEditor
          imageUrl={
            editingFile.content ||
            `/api/chatwitia/files/${editingFile.id}/content`
          }
          fileName={editingFile.filename}
          onClose={() => setEditingFile(null)}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* upload progress */}
      {Object.keys(fileUploadProgress).length > 0 && (
        <div className="fixed bottom-24 right-4 z-50">
          {Object.entries(fileUploadProgress).map(([name, prog]) => (
            <div
              key={name}
              className="bg-white border rounded-md shadow-md p-3 mb-2 max-w-xs"
            >
              <div className="flex justify-between mb-1">
                <span className="text-xs truncate max-w-[180px]">{name}</span>
                <span className="text-xs font-medium">{prog}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${prog}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* perguntar PDF dialog */}
      {showAskPdfDialog && activePdfFileId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Perguntar sobre o PDF</h3>
              <button
                onClick={() => setShowAskPdfDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-1">
              PDF ativo:{" "}
              <span className="font-medium">
                {files.find(f => f.id === activePdfFileId)?.filename}
              </span>
            </p>
            <form onSubmit={handleAskPdf}>
              <textarea
                value={pdfQuestion}
                onChange={e => setPdfQuestion(e.target.value)}
                placeholder="O que você gostaria de saber sobre este PDF?"
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                autoFocus
              />
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={handleRemoveActivePdf}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
                >
                  Desativar PDF
                </button>
                <button
                  type="submit"
                  disabled={!pdfQuestion.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                  Perguntar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INPUT BAR */}
      <div className="sticky bottom-0 border-t bg-white py-4">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="relative rounded-lg border bg-white shadow-sm overflow-hidden flex items-start">
            <button
              type="button"
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Plus size={22} />
            </button>

            {/* textarea */}
            <div className="flex-grow relative">
              {renderActivePdfIcon()}
              {!isLoading ? (
                <>
                  <textarea
                    ref={inputRef}
                    placeholder="Digite sua mensagem..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e as any);
                      }
                      
                    }}
                    rows={1}
                    maxLength={MAX_CHAR_LIMIT}
                    className={`w-full py-2 px-3 bg-transparent focus:outline-none resize-none min-h-[100px] max-h-[280px] overflow-auto ${
                      activePdfFileId ? "pl-[150px]" : ""
                    }`}
                  />
                  {charPct > 50 && (
                    <div className={`absolute bottom-1 right-3 text-xs ${charColor}`}>
                      {input.length.toLocaleString()} /{" "}
                      {MAX_CHAR_LIMIT.toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-2 px-3 min-h-[100px]">Aguardando resposta...</div>
              )}
              
              {/* CNIS Analysis Button - moved to bottom left */}
              <div className="absolute bottom-1 left-3">
                <button
                  type="button"
                  onClick={handleToggleCnisAnalysis}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    cnisAnalysisActive 
                      ? "bg-[#BDDCF4] text-blue-700" 
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Análise Profunda CNIS
                </button>
              </div>
            </div>

            {/* buttons */}
            <div className="flex items-center space-x-1 py-2 pr-2">
              <button
                onClick={() => setShowFileManager(!showFileManager)}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <FileTextIcon size={20} />
              </button>
              <button
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <Type size={20} />
              </button>
              <button
                onClick={onAudioCapture}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <Mic size={20} />
              </button>
              {onToggleSettings && (
                <button
                  onClick={onToggleSettings}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  <Settings size={20} />
                </button>
              )}
              <button
                onClick={onImageGenerate}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <ImageIcon size={20} />
              </button>
              <button
                onClick={() => setShowUploadMenu(!showUploadMenu)}
                className="p-2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <Upload size={20} />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && pendingPdfRefs.length === 0)}
                className="ml-1 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                <ArrowUp size={20} />
              </button>

            </div>
          </div>

          {/* upload menu */}
          {showUploadMenu && (
            <div
              ref={uploadMenuRef}
              className="absolute bottom-20 left-4 bg-white border rounded-lg shadow-lg z-10 py-1 min-w-[220px]"
            >
              <button
                onClick={() => { openFileSelector("user_data"); setShowUploadMenu(false); }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              >
                <Upload size={16} className="mr-2 text-gray-500" /> Carregar arquivo
              </button>
              <button
                onClick={() => { openFileSelector("vision"); setShowUploadMenu(false); }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              >
                <PdfIcon size={16} className="mr-2 text-gray-500" /> PDF – análise pontual
              </button>
              <button
                onClick={() => { openFileSelector("assistants"); setShowUploadMenu(false); }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              >
                <BookOpen size={16} className="mr-2 text-gray-500" /> PDF → banco vetorial
              </button>
            </div>
          )}

          {/* format menu */}
          {showFormatMenu && (
            <div
              ref={formatMenuRef}
              className="absolute bottom-20 right-28 bg-white border rounded-lg shadow-lg z-10 py-1"
            >
              {[
                { fmt: "bold", icon: Bold, label: "Negrito" },
                { fmt: "italic", icon: Italic, label: "Itálico" },
                { fmt: "heading", icon: Heading, label: "Título" },
                { fmt: "list", icon: List, label: "Lista" },
                { fmt: "ol", icon: ListOrdered, label: "Lista numerada" },
                { fmt: "code", icon: Code, label: "Código" },
                { fmt: "codeblock", icon: FileCode, label: "Bloco de código" },
              ].map(({ fmt, icon: Icon, label }) => (
                <button
                  key={fmt}
                  onClick={() => applyFormat(fmt)}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Icon size={16} className="mr-2 text-gray-500" /> {label}
                </button>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.json,.jsonl,.doc,.docx,.csv,.xlsx,.xls"
            multiple
          />
        </div>
      </div>
    </>
  );
};

export default ChatInputForm;
