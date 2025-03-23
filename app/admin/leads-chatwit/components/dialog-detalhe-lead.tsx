"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit, MessageSquare, RefreshCw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface ArquivoLeadChatwit {
  id: string;
  fileType: string;
  dataUrl: string;
  pdfConvertido?: string | null;
  createdAt: string;
}

interface LeadChatwit {
  id: string;
  name?: string | null;
  nomeReal?: string | null;
  phoneNumber?: string | null;
  thumbnail?: string | null;
  sourceId: string;
  email?: string | null;
  anotacoes?: string | null;
  leadUrl?: string | null;
  usuario: {
    id: string;
    name: string;
    channel: string;
  };
  arquivos: ArquivoLeadChatwit[];
  pdfUnificado?: string | null;
  concluido: boolean;
  fezRecurso: boolean;
  createdAt: string;
  datasRecurso?: string | null;
}

interface DialogDetalheLeadProps {
  lead: LeadChatwit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: any) => Promise<void>;
  isSaving?: boolean;
}

export function DialogDetalheLead({
  lead,
  open,
  onOpenChange,
  onEdit,
  isSaving = false
}: DialogDetalheLeadProps) {
  const [editMode, setEditMode] = useState<Record<string, boolean>>({
    nomeReal: false,
    email: false,
    datasRecurso: false,
  });
  
  const [formData, setFormData] = useState({
    nomeReal: lead?.nomeReal || "",
    email: lead?.email || "",
    anotacoes: lead?.anotacoes || "",
    concluido: lead?.concluido || false,
    fezRecurso: lead?.fezRecurso || false
  });

  const [datasRecurso, setDatasRecurso] = useState<Date[]>(() => {
    try {
      return lead?.datasRecurso
        ? JSON.parse(lead.datasRecurso).map((dateStr: string) => new Date(dateStr))
        : [];
    } catch (error) {
      return [];
    }
  });
  
  const [showFullImage, setShowFullImage] = useState(false);
  const [editingAnotacoes, setEditingAnotacoes] = useState(false);
  const [showDatasRecurso, setShowDatasRecurso] = useState(false);
  
  const displayName = lead?.name || "Lead sem nome";
  
  function formatCreatedDate() {
    if (!lead?.createdAt) return "Data não disponível";

    if (typeof lead.createdAt !== "string" || lead.createdAt.trim() === "") {
      return "Data não disponível";
    }

    const date = new Date(lead.createdAt);
    if (isNaN(date.getTime())) {
      return "Data inválida";
    }

    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  }

  const formattedDate = formatCreatedDate();

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleStatusChange(name: string, checked: boolean) {
    setFormData((prev) => ({ ...prev, [name]: checked }));
    await onEdit({ id: lead.id, [name]: checked });
  }

  function toggleEditMode(field: string) {
    setEditMode((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  async function saveField(field: string) {
    if (field === "nomeReal" || field === "email") {
      await onEdit({ id: lead.id, [field]: formData[field as keyof typeof formData] });
    }
    setEditMode((prev) => ({ ...prev, [field]: false }));
  }

  // Adiciona uma data de recurso ao array, caso ainda não exista
  async function handleAddRecursoDate(date: Date | undefined) {
    if (!date) return;

    const exists = datasRecurso.some(
      (d) =>
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
    );

    if (!exists) {
      const newDates = [...datasRecurso, date];
      setDatasRecurso(newDates);

      const datesAsString = JSON.stringify(newDates.map((d) => d.toISOString()));
      await onEdit({
        id: lead.id,
        datasRecurso: datesAsString,
        fezRecurso: true,
      });
    }
  }

  // Remove uma data de recurso do array
  async function handleRemoveRecursoDate(index: number) {
    const newDates = datasRecurso.filter((_, i) => i !== index);
    setDatasRecurso(newDates);

    const datesAsString = JSON.stringify(newDates.map((d) => d.toISOString()));
    await onEdit({
      id: lead.id,
      datasRecurso: datesAsString,
      fezRecurso: newDates.length > 0,
    });
  }

  function openChatwitChat() {
    if (lead?.leadUrl) {
      window.open(lead.leadUrl, "_blank");
    }
  }

  function openWhatsApp() {
    if (lead?.phoneNumber) {
      const phoneNumber = lead.phoneNumber.replace(/\D/g, "");
      window.open(`https://wa.me/${phoneNumber}`, "_blank");
    }
  }

  async function handleSaveAnotacoes() {
    await onEdit({ id: lead.id, anotacoes: formData.anotacoes });
    setEditingAnotacoes(false);
  }

  // Atualiza state se o lead mudar
  useEffect(() => {
    if (lead) {
      setFormData({
        nomeReal: lead.nomeReal || "",
        email: lead.email || "",
        anotacoes: lead.anotacoes || "",
        concluido: lead.concluido || false,
        fezRecurso: lead.fezRecurso || false,
      });

      try {
        const dates = lead.datasRecurso
          ? JSON.parse(lead.datasRecurso).map((dateStr: string) => new Date(dateStr))
          : [];
        setDatasRecurso(dates);
      } catch (error) {
        setDatasRecurso([]);
      }
    }
  }, [lead]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {lead?.thumbnail && (
                <div className="flex-shrink-0">
                  <div
                    className="h-10 w-10 rounded-full overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullImage(true);
                    }}
                  >
                    <img
                      src={lead.thumbnail}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
              Detalhes do Lead
            </DialogTitle>
            <DialogDescription>Informações detalhadas do lead</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* Coluna da esquerda */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  Nome Chatwit
                  <span className="text-muted-foreground ml-1" title="Campo bloqueado">
                    🔒
                  </span>
                </div>
                <div className="font-medium bg-muted py-1 px-2 rounded cursor-not-allowed opacity-70 hover:opacity-100 transition-opacity flex items-center">
                  {displayName}
                  <span className="ml-auto text-xs text-muted-foreground">Bloqueado</span>
                </div>
              </div>

              {/* Nome real - edição */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground mb-1">Nome Real</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEditMode("nomeReal");
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
              {editMode.nomeReal ? (
                <div className="flex gap-2">
                  <Input
                    name="nomeReal"
                    value={formData.nomeReal}
                    onChange={handleInputChange}
                    className="h-8"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveField("nomeReal");
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <div>{lead?.nomeReal || "Não informado"}</div>
              )}

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Telefone</div>
                <div>{lead?.phoneNumber || "Não informado"}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">WhatsApp</div>
                {lead?.phoneNumber && (
                  <Button variant="link" className="p-0 h-auto text-primary" onClick={openWhatsApp}>
                    Abrir no WhatsApp
                  </Button>
                )}
              </div>

              {/* Email - edição */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground mb-1">Email</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEditMode("email");
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
              {editMode.email ? (
                <div className="flex gap-2">
                  <Input
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-8"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveField("email");
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <div>{formData.email || "Não informado"}</div>
              )}

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Data de Criação
                </div>
                <div>{formattedDate}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">ID do Lead</div>
                <div className="bg-muted px-2 py-1 rounded text-sm font-mono">{lead?.id}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Link para o Chat
                </div>
                {lead?.leadUrl && (
                  <Button variant="outline" size="sm" onClick={openChatwitChat} className="mt-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Abrir Chat no Chatwit
                  </Button>
                )}
              </div>

              {/* Status Switches */}
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Switch
                    id="concluido"
                    checked={formData.concluido}
                    onCheckedChange={(checked) => handleStatusChange("concluido", checked)}
                  />
                  <Label htmlFor="concluido">
                    Concluído {formData.concluido ? "Sim" : "Não"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="fezRecurso"
                    checked={formData.fezRecurso}
                    onCheckedChange={(checked) => handleStatusChange("fezRecurso", checked)}
                  />
                  <Label htmlFor="fezRecurso">
                    Fez Recurso {formData.fezRecurso ? "Sim" : "Não"}
                  </Label>
                </div>

                {formData.fezRecurso && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowDatasRecurso(true)}
                    >
                      Definir datas de recurso
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna da direita */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Imagem do Perfil
                </div>
                {lead?.thumbnail ? (
                  <div className="relative">
                    <img
                      src={lead.thumbnail}
                      alt={displayName}
                      className="w-full max-h-[300px] object-contain rounded-md border"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullImage(true);
                      }}
                    >
                      Ampliar
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-md p-4 text-center text-muted-foreground">
                    Sem imagem de perfil
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                <div className="flex gap-2">
                  <Badge variant={formData.concluido ? "default" : "secondary"}>
                    {formData.concluido ? "Concluído" : "Pendente"}
                  </Badge>
                  <Badge variant={formData.fezRecurso ? "default" : "secondary"}>
                    {formData.fezRecurso ? "Fez Recurso" : "Sem Recurso"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">Datas dos Recursos</div>
                {datasRecurso.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setShowDatasRecurso(true)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div>
                {datasRecurso.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {datasRecurso.map((data, index) => (
                      <Badge key={index} variant="secondary">
                        {format(data, "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {formData.fezRecurso
                      ? "Clique em 'Definir datas de recurso' para adicionar"
                      : "Nenhuma data de recurso registrada"}
                  </div>
                )}
              </div>

              {/* Campo de anotações */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Anotações</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setEditingAnotacoes(!editingAnotacoes)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {editingAnotacoes ? (
                  <>
                    <Textarea
                      name="anotacoes"
                      value={formData.anotacoes}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Adicione anotações sobre este lead"
                      className="mt-1"
                    />
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleSaveAnotacoes} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="bg-muted/30 p-2 rounded-md text-sm whitespace-pre-wrap min-h-[100px] max-h-[200px] overflow-y-auto">
                    {formData.anotacoes || "Nenhuma anotação registrada."}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChange(false);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para imagem em tela cheia */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Imagem do Perfil</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2">
            {lead?.thumbnail && (
              <img
                src={lead.thumbnail}
                alt={displayName}
                className="max-w-full max-h-[70vh] object-contain rounded-md"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFullImage(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para definir datas de recurso */}
      <Dialog open={showDatasRecurso} onOpenChange={setShowDatasRecurso}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Datas de Recurso</DialogTitle>
            <DialogDescription>
              Defina as datas em que o lead fez recurso. Um lead pode ter múltiplas datas de recurso.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center">
            <div className="mb-4 w-full flex justify-center">
              <div className="calendar-container min-h-[350px] flex items-center justify-center">
                <Calendar
                  mode="single"
                  locale={ptBR}
                  onSelect={handleAddRecursoDate}
                  showOutsideDays  // <--- adicionados
                  fixedWeeks       // <--- adicionados
                  className="rounded-md border"
                />
              </div>
            </div>

            <div className="mt-4 w-full">
              <div className="text-sm font-medium mb-2">Datas selecionadas:</div>
              {datasRecurso.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {datasRecurso.map((data, index) => (
                    <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                      {format(data, "dd/MM/yyyy", { locale: ptBR })}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveRecursoDate(index);
                        }}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Clique em uma data no calendário para adicioná-la
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDatasRecurso(false)}>
              Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estilos globais para o calendário (você pode manter ou remover o min-height se desejar) */}
      <style jsx global>{`
        .calendar-container .rdp-months {
          justify-content: center;
        }
        .calendar-container .rdp-caption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 40px;
          min-height: 40px;
          max-height: 40px;
          margin-bottom: 8px;
          padding: 0 8px;
        }
        .calendar-container .rdp-nav {
          white-space: nowrap;
        }
        /* Se quiser ainda garantir um mínimo de altura, pode manter, mas agora nem deve ser necessário */
        /* .calendar-container .rdp-table {
          min-height: 220px;
        } */
      `}</style>
    </>
  );
}
