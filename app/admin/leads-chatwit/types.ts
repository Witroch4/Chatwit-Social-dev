export interface ArquivoLeadChatwit {
  id: string;
  fileType: string;
  dataUrl: string;
  pdfConvertido?: string | null;
  createdAt: string;
}

export interface LeadChatwit {
  id: string;
  sourceId: string;
  name?: string | null;
  nomeReal?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  thumbnail?: string | null;
  concluido: boolean;
  anotacoes?: string | null;
  pdfUnificado?: string | null;
  imagensConvertidas?: string | null;
  leadUrl?: string | null;
  fezRecurso: boolean;
  datasRecurso?: string | null;
  provaManuscrita?: string | null;
  manuscritoProcessado: boolean;
  aguardandoManuscrito: boolean;
  createdAt: string;
  updatedAt: string;
  usuarioId: string;
  usuario: {
    id: string;
    name: string;
    channel: string;
    userId: number;
    accountId: number;
    accountName: string;
    availableName?: string | null;
    inboxId?: number | null;
    inboxName?: string | null;
  };
  arquivos: ArquivoLeadChatwit[];
  _internal?: boolean;
  _skipDialog?: boolean;
  _forceUpdate?: boolean;
  _refresh?: boolean;
} 