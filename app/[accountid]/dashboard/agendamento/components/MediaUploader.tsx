// components/agendamento/MediaUploader.tsx
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
    </div>
  );
};

export default MediaUploader;

