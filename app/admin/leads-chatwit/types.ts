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
  concluido?: boolean;
  anotacoes?: string;
  pdfUnificado?: string;
  imagensConvertidas?: string;
  leadUrl?: string;
  fezRecurso?: boolean;
  datasRecurso?: string;
  provaManuscrita?: any;
  manuscritoProcessado?: boolean;
  aguardandoManuscrito?: boolean;
  espelhoCorrecao?: string;
  textoDOEspelho?: any;
  analiseUrl?: string;
  analiseProcessada?: boolean;
  aguardandoAnalise?: boolean;
  analisePreliminar?: any;
  analiseValidada?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  usuario: {
    id: string;
    name: string;
    email: string;
    channel: string;
  };
  arquivos: Array<{
    id: string;
    dataUrl: string;
    fileType: string;
    pdfConvertido?: string | null;
    createdAt: string;
  }>;
  [key: string]: any;
} 