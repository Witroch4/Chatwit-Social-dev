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

import { useToast } from "@/hooks/use-toast"; // Caminho corrigido

interface InstagramUserData {
  id: string;
  username: string;
  media_count: number;
  profile_picture_url?: string;
}

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

  // ------------------ ESTADOS DE POSTAGEM (Etapa 1) ------------------
  const [selectedOptionPostagem, setSelectedOptionPostagem] = useState<"especifico" | "qualquer">(
    "especifico"
  );
  const [selectedPost, setSelectedPost] = useState<InstagramMediaItem | null>(null);

  // ------------------ ESTADOS DE PALAVRA/EXPRESSÃO (Etapa 1) ------------------
  const [selectedOptionPalavra, setSelectedOptionPalavra] = useState<"especifica" | "qualquer">(
    "qualquer"
  );
  const [inputPalavra, setInputPalavra] = useState("");

  // ------------------ ESTADOS DE DM (Etapa 2 e 3) ------------------
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

  // ------------------ ETAPA 4 - OUTROS RECURSOS ------------------
  const [checkboxResponderComentario, setCheckboxResponderComentario] = useState(false);
  const [checkboxPedirEmail, setCheckboxPedirEmail] = useState(false);
  const [checkboxPedirParaSeguir, setCheckboxPedirParaSeguir] = useState(false);
  const [checkboxEntrarEmContato, setCheckboxEntrarEmContato] = useState(false);

  // ------------------ PARA O PREVIEW ------------------
  const [openDialog, setOpenDialog] = useState(false);
  const [toggleValue, setToggleValue] = useState<"publicar" | "comentarios" | "dm">("publicar");
  const [commentContent, setCommentContent] = useState("");

  const accessToken = session?.user?.instagramAccessToken;

  // Importando o hook useToast corretamente
  const { toast } = useToast();

  // ---------------------------------------------------------
  //  FETCH INICIAL DAS MÍDIAS DO IG (caso o usuário esteja logado e com token)
  // ---------------------------------------------------------
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

  // --------------- FUNÇÃO DE VALIDAÇÃO --------------- //
  function validarEtapas() {
    // Etapa 1: Se "especifico", verifique se há um post selecionado.
    // Se "qualquer", não precisa.
    if (selectedOptionPostagem === "especifico" && !selectedPost) {
      toast({
        title: "Erro",
        description: "Selecione uma postagem específica ou mude para 'qualquer postagem'.",
        variant: "destructive",
      });
      return false;
    }

    // Se "especifica" (palavra), verifique se inputPalavra não está vazio
    if (selectedOptionPalavra === "especifica" && inputPalavra.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha as palavras-chave ou selecione 'qualquer'.",
        variant: "destructive",
      });
      return false;
    }

    // Etapa 2: DM de boas-vindas
    if (dmWelcomeMessage.trim() === "" || dmQuickReply.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha a DM de boas-vindas e o texto do Quick Reply.",
        variant: "destructive",
      });
      return false;
    }

    // Etapa 3: DM com o link
    if (
      dmSecondMessage.trim() === "" ||
      dmLink.trim() === "" ||
      dmButtonLabel.trim() === ""
    ) {
      toast({
        title: "Erro",
        description: "Preencha a mensagem, o link e a legenda do botão da Etapa 3.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }

  // ------------------------------------------------------------------
  //  FUNÇÃO PARA "ATIVAR" A AUTOMAÇÃO -> SALVAR NO BANCO
  // ------------------------------------------------------------------
  async function handleAtivarAutomacao() {
    // 1) Validação
    if (!validarEtapas()) {
      return;
    }

    try {
      // 2) Montar o payload
      const payload = {
        // userId será determinado pelo servidor via session (api/automacao),
        // mas se você quiser mandar no body, pode também (opcional).
        selectedMediaId:
          selectedOptionPostagem === "especifico" ? selectedPost?.id || null : null,
        anyMediaSelected: selectedOptionPostagem === "qualquer",

        selectedOptionPalavra,
        palavrasChave:
          selectedOptionPalavra === "especifica" ? inputPalavra : null,

        // DM de boas-vindas
        fraseBoasVindas: dmWelcomeMessage,
        quickReplyTexto: dmQuickReply,

        // DM com link
        mensagemEtapa3: dmSecondMessage,
        linkEtapa3: dmLink,
        legendaBotaoEtapa3: dmButtonLabel,

        // Outros recursos
        responderPublico: checkboxResponderComentario,
        pedirEmailPro: checkboxPedirEmail,
        pedirParaSeguirPro: checkboxPedirParaSeguir,
        contatoSemClique: checkboxEntrarEmContato,
      };

      // 3) Chamar a rota /api/automacao
      const res = await fetch("/api/automacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao salvar automação.");
      }

      const data = await res.json();
      console.log("Automação salva com sucesso:", data);
      toast({
        title: "Sucesso",
        description: "Automação configurada e salva com sucesso!",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Erro ao salvar automação:", error.message);
      toast({
        title: "Falha",
        description: "Falha ao salvar automação: " + error.message,
        variant: "destructive",
      });
    }
  }

  // ------------------------------------------------------
  //  RENDERIZAÇÃO
  // ------------------------------------------------------
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
        justifyContent: "center",
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
          flex: "1",
          borderRight: "1px solid #333",
          paddingRight: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* --------------- ETAPA 1 --------------- */}
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
          setInputPalavra={(val) => {
            setInputPalavra(val);
            setCommentContent(val); // Atualiza o conteúdo do comentário
            if (val.trim() !== "") {
              setToggleValue("comentarios");
            } else {
              setToggleValue("publicar");
            }
          }}
        />

        <Separator className="my-4 w-full" />

        {/* --------------- ETAPA 2 --------------- */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 2</h3>
          <p className="text-sm text-muted-foreground mb-2">
            (Inicialmente, eles receberão uma DM de boas-vindas)
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
              onFocus={() => setToggleValue("dm")}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmQuickReply">
              Quick Reply (ex.: "Me envie o link")
            </label>
            <Input
              id="dmQuickReply"
              className="mt-2"
              value={dmQuickReply}
              onChange={(e) => setDmQuickReply(e.target.value)}
              onFocus={() => setToggleValue("dm")}
            />
          </div>
        </div>

        <Separator className="my-4 w-full" />

        {/* --------------- ETAPA 3 --------------- */}
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
              onFocus={() => setToggleValue("dm")}
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
              onFocus={() => setToggleValue("dm")}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmButtonLabel">
              Adicione legenda ao botão
            </label>
            <Input
              id="dmButtonLabel"
              className="mt-2"
              value={dmButtonLabel}
              onChange={(e) => setDmButtonLabel(e.target.value)}
              onFocus={() => setToggleValue("dm")}
            />
          </div>
        </div>

        <Separator className="my-4 w-full" />

        {/* --------------- ETAPA 4 --------------- */}
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
          COLUNA DIREITA - PREVIEW (E BOTÃO ATIVAR)
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
          <Button
            variant="outline"
            size="sm"
            style={{ textTransform: "none" }}
            onClick={handleAtivarAutomacao}
          >
            Ativar
          </Button>
        </div>

        {/* -------------------- COMPONENTE DE PREVIEW -------------------- */}
        <PreviewPhoneMockup
          selectedPost={selectedPost}
          instagramUser={instagramUser}
          toggleValue={toggleValue}
          commentContent={commentContent}
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
