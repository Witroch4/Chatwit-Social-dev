'use client';

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Settings,
  Type,
  ArrowUp,
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
  onSubmit: (content: string) => Promise<any>;
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
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [cnisActive, setCnisActive] = useState(isCnisAnalysisActive);
  const [viewingFile, setViewingFile] = useState<FileWithContent | null>(null);
  const [editingFile, setEditingFile] = useState<FileWithContent | null>(null);
  const [fileUploadPurpose, setFileUploadPurpose] = useState<UploadPurpose>("user_data");
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});
  const [pendingPdfRefs, setPendingPdfRefs] = useState<{ id: string; name: string }[]>([]);
  const [showAskPdf, setShowAskPdf] = useState(false);
  const [pdfQuestion, setPdfQuestion] = useState("");
  const sendingRef = useRef(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Handle send with debounce against duplicates
  const handleSend = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (isLoading || sendingRef.current) return;
    sendingRef.current = true;

    const mdLinks = pendingPdfRefs.map(r => `[${r.name}](file_id:${r.id})`).join("\n");
    const content = input.trim() + (mdLinks ? "\n" + mdLinks : "");
    if (!content) {
      sendingRef.current = false;
      return;
    }

    await onSubmit(content);
    
    // Remove 'model' parameter from URL after sending the first message
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('model')) {
        url.searchParams.delete('model');
        window.history.replaceState({}, document.title, url.toString());
        console.log("ChatInputForm: URL cleaned, removed model parameter");
      }
    }
    
    setInput("");
    setPendingPdfRefs([]);
    sendingRef.current = false;
  };

  // Toggle CNIS analysis
  const toggleCnis = () => {
    const next = !cnisActive;
    setCnisActive(next);
    onToggleCnisAnalysis?.(next);
  };

  return (
    <>
      {/* Pending PDF badges */}
      {pendingPdfRefs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-4">
          {pendingPdfRefs.map(r => (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full text-sm text-blue-700">
                  <FileTextIcon size={16} /> {r.name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <code className="text-xs">{`[${r.name}](file_id:${r.id})`}</code>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* File Manager / Document / Image Editor */}
      {showFileManager && (
        <FileManager
          files={files}
          loading={isFileLoading}
          onViewFile={id => setViewingFile(files.find(f => f.id === id) || null)}
          onDeleteFile={onDeleteFile}
          onEditImage={editingFile => setEditingFile(files.find(f => f.id === editingFile) || null)}
          onVariationImage={onVariationImage}
          onInsertFileReference={(id, name) => {
            setPendingPdfRefs(prev => [...prev, { id, name }]);
            setShowFileManager(false);
          }}
        />
      )}
      {viewingFile && (
        <DocumentViewer
          fileUrl={viewingFile.content || `/api/chatwitia/files/${viewingFile.id}/content`}
          fileName={viewingFile.filename}
          fileType={viewingFile.filename.endsWith(".pdf") ? "application/pdf" : "image"}
          onClose={() => setViewingFile(null)}
        />
      )}
      {editingFile && (
        <ImageEditor
          imageUrl={editingFile.content || `/api/chatwitia/files/${editingFile.id}/content`}
          fileName={editingFile.filename}
          onClose={() => setEditingFile(null)}
          onSave={(file, prompt, mask) => onEditImage?.(file, prompt, mask)}
        />
      )}

      {/* Main input bar */}
      <div className="sticky bottom-0 border-t bg-white py-4">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="relative flex items-start rounded-lg border bg-white shadow-sm overflow-visible">
            <button
              type="button"
              onClick={() => setShowUploadMenu(prev => !prev)}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Plus size={22} />
            </button>

            <div className="flex-grow relative">
              {/* Textarea */}
              <textarea
                ref={inputRef}
                className="w-full py-2 px-3 bg-transparent resize-none focus:outline-none min-h-[100px] max-h-[280px] overflow-auto"
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={e => {
                  if (e.target.value.length <= MAX_CHAR_LIMIT) {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 100), 280)}px`;
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    handleSend(e);
                  }
                }}
              />

              {/* CNIS toggle */}
              <button
                type="button"
                onClick={toggleCnis}
                className={`absolute bottom-1 left-3 px-3 py-1 text-xs font-medium rounded-full transition ${
                  cnisActive ? "bg-blue-100 text-blue-700" : "bg-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                Análise Profunda CNIS
              </button>
            </div>

            <div className="flex items-center space-x-1 py-2 pr-2">
              <button onClick={() => setShowFileManager(prev => !prev)} disabled={isLoading} className="p-2 text-gray-400 hover:text-gray-600">
                <FileTextIcon size={20} />
              </button>
              <button onClick={() => setShowFormatMenu(prev => !prev)} disabled={isLoading} className="p-2 text-gray-400 hover:text-gray-600">
                <Type size={20} />
              </button>
              <button onClick={onAudioCapture} disabled={isLoading} className="p-2 text-gray-400 hover:text-gray-600">
                <Mic size={20} />
              </button>
              {onToggleSettings && (
                <button onClick={onToggleSettings} disabled={isLoading} className="p-2 text-gray-400 hover:text-gray-600">
                  <Settings size={20} />
                </button>
              )}
              <button onClick={onImageGenerate} disabled={isLoading} className="p-2 text-gray-400 hover:text-gray-600">
                <ImageIcon size={20} />
              </button>
              <button onClick={() => setShowUploadMenu(prev => !prev)} disabled={isLoading} className="p-2 text-gray-400 hover:text-gray-600">
                <Upload size={20} />
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && pendingPdfRefs.length === 0)}
                className="ml-1 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                <ArrowUp size={20} />
              </button>
            </div>

            {/* Upload menu */}
            {showUploadMenu && (
              <div ref={uploadMenuRef} className="absolute bottom-20 left-4 bg-white border rounded-lg shadow-lg py-1 min-w-[220px] z-50">
                {[
                  { purpose: "user_data" as UploadPurpose, label: "Carregar arquivo", icon: Upload },
                  { purpose: "vision" as UploadPurpose, label: "PDF – análise pontual", icon: PdfIcon },
                  { purpose: "assistants" as UploadPurpose, label: "PDF → banco vetorial", icon: BookOpen },
                ].map(item => (
                  <button
                    key={item.purpose}
                    onClick={() => {
                      setFileUploadPurpose(item.purpose);
                      fileInputRef.current?.click();
                      setShowUploadMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <item.icon size={16} className="mr-2 text-gray-500" /> {item.label}
                  </button>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async e => {
                if (!e.target.files) return;
                for (const file of Array.from(e.target.files)) {
                  // ...handle file upload as before...
                }
                e.target.value = "";
              }}
              multiple
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInputForm;
