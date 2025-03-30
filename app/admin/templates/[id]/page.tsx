"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Send, Trash2, Edit, CheckCircle, Copy, Clipboard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

interface TemplateDetail {
  id: string;
  name: string;
  category: string;
  subCategory?: string | null;
  status: string;
  language: string;
  qualityScore?: string | null;
  correctCategory?: string | null;
  ctaUrlLinkTrackingOptedOut?: boolean | null;
  libraryTemplateName?: string | null;
  messageSendTtlSeconds?: number | null;
  parameterFormat?: string | null;
  previousCategory?: string | null;
  lastEdited?: Date | null;
  components: Array<{
    tipo: string;
    formato?: string;
    texto?: string;
    variaveis: false | Array<{
      nome: string;
      descricao: string;
      exemplo: string;
    }>;
    botoes?: Array<{
      tipo: string;
      texto: string;
      url: string | null;
      telefone: string | null;
    }>;
  }>;
}

export default function TemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>("");
  const [testVariables, setTestVariables] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const templateId = params?.id as string;
  
  useEffect(() => {
    const fetchTemplateDetails = async () => {
      if (!templateId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/admin/atendimento/template-info?template=${templateId}`);
        
        if (!response.data.success) {
          setError(response.data.details || "Erro ao carregar informações do template");
          setTemplate(null);
        } else {
          // Converter o formato recebido para o formato que usamos localmente
          const templateData = response.data.template;
          setTemplate({
            id: templateId,
            name: templateData.nome,
            category: templateData.categoria,
            status: templateData.status || "UNKNOWN",
            language: templateData.idioma || "pt_BR",
            subCategory: templateData.subCategoria,
            qualityScore: templateData.qualidadeScore,
            correctCategory: templateData.categoriaCorreta,
            ctaUrlLinkTrackingOptedOut: templateData.ctaUrlLinkTrackingOptedOut,
            libraryTemplateName: templateData.nomeTemplateBiblioteca,
            messageSendTtlSeconds: templateData.mensagemSendTtlSegundos,
            parameterFormat: templateData.formatoParametro,
            previousCategory: templateData.categoriaAnterior,
            lastEdited: templateData.ultimaEdicao ? new Date(templateData.ultimaEdicao) : null,
            components: templateData.componentes
          });
          
          // Inicializar os campos de variáveis com exemplos
          const bodyComponent = templateData.componentes.find((c: any) => c.tipo === "BODY");
          if (bodyComponent && bodyComponent.variaveis) {
            setTestVariables(bodyComponent.variaveis.map((v: any) => v.exemplo || ""));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar detalhes do template:", err);
        setError("Erro ao carregar as informações do template");
        setTemplate(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplateDetails();
  }, [templateId]);

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
  
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAUSED':
        return 'bg-orange-100 text-orange-800';
      case 'DISABLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleTestSend = async () => {
    if (!testPhoneNumber || !template) return;
    
    try {
      setIsSending(true);
      
      // Formatar o número de telefone (adicionar 55 se necessário)
      let phoneNumber = testPhoneNumber.replace(/\D/g, '');
      if (!phoneNumber.startsWith('55')) {
        phoneNumber = '55' + phoneNumber;
      }
      
      const response = await axios.post('/api/admin/atendimento/disparo-mensagem', {
        csvData: `Nome,Numero\nTeste,${phoneNumber}`,
        templateName: template.name,
        configuracoes: {
          variaveis: testVariables
        }
      });
      
      if (response.data.success) {
        toast.success(`Mensagem enviada para ${phoneNumber}`);
      } else {
        toast.error(response.data.error || "Ocorreu um erro ao enviar a mensagem de teste");
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem de teste:", err);
      toast.error("Ocorreu um erro ao enviar a mensagem de teste");
    } finally {
      setIsSending(false);
    }
  };
  
  const handleDelete = async () => {
    if (!template) return;
    
    if (!confirm(`Tem certeza que deseja excluir o template "${template.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await axios.delete('/api/admin/atendimento/templates', {
        data: { name: template.name }
      });
      
      if (response.data.success) {
        toast.success(`O template "${template.name}" foi excluído com sucesso`);
        router.push('/admin/templates');
      } else {
        toast.error(response.data.error || "Ocorreu um erro ao excluir o template");
      }
    } catch (err) {
      console.error("Erro ao excluir template:", err);
      toast.error("Ocorreu um erro ao excluir o template");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Função para copiar texto para a área de transferência
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast("Código copiado para a área de transferência!");
      },
      () => {
        toast.error("Falha ao copiar para a área de transferência");
      }
    );
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 max-w-6xl">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando informações do template...</span>
        </div>
      </div>
    );
  }
  
  if (error || !template) {
    return (
      <div className="container mx-auto py-10 max-w-6xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error || "Template não encontrado"}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="ghost" asChild>
            <Link href="/admin/templates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para lista de templates
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{template.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/templates/${templateId}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Excluir
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Template</CardTitle>
              <CardDescription>
                Visualização dos componentes do template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="visualizacao" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="visualizacao">Visualização</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                
                <TabsContent value="visualizacao" className="space-y-6">
                  {template.components.map((component, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <h3 className="font-semibold mb-2">{component.tipo}</h3>
                      
                      {component.formato && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Formato:</span> {component.formato}
                        </div>
                      )}
                      
                      {component.texto && (
                        <div className="mb-2">
                          <div className="text-sm font-medium mb-1">Texto:</div>
                          <div className="bg-muted p-3 rounded-md whitespace-pre-line">
                            {component.texto}
                          </div>
                        </div>
                      )}
                      
                      {component.variaveis && component.variaveis.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-medium mb-1">Variáveis:</div>
                          <div className="grid grid-cols-3 gap-2">
                            {component.variaveis.map((variavel, idx) => (
                              <div key={idx} className="border rounded-md p-2 text-xs">
                                <span className="font-mono font-bold">{`{{${variavel.nome}}}`}</span>
                                <p className="text-muted-foreground mt-1">{variavel.descricao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {component.botoes && component.botoes.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-medium mb-1">Botões:</div>
                          <div className="flex flex-wrap gap-2">
                            {component.botoes.map((botao, idx) => (
                              <div key={idx} className="border rounded-md p-2 text-xs">
                                <span className="font-medium">{botao.tipo}:</span> {botao.texto}
                                {botao.url && <p className="text-blue-600 mt-1">{botao.url}</p>}
                                {botao.telefone && <p className="text-blue-600 mt-1">{botao.telefone}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="json">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(template.components, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Enviar Mensagem de Teste</CardTitle>
              <CardDescription>
                Envie uma mensagem de teste para verificar como o template será exibido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone-number">Número de telefone (com DDD)</Label>
                  <Input 
                    id="phone-number" 
                    type="tel" 
                    placeholder="Ex: 11999999999"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O código do país (55) será adicionado automaticamente se necessário
                  </p>
                </div>
                
                {template.components.find(c => c.variaveis && c.variaveis.length > 0) && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Variáveis do template</h3>
                    <div className="space-y-2">
                      {template.components.map((component) => 
                        component.variaveis && component.variaveis.length > 0 ? (
                          component.variaveis.map((variavel, idx) => (
                            <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                              <Label className="col-span-1" htmlFor={`var-${idx}`}>
                                {`{{${variavel.nome}}}`}
                              </Label>
                              <Input
                                id={`var-${idx}`}
                                className="col-span-3"
                                placeholder={variavel.exemplo}
                                value={testVariables[idx] || ""}
                                onChange={(e) => {
                                  const newVars = [...testVariables];
                                  newVars[idx] = e.target.value;
                                  setTestVariables(newVars);
                                }}
                              />
                            </div>
                          ))
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleTestSend} 
                disabled={!testPhoneNumber || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar mensagem de teste
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Template</CardTitle>
              <CardDescription>
                Detalhes e propriedades do template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Nome</div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {template.name}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => {
                      navigator.clipboard.writeText(template.name);
                      toast("Nome do template copiado");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">ID</div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono truncate max-w-[200px]">
                    {template.id}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => {
                      navigator.clipboard.writeText(template.id);
                      toast("ID do template copiado");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-sm font-medium mb-1">Status</div>
                <Badge variant="outline" className={getStatusColor(template.status)}>
                  {template.status}
                </Badge>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">Categoria</div>
                <Badge variant="outline" className={getCategoryColor(template.category)}>
                  {template.category}
                </Badge>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">Idioma</div>
                <div className="text-sm">
                  {template.language}
                </div>
              </div>
              
              {template.subCategory && (
                <div>
                  <div className="text-sm font-medium mb-1">Subcategoria</div>
                  <div className="text-sm">
                    {template.subCategory}
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="text-sm font-medium">Informações Avançadas</div>
              
              {template.qualityScore && (
                <div>
                  <div className="text-sm font-medium mb-1">Qualidade</div>
                  <Badge variant="outline" className={
                    template.qualityScore.toUpperCase() === "GREEN" ? "bg-green-100 text-green-800" :
                    template.qualityScore.toUpperCase() === "YELLOW" ? "bg-yellow-100 text-yellow-800" :
                    template.qualityScore.toUpperCase() === "RED" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }>
                    {template.qualityScore}
                  </Badge>
                </div>
              )}
              
              {template.correctCategory && (
                <div>
                  <div className="text-sm font-medium mb-1">Categoria Correta</div>
                  <div className="text-sm">
                    {template.correctCategory}
                  </div>
                </div>
              )}
              
              {template.previousCategory && (
                <div>
                  <div className="text-sm font-medium mb-1">Categoria Anterior</div>
                  <div className="text-sm">
                    {template.previousCategory}
                  </div>
                </div>
              )}
              
              {template.parameterFormat && (
                <div>
                  <div className="text-sm font-medium mb-1">Formato de Parâmetros</div>
                  <div className="text-sm">
                    {template.parameterFormat}
                  </div>
                </div>
              )}
              
              {template.lastEdited && (
                <div>
                  <div className="text-sm font-medium mb-1">Última Edição</div>
                  <div className="text-sm">
                    {template.lastEdited.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
              
              <Separator />
              
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Dicas de uso</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc pl-4 space-y-1 mt-2">
                    <li>Certifique-se de que o número está correto antes de enviar a mensagem de teste.</li>
                    <li>Os valores das variáveis devem ser genéricos e não conter dados confidenciais.</li>
                    <li>Para enviar para múltiplos destinatários, use a página de "Disparo em Massa".</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              {template.status === "REJECTED" && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Template rejeitado</AlertTitle>
                  <AlertDescription className="text-xs">
                    Este template foi rejeitado pelo WhatsApp. Verifique as políticas de uso e faça as correções necessárias.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                className="w-full" 
                variant="outline" 
                onClick={() => copyToClipboard(template.id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar código da oferta
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                Use este código para referenciar o template em integrações
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 