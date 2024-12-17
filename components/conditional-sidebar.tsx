// components/conditional-sidebar.tsx

'use client'; // Marca o componente como cliente

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppSidebar } from '@/components/app-sidebar';

const ConditionalSidebar = () => {
  const { data: session, status } = useSession();
  const [isMounted, setIsMounted] = useState(false);

  // Garante que o componente está montado no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Renderiza a Sidebar apenas se o usuário estiver autenticado e o componente estiver montado
  if (!isMounted || status !== 'authenticated') {
    return null;
  }

  return <AppSidebar />;
};

export default ConditionalSidebar;
