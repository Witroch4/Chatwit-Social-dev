// components/agendamento/MediaUploader.tsx
"use client";

import React from "react";
import FileUpload, { UploadedFile } from "@/components/custom/FileUpload";

interface MediaUploaderProps {
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ uploadedFiles, setUploadedFiles }) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Upload de Arquivo</label>
      <FileUpload uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
      {uploadedFiles.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {uploadedFiles.length} arquivo(s) carregado(s).
          {uploadedFiles.some(f => f.thumbnail_url) &&
            " Thumbnails geradas para visualização rápida."}
        </p>
      )}
    </div>
  );
};

export default MediaUploader;

