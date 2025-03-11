'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const AccessDeniedPage = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="bg-destructive/10 p-4 rounded-full mb-6">
        <ShieldAlert className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Acesso Negado</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        Você não tem permissão para acessar esta página. Esta área é restrita a administradores do sistema.
      </p>
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/')}
        >
          Voltar para a página inicial
        </Button>
      </div>
    </div>
  );
};

export default AccessDeniedPage;