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
  name?: string;
  nomeReal?: string;
  phoneNumber?: string;
  email?: string;
  thumbnail?: string;
  concluido: boolean;
  anotacoes?: string;
  pdfUnificado?: string;
  imagensConvertidas?: string;
  leadUrl?: string;
  fezRecurso: boolean;
  datasRecurso?: string;
  provaManuscrita?: any;
  manuscritoProcessado: boolean;
  aguardandoManuscrito: boolean;
  espelhoCorrecao?: string;
  textoDOEspelho?: any;
  createdAt?: string;
  updatedAt?: string;
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
  arquivos: any[];
  _internal?: boolean;
  _skipDialog?: boolean;
  _forceUpdate?: boolean;
  _refresh?: boolean;
} 