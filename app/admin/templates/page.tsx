// app/admin/templates/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, MessageSquare, MessageSquareOff, Plus, Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
      <div className="px-4 py-8 bg-background">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Templates do WhatsApp</h1>
          </div>
          <Link href="/admin/templates/criar">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo Template
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground">
          Gerencie os templates de mensagens disponíveis em sua conta.
        </p>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <TemplatesDisponiveis />
      </div>
    </main>
  );
}

function TemplatesDisponiveis() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [isRealData, setIsRealData] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataSource, setDataSource] = useState<string>("database");

  const fetchTemplates = async (refresh = false) => {
    try {
      if (refresh) {
        setIsSyncing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let url = '/api/admin/atendimento/templates';
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (languageFilter !== 'all') params.append('language', languageFilter);
      if (refresh) params.append('refresh', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const res = await axios.get(url);
      if (!res.data.success) {
        setError(res.data.details || 'Erro ao carregar templates');
        setTemplates([]);
      } else {
        setTemplates(res.data.templates as Template[]);
        setIsRealData(res.data.isRealData === true);
        setDataSource(res.data.fromApi ? "api" : "database");
        if (refresh && res.data.templates.length > 0) {
          toast.success(`${res.data.templates.length} templates sincronizados com sucesso`);
        } else if (refresh) {
          toast.info("Nenhum template encontrado na API");
        }
      }
    } catch {
      setError('Erro de rede ao carregar os templates');
      setTemplates([]);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, languageFilter]);

  function getCategoryColor(cat: string) {
    switch (cat.toUpperCase()) {
      case 'UTILITY': return 'bg-blue-100 text-blue-800';
      case 'MARKETING': return 'bg-amber-100 text-amber-800';
      case 'AUTHENTICATION': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-2xl font-bold">Templates Disponíveis</h2>
          <p className="text-muted-foreground">
            Templates aprovados disponíveis para envio via API
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => fetchTemplates(true)} 
            disabled={isSyncing}
            className="flex items-center gap-1"
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSyncing ? "Sincronizando..." : "Sincronizar com Meta"}
          </Button>

          <div className="flex flex-col">
            <Label htmlFor="category-select">Categoria</Label>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger id="category-select" className="w-[160px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="UTILITY">Utilidade</SelectItem>
                <SelectItem value="MARKETING">Marketing</SelectItem>
                <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col">
            <Label htmlFor="language-select">Idioma</Label>
            <Select
              value={languageFilter}
              onValueChange={setLanguageFilter}
            >
              <SelectTrigger id="language-select" className="w-[160px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pt_BR">Português (BR)</SelectItem>
                <SelectItem value="en_US">Inglês (US)</SelectItem>
                <SelectItem value="es_ES">Espanhol</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 items-center">
            <Badge variant="outline" className={cn(
              dataSource === "api" 
                ? "bg-blue-50 text-blue-700" 
                : "bg-green-50 text-green-700"
            )}>
              {dataSource === "api" ? "Via API" : "Banco de Dados"}
            </Badge>
            {isRealData ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                Dados reais
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                Simulado
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle /> <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <MessageSquareOff className="mx-auto text-muted-foreground" />
          <h3 className="mt-4 font-medium">Nenhum template encontrado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Tente sincronizar com a API ou criar um novo template
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => fetchTemplates(true)}
            disabled={isSyncing}
          >
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Sincronizar com Meta
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 bg-muted p-3 text-sm font-medium">
            <div className="col-span-3">Nome</div>
            <div className="col-span-3">Categoria</div>
            <div className="col-span-2">Idioma</div>
            <div className="col-span-3">ID</div>
            <div className="col-span-1">Ações</div>
          </div>
          {templates.map((t, i) => (
            <div
              key={t.id}
              className={`grid grid-cols-12 p-3 items-center ${
                i < templates.length - 1 ? 'border-b' : ''
              } hover:bg-muted/50`}
            >
              <div className="col-span-3 truncate font-medium">
                <Link href={`/admin/templates/${t.id}`} className="hover:underline">
                  {t.name}
                </Link>
              </div>
              <div className="col-span-3">
                <Badge className={cn('font-normal', getCategoryColor(t.category))}>
                  {t.category}
                </Badge>
              </div>
              <div className="col-span-2 text-sm">{t.language}</div>
              <div className="col-span-3 text-xs font-mono truncate text-muted-foreground">
                {t.id}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(t.id);
                    toast.success('ID copiado!');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
