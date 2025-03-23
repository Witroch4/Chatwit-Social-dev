"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadsList } from "./leads-list";
import { UsuariosList } from "./usuarios-list";

interface LeadsTabsProps {
  isLoading: boolean;
  searchQuery: string;
  refreshCounter?: number;
}

export function LeadsTabs({ isLoading, searchQuery, refreshCounter = 0 }: LeadsTabsProps) {
  const [activeTab, setActiveTab] = useState("leads");
  const [filteredUsuarioId, setFilteredUsuarioId] = useState<string | null>(null);

  const handleChangeTab = (value: string) => {
    setActiveTab(value);
    
    // Limpar filtro de usuário quando trocar para a aba de usuários
    if (value === "usuarios") {
      setFilteredUsuarioId(null);
    }
  };

  const handleViewUserLeads = (usuarioId: string) => {
    setFilteredUsuarioId(usuarioId);
    setActiveTab("leads");
  };

  const handleRefresh = () => {
    // Esta função será implementada se necessário
    // Por enquanto, é apenas um placeholder
  };

  return (
    <Tabs 
      defaultValue="leads" 
      value={activeTab} 
      onValueChange={handleChangeTab}
    >
      <TabsList className="mb-4">
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        {filteredUsuarioId && activeTab === "leads" && (
          <div className="ml-4 text-xs text-muted-foreground">
            Filtrando por usuário
          </div>
        )}
      </TabsList>
      
      <TabsContent value="leads">
        <LeadsList 
          searchQuery={searchQuery}
          onRefresh={handleRefresh}
          initialLoading={isLoading}
          refreshCounter={refreshCounter}
        />
      </TabsContent>
      
      <TabsContent value="usuarios">
        <UsuariosList 
          searchQuery={searchQuery}
          onRefresh={handleRefresh}
          initialLoading={isLoading}
          onViewLeads={handleViewUserLeads}
        />
      </TabsContent>
    </Tabs>
  );
} 