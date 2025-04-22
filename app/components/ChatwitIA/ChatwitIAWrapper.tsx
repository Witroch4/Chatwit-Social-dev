'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatInputForm from '../ChatInputForm';
import { useChatwitIA } from '@/hooks/useChatwitIA';
import AudioInput from './AudioInput';
import ImageGenerator from './ImageGenerator';

interface ChatwitIAWrapperProps {
  onSendInitialMessage: (message: string) => void;
}

export default function ChatwitIAWrapper({ onSendInitialMessage }: ChatwitIAWrapperProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Call the onSendInitialMessage with the current input
    onSendInitialMessage(input);
    
    // Clear the input after sending
    setInput('');
  };

  const handleTranscriptReady = (transcript: string) => {
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
  };

  const handleAudioMessage = async (audioBlob: Blob) => {
    if (isLoading) return;
    // Pass audio message to parent
    // This would typically be implemented in a full version
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="h-full flex flex-col items-center justify-center px-4">
          <h1 className="text-4xl font-bold mb-8">ChatwitIA</h1>
          
          <div className="max-w-2xl">
            <h2 className="text-2xl font-medium text-center mb-5">Por onde começamos?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
              <button 
                className="bg-gray-50 p-4 rounded-lg border hover:bg-gray-100 transition-colors text-left"
                onClick={() => onSendInitialMessage("Explique como o GPT-4 funciona para um desenvolvedor")}
              >
                <div className="font-medium mb-1">Explique como o GPT-4 funciona</div>
                <div className="text-sm text-gray-600">Para um desenvolvedor que quer entender a tecnologia</div>
              </button>
              
              <button 
                className="bg-gray-50 p-4 rounded-lg border hover:bg-gray-100 transition-colors text-left"
                onClick={() => onSendInitialMessage("Crie um plano de estudo para aprender React e Next.js em 8 semanas")}
              >
                <div className="font-medium mb-1">Crie um plano de estudo</div>
                <div className="text-sm text-gray-600">Para aprender React e Next.js em 8 semanas</div>
              </button>
              
              <button 
                className="bg-gray-50 p-4 rounded-lg border hover:bg-gray-100 transition-colors text-left"
                onClick={() => onSendInitialMessage("Escreva uma API REST em Node.js para um sistema de agendamento")}
              >
                <div className="font-medium mb-1">Escreva uma API REST</div>
                <div className="text-sm text-gray-600">Em Node.js para um sistema de agendamento</div>
              </button>
              
              <button 
                className="bg-gray-50 p-4 rounded-lg border hover:bg-gray-100 transition-colors text-left"
                onClick={() => onSendInitialMessage("Gere um código para analisar e visualizar dados em Python com matplotlib")}
              >
                <div className="font-medium mb-1">Gere um código para análise de dados</div>
                <div className="text-sm text-gray-600">Em Python com matplotlib</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Usando o componente ChatInputForm */}
      <ChatInputForm 
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        onImageGenerate={() => setShowImageGenerator(true)}
        onFileUpload={() => fileInputRef.current?.click()}
        handleTranscriptReady={handleTranscriptReady}
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => e.target.files && e.target.files.length > 0}
        multiple
        accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      />

      {/* Image Generator Modal */}
      {showImageGenerator && (
        <ImageGenerator onClose={() => setShowImageGenerator(false)} />
      )}
    </div>
  );
} 