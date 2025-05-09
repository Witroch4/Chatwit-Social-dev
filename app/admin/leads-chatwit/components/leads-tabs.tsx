"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadsList } from "./leads-list";
import { UsuariosList } from "./usuarios-list";
import Link from "next/link";

interface LeadsTabsProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export function LeadsTabs({ activeTab, onChange }: LeadsTabsProps) {
  const tabs = [
    { id: "leads", label: "Leads" },
    { id: "usuarios", label: "Usuários" },
  ];

  return (
    <div className="border-b">
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              px-4 py-2 text-sm font-medium 
              ${activeTab === tab.id ? 
                "border-b-2 border-primary text-primary" : 
                "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
        <Link 
          href="/admin/leads-chatwit/listagem"
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted"
        >
          Listagem Completa
        </Link>
      </div>
    </div>
  );
} 