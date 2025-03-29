"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, Calendar, CopyCheck, Zap, ListIcon, Loader2, Filter, AlertCircle, CheckCircle, MessageSquare, MessageSquareOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
}

export default function TemplatesPage() {
  return (
    <main className="w-full">
      <div className="flex flex-col space-y-2 px-4 sm:px-6 lg:px-8 py-8 bg-background">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-muted-foreground">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Templates do WhatsApp</h1>
        </div>
        <p className="text-muted-foreground max-w-4xl">
          Gerencie os templates de mensagens disponíveis em sua conta do WhatsApp Business.
        </p>
      </div>
      
      <div className="flex flex-col gap-4 mt-8 mx-auto max-w-7xl p-4">
        <TemplatesDisponiveis />
      </div>
    </main>
  );
}

function TemplatesDisponiveis() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealData, setIsRealData] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setConfigError(null);
        
        let url = '/api/admin/atendimento/templates';
        const params = new URLSearchParams();
        
        if (categoryFilter && categoryFilter !== "all") {
          params.append('category', categoryFilter);
        }
        
        if (languageFilter && languageFilter !== "all") {
          params.append('language', languageFilter);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const response = await axios.get(url);
        
        if (!response.data.success) {
          if (response.data.details?.includes("Credenciais") || response.data.details?.includes("token")) {
            setConfigError(response.data.details || "Erro na configuração da API do WhatsApp. Verifique suas credenciais.");
          } else {
            setError(response.data.details || "Erro ao carregar templates");
          }
          setTemplates([]);
        } else {
          setTemplates(response.data.templates);
          setIsRealData(response.data.isRealData === true);
        }
      } catch (err) {
        console.error("Erro ao buscar templates:", err);
        setError("Erro de rede ao carregar os templates");
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [categoryFilter, languageFilter, isClient]);

  const getCategoryColor = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'UTILITY':
        return 'bg-blue-100 text-blue-800';
      case 'MARKETING':
        return 'bg-amber-100 text-amber-800';
      case 'AUTHENTICATION':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const ConfigInstructions = () => {
    if (!configError) return null;
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro de configuração</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{configError}</p>
          <div className="bg-gray-900 p-4 rounded text-xs font-mono text-green-400 overflow-auto">
            <p># No arquivo .env.local, adicione:</p>
            <p>FB_GRAPH_API_BASE="https://graph.facebook.com/v18.0"</p>
            <p>WHATSAPP_BUSINESS_ID="seu-business-id-do-whatsapp"</p>
            <p>WHATSAPP_TOKEN="seu-token-de-acesso-com-permissão-whatsapp_business_management"</p>
          </div>
          <p className="text-sm">
            Certifique-se de que seu token possui a permissão <code>whatsapp_business_management</code>.
          </p>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Templates Disponíveis</h2>
          <p className="text-muted-foreground">
            Templates aprovados disponíveis para envio via WhatsApp API
          </p>
        </div>
        
        {isRealData ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Dados reais da API
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Dados simulados
          </Badge>
        )}
      </div>
      
      <ConfigInstructions />
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando templates...</span>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <MessageSquareOff className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhum template encontrado</h3>
          <p className="text-muted-foreground mt-2">
            Não foram encontrados templates aprovados na sua conta do WhatsApp Business.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 bg-muted p-3 font-medium text-sm">
            <div className="col-span-3">Nome</div>
            <div className="col-span-3">Categoria</div>
            <div className="col-span-2">Idioma</div>
            <div className="col-span-4">ID</div>
          </div>
          <div className="divide-y">
            {templates.map((template) => (
              <div key={template.id} className="grid grid-cols-12 p-3 text-sm hover:bg-muted/20">
                <div className="col-span-3 font-medium">{template.name}</div>
                <div className="col-span-3">
                  <Badge variant="outline" className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                </div>
                <div className="col-span-2 text-muted-foreground">{template.language}</div>
                <div className="col-span-4 text-xs font-mono text-muted-foreground truncate">
                  {template.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 