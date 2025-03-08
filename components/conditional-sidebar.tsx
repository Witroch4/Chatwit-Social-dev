// components/conditional-sidebar.tsx

'use client'; // Marca o componente como cliente

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarSkeleton } from '@/components/ui/sidebar-skeleton';

const ConditionalSidebar = () => {
  const { data: session, status } = useSession();
  const [isMounted, setIsMounted] = useState(false);

  // Garante que o componente está montado no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Se o componente não estiver montado ou estiver carregando, não renderiza nada
  // (o esqueleto já é gerenciado pelo DashboardLayoutClient)
  if (!isMounted || status === 'loading') {
    return null;
  }

  // Se não estiver autenticado, não mostra a sidebar
  if (status !== 'authenticated') {
    return null;
  }

  // Se estiver autenticado e montado, mostra a sidebar completa
  return <AppSidebar />;
};

export default ConditionalSidebar;
