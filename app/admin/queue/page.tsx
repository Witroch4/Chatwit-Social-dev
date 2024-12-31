'use client';

import { useSession } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AdminPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (status === "loading") {
    return <p>Carregando...</p>;
  }

  if (!session || session.user.role !== "ADMIN") {
    return <p>Você não tem permissão para acessar esta página.</p>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/schedule-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content, scheduledAt })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Algo deu errado.');
      }

      setSuccess('Postagem agendada com sucesso!');
      setTitle('');
      setContent('');
      setScheduledAt(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Administração - Agendamento de Postagens</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Conteúdo</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            rows={5}
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium">Data e Hora Agendada</label>
          <DatePicker
            selected={scheduledAt}
            onChange={(date: Date) => setScheduledAt(date)}
            showTimeSelect
            dateFormat="Pp"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Agendar Postagem
        </button>
      </form>
    </div>
  );
};

export default AdminPage;
