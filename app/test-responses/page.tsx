"use client";

import { useState } from 'react';

export default function TestResponsesPage() {
  const [imageUrl, setImageUrl] = useState('https://objstoreapi.witdev.com.br/chatwit-social/4325d304-dc0a-4d63-8a1e-68c68a43235a-1.jpg');
  const [prompt, setPrompt] = useState('descreva');
  const [model, setModel] = useState('gpt-4o-2024-11-20');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testResponsesAPI = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/chatwitia/test-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          prompt,
          model
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Teste da OpenAI Responses API</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">URL da Imagem:</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="https://..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Prompt:</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Descreva esta imagem"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Modelo:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="gpt-4o-2024-11-20">gpt-4o-2024-11-20</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
            <option value="chatgpt-4o-latest">chatgpt-4o-latest</option>
          </select>
        </div>
        
        <button
          onClick={testResponsesAPI}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testando...' : 'Testar Responses API'}
        </button>
      </div>
      
      {result && (
        <div className="bg-gray-100 p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Resultado:</h2>
          <pre className="text-sm overflow-auto max-h-96 bg-white p-3 rounded border">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      {imageUrl && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Prévia da Imagem:</h3>
          <img 
            src={imageUrl} 
            alt="Teste" 
            className="max-w-md max-h-64 object-contain border rounded"
            onError={(e) => {
              console.error('Erro ao carregar imagem:', imageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
} 