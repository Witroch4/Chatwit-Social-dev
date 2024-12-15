'use client';

import { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('home');
  const [date, setDate] = useState<Date | undefined>(new Date());

  const sections = [
    { key: 'home', label: 'Home' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'calendario-posts', label: 'Calendário de Posts' },
    { key: 'analise-desempenho', label: 'Análise de Desempenho' },
    { key: 'gerenciamento-mensagens', label: 'Gerenciamento de Mensagens' },
    { key: 'relatorios', label: 'Relatórios' },
  ];

  return (
    <div className="flex h-full w-full">
      {/* Menu Lateral já está no layout */}
      {/* Conteúdo Principal */}
      <div className="flex-1 p-4">
        <div className="bg-white p-4 rounded-lg shadow-md dark:bg-gray-900">
          {activeSection === 'calendario-posts' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Calendário de Posts
              </h2>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border mt-4"
              />
            </>
          ) : (
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {sections.find((section) => section.key === activeSection)?.label}
            </h2>
          )}
        </div>
      </div>
    </div>
  );
}
