// app/dashboard/teste/page.tsx
'use client';

import { useState } from 'react';

export default function TestePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrigger = async () => {
    setLoading(true);
    setError(null);
    setLogs([]);

    try {
      const res = await fetch('/api/scheduler/trigger', {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro desconhecido');
      }

      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao executar agendamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Teste Scheduler</h1>
      <button
        onClick={handleTrigger}
        disabled={loading}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          backgroundColor: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Agendando...' : 'Executar Scheduler'}
      </button>
      {error && <div style={{ color: 'red' }}>Erro: {error}</div>}
      {logs.length > 0 && (
        <div>
          <h2>Logs:</h2>
          <pre
            style={{
              background: '#f4f4f4',
              padding: '10px',
              maxHeight: '500px',
              overflow: 'auto',
              borderRadius: '5px',
            }}
          >
            {logs.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
