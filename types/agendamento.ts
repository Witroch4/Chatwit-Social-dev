// types/agendamento.ts
export interface Agendamento {
    id: string;
    Data: string;
    Descrição: string;
    Facebook: boolean;
    midia: Array<{
      name: string;
      size: number;
      mime_type: string;
      is_image: boolean;
      image_width: number;
      image_height: number;
      uploaded_at: string;
      url: string;
      thumbnails: {
        tiny: { url: string; width: number | null; height: number };
        small: { url: string; width: number; height: number };
        card_cover?: { url: string; width: number; height: number };
      };
      visible_name: string;
    }>;
    X: boolean;
    Linkedin: boolean;
    Instagram: boolean;
    Concluido_FB: boolean;
    Concluido_IG: boolean;
    Concluido_LK: boolean;
    Concluido_X: boolean;
    Stories: boolean;
    Reels: boolean;
    PostNormal: boolean;
    Diario: boolean;
    contador: number | null;
    Randomizar: boolean;
    MidiaID: number | null;
    igUserId: number | null;
    igContainerId: string;
    ReelsID: number | null;
    StoriesID: number | null;
    CarrosselID: string;
    MultStoriesID: string;
    userID: string;
    IGtoken: string;
  }
