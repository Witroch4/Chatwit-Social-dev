"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import LoadingState from "./components/LoadingState";
import UnauthenticatedState from "./components/UnauthenticatedState";
import ErrorState from "./components/ErrorState";
import PostSelection from "./components/PostSelection";
import PalavraExpressaoSelection from "./components/PalavraExpressaoSelection";
import PreviewPhoneMockup from "./components/PreviewPhoneMockup";
import ToggleActions from "./components/ToggleActions";

import CommentsDrawer from "./components/CommentsDrawer";

interface InstagramUserData {
  id: string;
  username: string;
  media_count: number;
  profile_picture_url?: string;
}

// Dentro do page.tsx
export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_url?: string;
  media_type?: string;
  thumbnail_url?: string;
  media_product_type?: string;
  like_count?: number;
  comments_count?: number;
}

export default function UserPage() {
  const { data: session, status } = useSession();

  const [instagramUser, setInstagramUser] = useState<InstagramUserData | null>(null);
  const [instagramMedia, setInstagramMedia] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ------------------ ESTADOS DE POSTAGEM ------------------
  const [selectedOptionPostagem, setSelectedOptionPostagem] = useState("especifico");
  const [selectedPost, setSelectedPost] = useState<InstagramMediaItem | null>(null);

  // ------------------ ESTADOS DE PALAVRA/EXPRESSÃO ------------------
  const [selectedOptionPalavra, setSelectedOptionPalavra] = useState("qualquer-palavra");
  const [inputPalavra, setInputPalavra] = useState("");

  // ------------------ ESTADOS DE AÇÃO (TOGGLE) ------------------
  const [toggleValue, setToggleValue] = useState<"publicar" | "comentarios" | "dm">("publicar");
  const [commentContent, setCommentContent] = useState("");

  // ------------------ ESTADO DO MODAL DE ESCOLHA DE POST ------------------
  const [openDialog, setOpenDialog] = useState(false);

  // ------------------ ESTADOS DE DM (NOVAS ETAPAS) ------------------
  // Etapa 2
  const [dmWelcomeMessage, setDmWelcomeMessage] = useState(
    "Olá! Eu estou muito feliz que você está aqui, muito obrigado pelo seu interesse 😊\n\nClique abaixo e eu vou te mandar o link em um segundo ✨"
  );
  const [dmQuickReply, setDmQuickReply] = useState("Me envie o link");

  // Etapa 3
  const [dmSecondMessage, setDmSecondMessage] = useState(
    "Obrigado por ter respondido segue o nosso link do produto"
  );
  const [dmLink, setDmLink] = useState("https://witdev.com.br");
  const [dmButtonLabel, setDmButtonLabel] = useState("Segue Nosso Site");

  // Etapa 4 (Checkboxes)
  const [checkboxResponderComentario, setCheckboxResponderComentario] = useState(false);
  const [checkboxPedirEmail, setCheckboxPedirEmail] = useState(false);
  const [checkboxPedirParaSeguir, setCheckboxPedirParaSeguir] = useState(false);
  const [checkboxEntrarEmContato, setCheckboxEntrarEmContato] = useState(false);

  const accessToken = session?.user?.instagramAccessToken;

  useEffect(() => {
    const fetchInstagramData = async () => {
      if (status === "authenticated" && accessToken) {
        try {
          const userRes = await fetch(
            `https://graph.instagram.com/me?fields=id,username,media_count,profile_picture_url&access_token=${accessToken}`
          );

          if (!userRes.ok) {
            const errorText = await userRes.text();
            console.error("Erro ao buscar dados do Instagram (usuário):", errorText);
            setError("Não foi possível obter os dados do Instagram do usuário.");
            setLoading(false);
            return;
          }

          const userData: InstagramUserData = await userRes.json();
          setInstagramUser(userData);

          const mediaRes = await fetch(
            `https://graph.instagram.com/me/media?fields=id,caption,media_url,media_type,thumbnail_url,media_product_type,like_count,comments_count&access_token=${accessToken}`
          );

          if (!mediaRes.ok) {
            const errorText = await mediaRes.text();
            console.error("Erro ao buscar mídias do Instagram:", errorText);
            setError("Não foi possível obter as mídias do Instagram.");
            setLoading(false);
            return;
          }

          const mediaData = await mediaRes.json();
          setInstagramMedia(mediaData.data || []);

          setLoading(false);
        } catch (err) {
          console.error("Erro ao conectar-se à API do Instagram:", err);
          setError("Erro ao conectar-se à API do Instagram.");
          setLoading(false);
        }
      } else if (status === "authenticated") {
        // Usuário autenticado, mas sem accessToken
        setLoading(false);
      } else {
        // Não autenticado
        setLoading(false);
      }
    };

    fetchInstagramData();
  }, [status, accessToken]);

  // Função para lidar com a entrada no campo de palavra ou expressão
  const handlePalavraInputChange = (value: string) => {
    setInputPalavra(value);
    setCommentContent(value); // Atualiza o conteúdo do comentário
    if (value.trim() !== "") {
      setToggleValue("comentarios"); // Muda para a aba "comentarios" se houver entrada
    } else {
      setToggleValue("publicar"); // Volta para "publicar" se a entrada estiver vazia
    }
  };

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "unauthenticated") {
    return <UnauthenticatedState />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  const ultimasPostagens = instagramMedia.slice(0, 4);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center", // Centraliza as colunas no meio da página
        minHeight: "100vh",
        padding: "20px",
        gap: "20px",
      }}
    >
      {/* =============================================================================
          COLUNA ESQUERDA - FORMULÁRIO
      ============================================================================== */}
      <div
        style={{
          flex: "1", // Ocupa 50% do espaço disponível
          borderRight: "1px solid #333",
          paddingRight: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* ---------------------- SELEÇÃO DE POST E PALAVRA ---------------------- */}
        <PostSelection
          selectedOptionPostagem={selectedOptionPostagem}
          setSelectedOptionPostagem={setSelectedOptionPostagem}
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
          ultimasPostagens={ultimasPostagens}
          instagramMedia={instagramMedia}
          openDialog={openDialog}
          setOpenDialog={setOpenDialog}
        />

        <PalavraExpressaoSelection
          selectedOptionPalavra={selectedOptionPalavra}
          setSelectedOptionPalavra={setSelectedOptionPalavra}
          inputPalavra={inputPalavra}
          setInputPalavra={handlePalavraInputChange}
        />

        <Separator className="my-4 w-full" />

        {/* ========================================================================
            ETAPA 2 - DM DE BOAS-VINDAS
        ======================================================================== */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 2</h3>
          <p className="text-sm text-muted-foreground mb-2">
            (Inicialmente, eles receberão uma DM de boas-vindas)
          </p>
          <p className="text-sm">
            Primeiro, é enviada a DM de abertura, seguida pela mensagem com o link.
          </p>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmWelcomeMessage">
              Mensagem de boas-vindas
            </label>
            <Textarea
              id="dmWelcomeMessage"
              className="mt-2"
              value={dmWelcomeMessage}
              onChange={(e) => setDmWelcomeMessage(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmQuickReply">
              Quick Reply (resposta rápida)
            </label>
            <Input
              id="dmQuickReply"
              className="mt-2"
              value={dmQuickReply}
              onChange={(e) => setDmQuickReply(e.target.value)}
            />
          </div>
        </div>

        <Separator className="my-4 w-full" />

        {/* ========================================================================
            ETAPA 3 - DM COM O LINK
        ======================================================================== */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 3</h3>
          <p className="text-sm text-muted-foreground mb-2">
            (Logo depois, a DM com o link será enviada)
          </p>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmSecondMessage">
              Escreva uma mensagem
            </label>
            <Textarea
              id="dmSecondMessage"
              className="mt-2"
              value={dmSecondMessage}
              onChange={(e) => setDmSecondMessage(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmLink">
              Adicionar um link
            </label>
            <Input
              id="dmLink"
              className="mt-2"
              value={dmLink}
              onChange={(e) => setDmLink(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmButtonLabel">
              Adicione legenda ao botão (Quick Reply)
            </label>
            <Input
              id="dmButtonLabel"
              className="mt-2"
              value={dmButtonLabel}
              onChange={(e) => setDmButtonLabel(e.target.value)}
            />
          </div>
        </div>

        <Separator className="my-4 w-full" />

        {/* ========================================================================
            ETAPA 4 - OUTROS RECURSOS
        ======================================================================== */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 4</h3>
          <p className="text-sm text-muted-foreground mb-4">
            (Outros recursos para automatizar)
          </p>

          {/* 1. Responder comentário publicamente */}
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="checkboxResponderComentario"
              checked={checkboxResponderComentario}
              onCheckedChange={(checked) => {
                setCheckboxResponderComentario(Boolean(checked));
              }}
            />
            <label
              htmlFor="checkboxResponderComentario"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
            >
              Responder ao comentário de forma pública
            </label>
          </div>

          {/* 2. Pedir Email - PRO */}
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="checkboxPedirEmail"
              checked={checkboxPedirEmail}
              onCheckedChange={(checked) => {
                setCheckboxPedirEmail(Boolean(checked));
              }}
            />
            <label
              htmlFor="checkboxPedirEmail"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
            >
              Pedir email <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          {/* 3. Pedir para seguir - PRO */}
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="checkboxPedirParaSeguir"
              checked={checkboxPedirParaSeguir}
              onCheckedChange={(checked) => {
                setCheckboxPedirParaSeguir(Boolean(checked));
              }}
            />
            <label
              htmlFor="checkboxPedirParaSeguir"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
            >
              Pedir para seguir antes de enviar o link{" "}
              <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          {/* 4. Entrar em contato se não clicarem */}
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="checkboxEntrarEmContato"
              checked={checkboxEntrarEmContato}
              onCheckedChange={(checked) => {
                setCheckboxEntrarEmContato(Boolean(checked));
              }}
            />
            <label
              htmlFor="checkboxEntrarEmContato"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
            >
              Entrar em contato caso não cliquem no link
            </label>
          </div>
        </div>
      </div>

      {/* =============================================================================
          COLUNA DIREITA - PREVIEW
      ============================================================================== */}
      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* -------------------- TOPO DO PREVIEW -------------------- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <span style={{ fontWeight: "bold", fontSize: "16px" }}>Preview</span>
          <Button variant="outline" size="sm" style={{ textTransform: "none" }}>
            Ativar
          </Button>
        </div>

        {/* -------------------- COMPONENTE DE PREVIEW -------------------- */}
        <PreviewPhoneMockup
          selectedPost={selectedPost}
          instagramUser={instagramUser}
          toggleValue={toggleValue}
          commentContent={commentContent}
          /* Passando as novas props de DM */
          dmWelcomeMessage={dmWelcomeMessage}
          dmQuickReply={dmQuickReply}
          dmSecondMessage={dmSecondMessage}
          dmLink={dmLink}
          dmButtonLabel={dmButtonLabel}
        />

        {/* -------------------- TOGGLE ENTRE AS AÇÕES -------------------- */}
        <ToggleActions toggleValue={toggleValue} setToggleValue={setToggleValue} />
      </div>
    </div>
  );
}
