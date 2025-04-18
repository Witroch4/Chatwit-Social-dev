"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud, FileText, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

interface CSVUploaderProps {
  onCSVUploaded: (content: string, parsedData?: Array<Record<string, string>>) => void;
  isUploading?: boolean;
  maxSizeMB?: number;
}

export function CSVUploader({ onCSVUploaded, isUploading = false, maxSizeMB = 5 }: CSVUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      setSuccess(false);
      
      if (acceptedFiles.length === 0) {
        return;
      }

      const file = acceptedFiles[0];
      
      // Verificar tamanho
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`O arquivo não deve exceder ${maxSizeMB}MB`);
        return;
      }
      
      // Verificar extensão
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Por favor, envie um arquivo CSV');
        return;
      }

      const reader = new FileReader();
      
      reader.onabort = () => setError('Upload cancelado');
      reader.onerror = () => setError('Falha ao ler o arquivo');
      
      reader.onload = async () => {
        try {
          const content = reader.result as string;
          
          // Validação básica
          if (!content || content.trim().length === 0) {
            setError('O arquivo está vazio');
            return;
          }
          
          // Parsing básico para validar o formato
          const lines = content.split(/\r?\n/).filter(line => line.trim());
          
          if (lines.length === 0) {
            setError('Nenhum dado encontrado no arquivo');
            return;
          }
          
          // Parse CSV para array de objetos
          const parsedData = lines.map(line => {
            const [nome, numero] = line.split(',').map(val => val.trim());
            return { nome, numero };
          }).filter(item => item.nome && item.numero);
          
          if (parsedData.length === 0) {
            setError('Nenhum contato válido encontrado no arquivo');
            return;
          }
          
          // Passar o conteúdo e dados parseados para o callback
          onCSVUploaded(content, parsedData);
          setSuccess(true);
        } catch (err) {
          console.error('Erro ao processar CSV:', err);
          setError('Erro ao processar o arquivo. Verifique se está no formato correto.');
        }
      };
      
      reader.readAsText(file);
    },
    [maxSizeMB, onCSVUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : success ? (
            <Check className="h-8 w-8 text-green-500" />
          ) : (
            <UploadCloud className="h-8 w-8 text-gray-400" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploading
                ? 'Processando arquivo...'
                : success
                ? 'Arquivo carregado com sucesso'
                : 'Arraste e solte um arquivo CSV aqui, ou clique para selecionar'}
            </p>
            <p className="text-xs text-gray-500">
              Formato esperado: "Nome,Numero" (uma entrada por linha)
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center mt-2">
          <FileText className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-xs text-gray-500">CSV (máx. {maxSizeMB}MB)</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 