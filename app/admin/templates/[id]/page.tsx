// app/admin/templates/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Send,
  Trash2,
  Edit,
  CheckCircle,
  Copy,
  Clipboard,
  Phone,
  ExternalLink,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SendProgressDialog } from "../components/send-progress-dialog";

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
  lastEdited?: string | null;
  publicMediaUrl?: string | null;
  componentes: Array<{
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
      example?: string[];
    }>;
    example?: any;
  }>;
}

export default function TemplateDetailsPage() {
  const params = useParams();
  const templateId = params?.id as string;
  const router = useRouter();

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testVariables, setTestVariables] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [headerMedia, setHeaderMedia] = useState("");
  const [hasHeaderMedia, setHasHeaderMedia] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMassUploading, setIsMassUploading] = useState(false);
  const [isMassSending, setIsMassSending] = useState(false);
  const [contactList, setContactList] = useState<{ nome: string; numero: string }[]>([]);
  const [showSendProgress, setShowSendProgress] = useState(false);
  const [sendProgressComplete, setSendProgressComplete] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await axios.get(
          `/api/admin/atendimento/template-info?template=${templateId}`
        ).catch(error => {
          console.error("Erro na requisição:", error);
          throw new Error(
            error.response?.data?.error || 
            error.response?.data?.details || 
            error.message || 
            "Falha na comunicação com o servidor"
          );
        });
        
        if (!res.data.success) {
          setError(res.data.details || "Erro ao carregar template");
          return;
        }

        const t = res.data.template;
        setTemplate({
          id: templateId!,
          name: t.nome,
          category: t.categoria,
          subCategory: t.subCategoria,
          status: t.status,
          language: t.idioma,
          qualityScore: t.qualidadeScore,
          correctCategory: t.categoriaCorreta,
          ctaUrlLinkTrackingOptedOut: t.ctaUrlLinkTrackingOptedOut,
          libraryTemplateName: t.nomeTemplateBiblioteca,
          messageSendTtlSeconds: t.mensagemSendTtlSegundos,
          parameterFormat: t.formatoParametro,
          previousCategory: t.categoriaAnterior,
          lastEdited: t.ultimaEdicao,
          publicMediaUrl: t.publicMediaUrl,
          componentes: t.componentes,
        });

        // variáveis do BODY
        const bodyComp = t.componentes.find((c: any) => c.tipo === "BODY");
        if (bodyComp && Array.isArray(bodyComp.variaveis)) {
          setTestVariables(
            bodyComp.variaveis.map((v: any) => v.exemplo || "")
          );
        }

        // HEADER media
        const hdr = t.componentes.find(
          (c: any) =>
            c.tipo === "HEADER" &&
            ["VIDEO", "IMAGE", "DOCUMENT", "LOCATION"].includes(c.formato)
        );
        if (hdr) {
          setHasHeaderMedia(true);
          // Usar a URL pública do MinIO se disponível, caso contrário usar a URL da Meta
          let mediaUrl = t.publicMediaUrl;
          
          if (!mediaUrl) {
            mediaUrl = hdr.example?.header_handle?.[0] ||
              hdr.example?.header_url ||
              (typeof hdr.example?.header_location === "object"
                ? JSON.stringify(hdr.example.header_location)
                : "");
          }
          
          setHeaderMedia(mediaUrl);
        }

        // pré‑preenche cupom do COPY_CODE
        const btnComp = t.componentes.find((c: any) => c.tipo === "BUTTONS");
        if (btnComp?.botoes) {
          const copyBtn = btnComp.botoes.find(
            (b: any) => b.tipo === "COPY_CODE"
          );
          if (copyBtn?.example?.length) {
            setCouponCode(copyBtn.example[0]);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar informações do template");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplate();
  }, [templateId]);

  function getCategoryColor(c: string) {
    switch (c.toUpperCase()) {
      case "UTILITY":
        return "bg-blue-100 text-blue-800";
      case "MARKETING":
        return "bg-amber-100 text-amber-800";
      case "AUTHENTICATION":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getStatusColor(s: string) {
    switch (s.toUpperCase()) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PAUSED":
        return "bg-orange-100 text-orange-800";
      case "DISABLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    // Basic formatting for Brazil numbers
    if (phone.startsWith("+55") || phone.startsWith("55")) {
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length === 12 || cleaned.length === 13) { // With or without country code
        return phone.startsWith("+") 
          ? phone 
          : `+${phone}`;
      }
    }
    return phone;
  };

  const handleTestSend = async () => {
    if (!template) return;
    setIsSending(true);
    try {
      let phone = testPhoneNumber.replace(/\D/g, "");
      if (!phone.startsWith("55")) phone = "55" + phone;

      let api = "/api/admin/atendimento/disparo";
      let payload: any = {
        templateName: template.name,
        contatos: [{ nome: "Teste", numero: phone }],
        configuracoes: { variaveis: testVariables, headerMedia },
        couponCode: couponCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 32),
      };

      if (template.category === "AUTHENTICATION") {
        api = "/api/admin/atendimento/test-template";
        payload = {
          to: phone,
          templateName: template.name,
          parameters: [testVariables[0] || couponCode],
          couponCode,
          headerMedia,
        };
      }

      const res = await axios.post(api, payload);
      if (res.data.success) toast.success("Enviado!");
      else toast.error(res.data.error || "Falha no envio");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    setIsDeleting(true);
    setShowDeleteDialog(false); // Fechar o diálogo
    
    try {
      const res = await axios.delete("/api/admin/atendimento/templates", {
        data: { name: template.name },
      });
      if (res.data.success) {
        toast.success("Template excluído");
        router.push("/admin/templates");
      } else {
        toast.error(res.data.error);
      }
    } catch {
      toast.error("Erro ao excluir template");
    } finally {
      setIsDeleting(false);
    }
  };

  // Dentro do componente da página, adicione esta função para exibir a origem da mídia
  function getMediaSourceLabel(url: string, publicMediaUrl: string | null | undefined) {
    if (!url) return "";
    if (publicMediaUrl && url === publicMediaUrl) {
      return "Armazenada no MinIO";
    }
    if (url.includes('whatsapp.net') || url.includes('fbcdn.net')) {
      return "Hospedada nos servidores da Meta";
    }
    return "";
  }

  const handleMassSend = async () => {
    if (!template || contactList.length === 0) return;
    
    // Mostrar o diálogo de progresso
    setShowSendProgress(true);
    setSendProgressComplete(false);
    setIsMassSending(true);
    
    try {
      // Preparar os contatos no formato adequado
      const contatos = contactList.map(contact => ({
        nome: contact.nome,
        numero: contact.numero.replace(/\D/g, "").startsWith("55") 
          ? contact.numero.replace(/\D/g, "")
          : "55" + contact.numero.replace(/\D/g, "")
      }));
      
      // Payload para API
      const payload = {
        templateName: template.name,
        contatos,
        configuracoes: { 
          variaveis: testVariables, 
          headerMedia 
        },
        couponCode: couponCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 32),
      };
      
      console.log(`Enviando mensagem para ${contatos.length} contatos:`, payload);
      
      // Fazer requisição para API
      const response = await axios.post("/api/admin/atendimento/disparo", payload);
      
      if (response.data.success) {
        // Marcar envio como concluído para atualizar o diálogo de progresso
        setSendProgressComplete(true);
        toast.success(`Mensagens enviadas com sucesso para ${contatos.length} contatos!`);
      } else {
        // Fechar o diálogo de progresso em caso de erro
        setShowSendProgress(false);
        toast.error(response.data.error || "Falha ao enviar mensagens em massa");
      }
    } catch (error: any) {
      console.error("Erro ao enviar mensagens em massa:", error);
      // Fechar o diálogo de progresso em caso de erro
      setShowSendProgress(false);
      toast.error(error.response?.data?.error || error.message || "Erro ao enviar mensagens");
    } finally {
      // O diálogo será fechado pelo componente após a animação final
      setIsMassSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh]">
        <DotLottieReact
          src="/animations/loading.lottie"
          autoplay
          loop
          style={{ width: 150, height: 150 }}
          aria-label="Carregando informações do template"
        />
        <p className="mt-4 text-muted-foreground">Carregando informações do template...</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          {error || "Template não encontrado"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <Link href="/admin/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold truncate">{template.name}</h1>
        <div className="space-x-2">
          <Link href={`/admin/templates/${templateId}/editar`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-1 h-4 w-4" />
              Editar
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="animate-spin h-4 w-4 mr-1" />
            ) : (
              <Trash2 className="mr-1 h-4 w-4" />
            )}
            Excluir
          </Button>
        </div>
      </div>

      {/* Conteúdo e envio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Visão do template */}
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Template</CardTitle>
              <CardDescription>Visualização</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="visual">
                <TabsList>
                  <TabsTrigger value="visual">Visual</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="visual">
                  <div className="border rounded-lg overflow-hidden">
                    {/* Fundo de chat do WhatsApp */}
                    <div 
                      className="relative p-3 min-h-[400px]" 
                      style={{
                        backgroundImage: "url('/fundo_whatsapp.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                      }}
                    >
                      {/* Mensagem de template */}
                      <div className="max-w-[85%] bg-white rounded-lg shadow-sm p-3 ml-auto mr-3 mb-3">
                        {/* Header */}
                        {template.componentes.map((c, i) => (
                          c.tipo === "HEADER" && (
                            <div key={i}>
                              {c.formato === "TEXT" && c.texto && (
                                <div className="font-bold text-center mb-2">{c.texto}</div>
                              )}
                              {c.formato === "IMAGE" && (
                                <div className="mb-2 overflow-hidden rounded-md" style={{ maxHeight: "180px" }}>
                                  {headerMedia ? (
                                    <img 
                                      src={headerMedia} 
                                      alt="Header" 
                                      className="w-full object-contain rounded-md max-h-[160px]" 
                                    />
                                  ) : (
                                    <div className="w-full bg-gray-200 flex items-center justify-center" style={{ height: "140px" }}>
                                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              )}
                              {c.formato === "DOCUMENT" && (
                                <div className="w-full bg-gray-100 rounded-md mb-2 p-3 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                  </svg>
                                  <span className="text-sm font-medium">Documento</span>
                                </div>
                              )}
                              {c.formato === "VIDEO" && (
                                <div className="w-full bg-gray-100 rounded-md mb-2 flex items-center justify-center" style={{ maxHeight: "180px" }}>
                                  {headerMedia ? (
                                    <div className="flex flex-col items-center justify-center w-full h-full">
                                      {headerMedia.includes("http") ? (
                                        <video 
                                          src={headerMedia} 
                                          controls
                                          className="w-full rounded-md max-h-[160px] object-contain" 
                                        />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                          <p className="text-sm font-medium text-green-600">Vídeo processado</p>
                                          <p className="text-xs text-gray-500 mt-1">Media Handle: {headerMedia.substring(0, 10)}...</p>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        ))}
                        
                        {/* Body */}
                        {template.componentes.map((c, i) => (
                          c.tipo === "BODY" && c.texto && (
                            <div key={i} className="text-sm whitespace-pre-line mb-2">
                              {c.texto}
                            </div>
                          )
                        ))}
                        
                        {/* Footer */}
                        {template.componentes.map((c, i) => (
                          c.tipo === "FOOTER" && c.texto && (
                            <div key={i} className="text-xs text-gray-500 mb-2">
                              {c.texto}
                            </div>
                          )
                        ))}
                        
                        <div className="text-right text-xs text-gray-500 flex justify-end items-center">
                          <span>17:12</span>
                        </div>
                      </div>
                      
                      {/* Botões abaixo da mensagem */}
                      {template.componentes.map((c, i) => (
                        c.tipo === "BUTTONS" && c.botoes && c.botoes.length > 0 && (
                          <div key={i} className="bg-white rounded-lg shadow-sm max-w-[85%] ml-auto mr-3 mt-1 overflow-hidden">
                            <div className="divide-y divide-gray-100">
                              {c.botoes.map((button, index) => (
                                <button 
                                  key={index} 
                                  className="w-full py-3 px-4 text-sm text-cyan-500 font-medium text-center flex justify-center items-center"
                                >
                                  {button.tipo === "URL" && <ExternalLink className="h-4 w-4 mr-2" />}
                                  {button.tipo === "COPY_CODE" && <Copy className="h-4 w-4 mr-2" />}
                                  {button.tipo === "PHONE_NUMBER" && <Phone className="h-4 w-4 mr-2" />}
                                  {button.texto}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="json">
                  <pre className="bg-muted p-4 rounded overflow-auto text-xs max-h-[400px]">
                    {JSON.stringify(template.componentes, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Enviar teste */}
          <Card>
            <CardHeader>
              <CardTitle>Enviar Mensagem</CardTitle>
              <CardDescription>Testes e envios</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="individual">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="individual">Mensagem de Teste</TabsTrigger>
                  <TabsTrigger value="massa">Envio em Massa</TabsTrigger>
                </TabsList>
                
                <TabsContent value="individual" className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Número (com DDD)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="11999999999"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                    />
                  </div>

                  {template.componentes.some((c) => Array.isArray(c.variaveis)) && (
                    <div>
                      <p className="font-medium mb-2">Variáveis</p>
                      <div className="space-y-2">
                        {testVariables.map((val, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                          >
                            <Label className="text-xs sm:text-sm truncate">
                              {"{{" + template.componentes
                                .flatMap((c) =>
                                  Array.isArray(c.variaveis) ? c.variaveis : []
                                )
                                [idx]?.nome + "}}"}
                            </Label>
                            <div className="sm:col-span-3">
                              <Input
                                placeholder={template.componentes
                                  .flatMap((c) =>
                                    Array.isArray(c.variaveis) ? c.variaveis : []
                                  )
                                  [idx]?.exemplo}
                                value={testVariables[idx]}
                                onChange={(e) => {
                                  const arr = [...testVariables];
                                  arr[idx] = e.target.value;
                                  setTestVariables(arr);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasHeaderMedia && (
                    <div>
                      <Label>Mídia do cabeçalho</Label>
                      <Input
                        placeholder="https://... ou ID"
                        value={headerMedia}
                        onChange={(e) => setHeaderMedia(e.target.value)}
                      />
                      {headerMedia && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getMediaSourceLabel(headerMedia, template?.publicMediaUrl)}
                          {template?.publicMediaUrl && headerMedia !== template.publicMediaUrl && (
                            <Button
                              variant="link"
                              className="p-0 h-auto text-xs"
                              onClick={() => setHeaderMedia(template.publicMediaUrl || "")}
                            >
                              Usar cópia local
                            </Button>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {template.componentes.some(c => 
                    c.tipo === "BUTTONS" && 
                    c.botoes?.some(b => b.tipo === "COPY_CODE")
                  ) && (
                    <div>
                      <Label>Cupom (copy_code)</Label>
                      <Input
                        placeholder="CODE123"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                    </div>
                  )}

                  <Button onClick={handleTestSend} disabled={isSending} className="mt-4">
                    {isSending ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar teste
                  </Button>
                </TabsContent>
                
                <TabsContent value="massa" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upload de Lista de Contatos</Label>
                    <div className="border-2 border-dashed rounded-md p-6 text-center">
                      <Input 
                        type="file" 
                        accept=".csv" 
                        disabled={isMassUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const csvData = event.target?.result as string;
                              try {
                                const lines = csvData.split(/\r?\n/).filter(line => line.trim());
                                const dataLines = lines[0].toLowerCase().includes('nome') && 
                                  lines[0].toLowerCase().includes('numero') 
                                    ? lines.slice(1) 
                                    : lines;
                                
                                const contacts = dataLines.map(line => {
                                  const [nome, numero] = line.split(',').map(item => item.trim());
                                  return { nome, numero };
                                }).filter(contact => contact.nome && contact.numero);

                                setContactList(contacts);
                                toast.success(`${contacts.length} contatos carregados com sucesso`);
                              } catch (error) {
                                console.error("Erro ao processar o arquivo CSV:", error);
                                toast.error("Erro ao processar o arquivo. Verifique o formato.");
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Formato: "Nome,Numero" (uma entrada por linha)
                      </p>
                    </div>
                  </div>

                  {contactList.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Contatos carregados: {contactList.length}</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setContactList([])}
                        >
                          Limpar
                        </Button>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <div className="max-h-40 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {contactList.slice(0, 5).map((contact, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm">{contact.nome}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm">{contact.numero}</td>
                                </tr>
                              ))}
                              {contactList.length > 5 && (
                                <tr>
                                  <td colSpan={2} className="px-3 py-2 text-center text-sm text-gray-500">
                                    ...e mais {contactList.length - 5} contatos
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {template.componentes.some((c) => Array.isArray(c.variaveis)) && (
                    <div>
                      <p className="font-medium mb-2">Variáveis (aplicadas a todos os contatos)</p>
                      <div className="space-y-2">
                        {testVariables.map((val, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                          >
                            <Label className="text-xs sm:text-sm truncate">
                              {"{{" + template.componentes
                                .flatMap((c) =>
                                  Array.isArray(c.variaveis) ? c.variaveis : []
                                )
                                [idx]?.nome + "}}"}
                            </Label>
                            <div className="sm:col-span-3">
                              <Input
                                placeholder={template.componentes
                                  .flatMap((c) =>
                                    Array.isArray(c.variaveis) ? c.variaveis : []
                                  )
                                  [idx]?.exemplo}
                                value={testVariables[idx]}
                                onChange={(e) => {
                                  const arr = [...testVariables];
                                  arr[idx] = e.target.value;
                                  setTestVariables(arr);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasHeaderMedia && (
                    <div>
                      <Label>Mídia do cabeçalho</Label>
                      <Input
                        placeholder="https://... ou ID"
                        value={headerMedia}
                        onChange={(e) => setHeaderMedia(e.target.value)}
                      />
                      {headerMedia && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getMediaSourceLabel(headerMedia, template?.publicMediaUrl)}
                          {template?.publicMediaUrl && headerMedia !== template.publicMediaUrl && (
                            <Button
                              variant="link"
                              className="p-0 h-auto text-xs"
                              onClick={() => setHeaderMedia(template.publicMediaUrl || "")}
                            >
                              Usar cópia local
                            </Button>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {template.componentes.some(c => 
                    c.tipo === "BUTTONS" && 
                    c.botoes?.some(b => b.tipo === "COPY_CODE")
                  ) && (
                    <div>
                      <Label>Cupom (copy_code)</Label>
                      <Input
                        placeholder="CODE123"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                    </div>
                  )}

                  <Button 
                    onClick={handleMassSend} 
                    disabled={isMassUploading || isMassSending || contactList.length === 0} 
                    className="mt-4"
                  >
                    {isMassSending ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar para {contactList.length} contatos
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Informações do template */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
              <CardDescription>Propriedades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="font-mono bg-muted px-2 py-1">
                  {template.name}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(template.name);
                    toast("Nome copiado");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <code className="font-mono bg-muted px-2 py-1">
                  {template.id}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(template.id);
                    toast("ID copiado");
                  }}
                >
                  <Clipboard className="h-3 w-3" />
                </Button>
              </div>

              <Separator />

              <div>
                <p className="font-medium">Status</p>
                <Badge className={getStatusColor(template.status)}>
                  {template.status}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Categoria</p>
                <Badge className={getCategoryColor(template.category)}>
                  {template.category}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Idioma</p>
                <p>{template.language}</p>
              </div>
              {template.subCategory && (
                <div>
                  <p className="font-medium">Subcategoria</p>
                  <p>{template.subCategory}</p>
                </div>
              )}

              <Separator />

              {template.qualityScore && (
                <div>
                  <p className="font-medium">Qualidade</p>
                  <Badge
                    className={
                      template.qualityScore === "GREEN"
                        ? "bg-green-100 text-green-800"
                        : template.qualityScore === "YELLOW"
                        ? "bg-yellow-100 text-yellow-800"
                        : template.qualityScore === "RED"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {template.qualityScore}
                  </Badge>
                </div>
              )}
              {template.previousCategory && (
                <div>
                  <p className="font-medium">Categoria Anterior</p>
                  <p>{template.previousCategory}</p>
                </div>
              )}
              {template.parameterFormat && (
                <div>
                  <p className="font-medium">Formato Parâmetros</p>
                  <p>{template.parameterFormat}</p>
                </div>
              )}
              {template.lastEdited && (
                <div>
                  <p className="font-medium">Última Edição</p>
                  <p>
                    {new Date(template.lastEdited).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              <Separator />

              <Alert>
                <CheckCircle />
                <AlertTitle>Dicas</AlertTitle>
                <AlertDescription className="text-xs">
                  • Verifique sempre o número.
                  <br />
                  • Não envie dados sensíveis nas variáveis.
                  <br />• Use "Disparo em Massa" para vários contatos.
                </AlertDescription>
              </Alert>

              {template.status === "REJECTED" && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Rejeitado</AlertTitle>
                  <AlertDescription className="text-xs">
                    Revise as políticas do WhatsApp e corrija.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(template.id);
                  toast("ID copiado");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar código
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Diálogo de progresso de envio */}
      <SendProgressDialog
        isOpen={showSendProgress}
        onClose={() => setShowSendProgress(false)}
        numContacts={contactList.length}
        templateName={template?.name || ""}
        isComplete={sendProgressComplete}
        onComplete={() => {
          setSendProgressComplete(false);
          setShowSendProgress(false);
        }}
      />

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Excluir Template
            </DialogTitle>
            <DialogDescription className="text-base">
              Tem certeza de que deseja excluir o template <span className="font-medium">"{template?.name}"</span>?
            </DialogDescription>
            <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
