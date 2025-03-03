"use strict";
// components/agendamento/MediaUploader.tsx
// components/agendamento/MediaUploader.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const FileUpload_1 = __importDefault(require("@/components/custom/FileUpload"));
const MediaUploader = ({ uploadedFiles, setUploadedFiles }) => {
    return (<div>
      <label className="block text-sm font-medium mb-1">Upload de Arquivo</label>
      <FileUpload_1.default uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}/>
    </div>);
};
exports.default = MediaUploader;
