//app\dashboard\automacao\guiado-facil\[id]\page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import LoadingState from "../../components/WIT-EQ/LoadingState";
import UnauthenticatedState from "../../components/WIT-EQ/UnauthenticatedState";
import ErrorState from "../../components/WIT-EQ/ErrorState";
import PostSelection from "../../components/WIT-EQ/PostSelection";
import PalavraExpressaoSelection from "../../components/WIT-EQ/PalavraExpressaoSelection";
import PreviewPhoneMockup from "../../components/PreviewPhoneMockup";
import ToggleActions from "../../components/WIT-EQ/ToggleActions";

import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Tipagens para dados do Instagram
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

// Atualize a tipagem para incluir o novo campo emailPrompt
interface AutomacaoDB {
  id: string;
  selectedMediaId: string | null;
  anyMediaSelected: boolean;
  selectedOptionPalavra: string; // "especifica" | "qualquer"
  palavrasChave: string | null;
  fraseBoasVindas: string | null;
  quickReplyTexto: string | null;
  mensagemEtapa3: string | null;
  linkEtapa3: string | null;
  legendaBotaoEtapa3: string | null;
  responderPublico: boolean;
  pedirEmailPro: boolean;
  emailPrompt: string | null;
  // NOVOS para os recursos PRO:
  pedirParaSeguirPro: boolean;
  followPrompt: string | null;
  contatoSemClique: boolean;
  noClickPrompt: string | null;
  publicReply: string | null; // JSON string
  live: boolean;
}

export default function GuiadoFacilEditPage() {
  const { id } = useParams() as { id: string };
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  // Estado para controle de edição
  const [isEditing, setIsEditing] = useState(false);

  // Estados para carregamento/erro da automação
  const [loadingAuto, setLoadingAuto] = useState(true);
  const [autoError, setAutoError] = useState<string | null>(null);

  // Estados do formulário
  const [instagramUser, setInstagramUser] = useState<InstagramUserData | null>(null);
  const [instagramMedia, setInstagramMedia] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Etapa 1: Seleção de Post
  const [selectedOptionPostagem, setSelectedOptionPostagem] = useState<"especifico" | "qualquer">("especifico");
  const [selectedPost, setSelectedPost] = useState<InstagramMediaItem | null>(null);
  const [selectedMediaIdLocal, setSelectedMediaIdLocal] = useState<string | null>(null);

  // Etapa 1: Palavra/Expressão
  const [selectedOptionPalavra, setSelectedOptionPalavra] = useState<"especifica" | "qualquer">("qualquer");
  const [inputPalavra, setInputPalavra] = useState("");

  // Etapa 2: DM de Boas-Vindas
  const [dmWelcomeMessage, setDmWelcomeMessage] = useState("");
  const [dmQuickReply, setDmQuickReply] = useState("");

  // Etapa 3: DM com Link
  const [dmSecondMessage, setDmSecondMessage] = useState("");
  const [dmLink, setDmLink] = useState("");
  const [dmButtonLabel, setDmButtonLabel] = useState("");

  // Etapa 4: Outros recursos
  const [switchResponderComentario, setSwitchResponderComentario] = useState(false);
  const [publicReply1, setPublicReply1] = useState("");
  const [publicReply2, setPublicReply2] = useState("");
  const [publicReply3, setPublicReply3] = useState("");

  // Switch para Pedir email PRO
  const [switchPedirEmail, setSwitchPedirEmail] = useState(false);
  const [emailPrompt, setEmailPrompt] = useState(
    "✨ Pronto! Antes de compartilhar o link, quero que você saiba que eu guardo o melhor conteúdo só para os meus inscritos! 🤗💖\n\nQuer receber as melhores novidades? 🥳💌 Adicione seu email abaixo e fique por dentro de tudo! Não perca essa chance! 🚀👇"
  );

  // Switch para Pedir para Seguir PRO
  const [switchPedirParaSeguir, setSwitchPedirParaSeguir] = useState(false);
  const [followPrompt, setFollowPrompt] = useState(
    "Você está quase lá! 🚀 Este link é exclusivo para meus seguidores ✨ Me segue agora e eu te envio o link para você aproveitar tudo! 🎉"
  );

  // Switch para Entrar em Contato caso não cliquem no link
  const [switchEntrarEmContato, setSwitchEntrarEmContato] = useState(false);
  const [noClickPrompt, setNoClickPrompt] = useState(
    "🔥 Quer saber mais? Então não esquece de clicar no link aqui embaixo! ⬇️✨ Tenho certeza de que você vai amar! ❤️😍🚀"
  );

  // Estado para controlar se a automação está ativa (live)
  const [isLive, setIsLive] = useState(true);

  // Estado de Preview
  const [openDialog, setOpenDialog] = useState(false);
  const [toggleValue, setToggleValue] = useState<"publicar" | "comentarios" | "dm">("publicar");
  const [commentContent, setCommentContent] = useState("");

  const accessToken = session?.user?.instagramAccessToken;

  // 1) Carrega a automação do BD
  useEffect(() => {
    if (!id || !session?.user?.id) return;
    async function fetchAutomacao() {
      try {
        setLoadingAuto(true);
        setAutoError(null);
        const res = await fetch(`/api/automacao/${id}`, { method: "GET" });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Falha ao buscar automação");
        }
        const data = (await res.json()) as AutomacaoDB;
        setSelectedOptionPostagem(data.anyMediaSelected ? "qualquer" : "especifico");
        setSelectedMediaIdLocal(data.selectedMediaId);
        setSelectedOptionPalavra(data.selectedOptionPalavra as "especifica" | "qualquer");
        setInputPalavra(data.palavrasChave || "");
        setDmWelcomeMessage(data.fraseBoasVindas || "");
        setDmQuickReply(data.quickReplyTexto || "");
        setDmSecondMessage(data.mensagemEtapa3 || "");
        setDmLink(data.linkEtapa3 || "");
        setDmButtonLabel(data.legendaBotaoEtapa3 || "");
        setSwitchResponderComentario(data.responderPublico);
        if (data.publicReply) {
          try {
            const arr = JSON.parse(data.publicReply) as string[];
            setPublicReply1(arr[0] || "");
            setPublicReply2(arr[1] || "");
            setPublicReply3(arr[2] || "");
          } catch {}
        }
        setSwitchPedirEmail(data.pedirEmailPro);
        setEmailPrompt(data.emailPrompt || emailPrompt);
        setSwitchPedirParaSeguir(data.pedirParaSeguirPro);
        setFollowPrompt(data.followPrompt || followPrompt);
        setSwitchEntrarEmContato(data.contatoSemClique);
        setNoClickPrompt(data.noClickPrompt || noClickPrompt);
        setIsLive(data.live);
      } catch (err: any) {
        setAutoError(err.message);
      } finally {
        setLoadingAuto(false);
      }
    }
    fetchAutomacao();
  }, [id, session]);

  // 2) Carrega dados do Instagram
  useEffect(() => {
    const fetchInstagramData = async () => {
      setLoading(true);
      if (status === "authenticated" && accessToken) {
        try {
          const userRes = await fetch(
            `https://graph.instagram.com/me?fields=id,username,media_count,profile_picture_url&access_token=${accessToken}`
          );
          if (!userRes.ok) {
            const errorText = await userRes.text();
            console.error("Erro ao buscar usuário:", errorText);
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
            console.error("Erro ao buscar mídias:", errorText);
            setError("Não foi possível obter as mídias do Instagram.");
            setLoading(false);
            return;
          }
          const mediaData = await mediaRes.json();
          setInstagramMedia(mediaData.data || []);
          setLoading(false);
        } catch (err) {
          console.error("Erro na API do Instagram:", err);
          setError("Erro ao conectar-se à API do Instagram.");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchInstagramData();
  }, [status, accessToken]);

  // 2.1) Associa o post salvo (se existir) com as mídias do Instagram
  useEffect(() => {
    if (!selectedMediaIdLocal || selectedOptionPostagem !== "especifico" || instagramMedia.length === 0) return;
    const found = instagramMedia.find((m) => m.id === selectedMediaIdLocal);
    if (found) {
      setSelectedPost(found);
    } else {
      console.warn("Post salvo no BD não encontrado nas mídias recentes.");
    }
  }, [selectedMediaIdLocal, selectedOptionPostagem, instagramMedia]);

  if (status === "loading" || loadingAuto || loading) return <LoadingState />;
  if (status === "unauthenticated") return <UnauthenticatedState />;
  if (autoError) return <ErrorState error={autoError} />;
  if (error) return <ErrorState error={error} />;

  function validarEtapas(): boolean {
    if (selectedOptionPostagem === "especifico" && !selectedPost) {
      toast({
        title: "Erro",
        description: "Selecione uma postagem específica ou mude para 'qualquer postagem'.",
        variant: "destructive",
      });
      return false;
    }
    if (selectedOptionPalavra === "especifica" && inputPalavra.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha as palavras-chave ou selecione 'qualquer'.",
        variant: "destructive",
      });
      return false;
    }
    if (dmWelcomeMessage.trim() === "" || dmQuickReply.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha a DM de boas-vindas e o Quick Reply.",
        variant: "destructive",
      });
      return false;
    }
    if (dmSecondMessage.trim() === "" || dmLink.trim() === "" || dmButtonLabel.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha a mensagem, o link e a legenda do botão da Etapa 3.",
        variant: "destructive",
      });
      return false;
    }
    if (switchResponderComentario) {
      if (publicReply1.trim() === "" || publicReply2.trim() === "" || publicReply3.trim() === "") {
        toast({
          title: "Erro",
          description: "Preencha as 3 opções de respostas públicas antes de ativar.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  }

  async function handleAtivarAutomacao() {
    if (!validarEtapas()) return;
    try {
      const publicReplyArray = [publicReply1, publicReply2, publicReply3];
      const publicReplyJson = switchResponderComentario ? JSON.stringify(publicReplyArray) : null;

      const payload = {
        // Etapa 1
        selectedMediaId: selectedOptionPostagem === "especifico" ? selectedPost?.id || null : null,
        anyMediaSelected: selectedOptionPostagem === "qualquer",
        selectedOptionPalavra: selectedOptionPalavra,
        palavrasChave: selectedOptionPalavra === "especifica" ? inputPalavra : null,
        // Etapa 2
        fraseBoasVindas: dmWelcomeMessage,
        quickReplyTexto: dmQuickReply,
        // Etapa 3
        mensagemEtapa3: dmSecondMessage,
        linkEtapa3: dmLink,
        legendaBotaoEtapa3: dmButtonLabel,
        // Etapa 4
        responderPublico: switchResponderComentario,
        pedirEmailPro: switchPedirEmail,
        emailPrompt: switchPedirEmail ? emailPrompt : null,
        pedirParaSeguirPro: switchPedirParaSeguir,
        followPrompt: switchPedirParaSeguir ? followPrompt : null,
        contatoSemClique: switchEntrarEmContato,
        noClickPrompt: switchEntrarEmContato ? noClickPrompt : null,
        publicReply: publicReplyJson,
        live: isLive,
      };

      const res = await fetch(`/api/automacao/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateAll", data: payload }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao salvar automação.");
      }
      toast({
        title: "Sucesso",
        description: "Automação atualizada com sucesso!",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Erro ao salvar automação:", error.message);
      toast({
        title: "Falha",
        description: "Erro ao salvar automação: " + error.message,
        variant: "destructive",
      });
    }
  }

  async function handleClickEdit() {
    setIsEditing((prev) => !prev);
  }

  async function handleClickPauseOrSalvar() {
    if (isEditing) {
      await handleAtivarAutomacao();
      setIsEditing(false);
    } else {
      try {
        const newLiveStatus = !isLive;
        const res = await fetch(`/api/automacao/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "updateAll", data: { live: newLiveStatus } }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Erro ao atualizar status.");
        }
        setIsLive(newLiveStatus);
        toast({
          title: "Sucesso",
          description: `Automação ${newLiveStatus ? "ativada" : "pausada"} com sucesso!`,
          variant: "default",
        });
      } catch (error: any) {
        console.error("Erro ao atualizar status:", error.message);
        toast({
          title: "Falha",
          description: "Erro ao atualizar status: " + error.message,
          variant: "destructive",
        });
      }
    }
  }

  const editButtonLabel = isEditing ? "Cancelar" : "Editar";
  const pauseButtonLabel = isEditing ? "Salvar" : isLive ? "Pausar" : "Ativar";

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
      {/* COLUNA ESQUERDA – FORMULÁRIO */}
      <div
        style={{
          flex: 1,
          borderRight: "1px solid #333",
          paddingRight: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <PostSelection
          selectedOptionPostagem={selectedOptionPostagem}
          setSelectedOptionPostagem={setSelectedOptionPostagem}
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
          ultimasPostagens={ultimasPostagens}
          instagramMedia={instagramMedia}
          openDialog={openDialog}
          setOpenDialog={setOpenDialog}
          disabled={!isEditing}
          className={!isEditing ? "cursor-not-allowed" : ""}
          onSelectPost={() => {
            if (selectedPost) setCommentContent(selectedPost.caption || "");
          }}
        />

        <PalavraExpressaoSelection
          selectedOptionPalavra={selectedOptionPalavra}
          setSelectedOptionPalavra={(val) => setSelectedOptionPalavra(val as "especifica" | "qualquer")}
          inputPalavra={inputPalavra}
          setInputPalavra={(val) => {
            setInputPalavra(val);
            setCommentContent(val);
            if (val.trim() !== "") setToggleValue("comentarios");
            else setToggleValue("publicar");
          }}
          disabled={!isEditing}
          className={!isEditing ? "cursor-not-allowed" : ""}
        />

        <Separator className="my-4 w-full" />

        {/* Etapa 2 */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 2</h3>
          <p className="text-sm text-muted-foreground mb-2">(Inicialmente, eles receberão uma DM de boas-vindas)</p>
          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmWelcomeMessage">
              Mensagem de boas-vindas
            </label>
            <Textarea
              id="dmWelcomeMessage"
              className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
              value={dmWelcomeMessage}
              onChange={(e) => setDmWelcomeMessage(e.target.value)}
              onFocus={() => setToggleValue("dm")}
              readOnly={!isEditing}
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmQuickReply">
              Quick Reply (ex.: "Me envie o link")
            </label>
            <Input
              id="dmQuickReply"
              className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
              value={dmQuickReply}
              onChange={(e) => setDmQuickReply(e.target.value)}
              onFocus={() => setToggleValue("dm")}
              disabled={!isEditing}
            />
          </div>
        </div>

        <Separator className="my-4 w-full" />

        {/* Etapa 3 */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 3</h3>
          <p className="text-sm text-muted-foreground mb-2">(Logo depois, a DM com o link será enviada)</p>
          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmSecondMessage">
              Escreva uma mensagem
            </label>
            <Textarea
              id="dmSecondMessage"
              className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
              value={dmSecondMessage}
              onChange={(e) => setDmSecondMessage(e.target.value)}
              onFocus={() => setToggleValue("dm")}
              readOnly={!isEditing}
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmLink">
              Adicionar um link
            </label>
            <Input
              id="dmLink"
              className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
              value={dmLink}
              onChange={(e) => setDmLink(e.target.value)}
              onFocus={() => setToggleValue("dm")}
              disabled={!isEditing}
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmButtonLabel">
              Adicione legenda ao botão
            </label>
            <Input
              id="dmButtonLabel"
              className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
              value={dmButtonLabel}
              onChange={(e) => setDmButtonLabel(e.target.value)}
              onFocus={() => setToggleValue("dm")}
              disabled={!isEditing}
            />
          </div>
        </div>

        <Separator className="my-4 w-full" />

        {/* Etapa 4 */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 4</h3>
          <p className="text-sm text-muted-foreground mb-4">(Outros recursos para automatizar)</p>
          <TooltipProvider>
            <div className="flex items-center space-x-2 mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="switchResponderComentario"
                      checked={switchResponderComentario}
                      onCheckedChange={(checked) => setSwitchResponderComentario(checked)}
                      disabled={!isEditing}
                      className={!isEditing ? "cursor-not-allowed" : ""}
                    />
                    <Label htmlFor="switchResponderComentario">
                      Responder ao comentário de forma pública
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Defina 3 respostas públicas que serão escolhidas aleatoriamente.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          {switchResponderComentario && (
            <div className="space-y-2 mb-4 mt-2">
              <Input
                value={publicReply1}
                onChange={(e) => setPublicReply1(e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "cursor-not-allowed" : ""}
                placeholder="Resposta Pública 1"
              />
              <Input
                value={publicReply2}
                onChange={(e) => setPublicReply2(e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "cursor-not-allowed" : ""}
                placeholder="Resposta Pública 2"
              />
              <Input
                value={publicReply3}
                onChange={(e) => setPublicReply3(e.target.value)}
                disabled={!isEditing}
                className={!isEditing ? "cursor-not-allowed" : ""}
                placeholder="Resposta Pública 3"
              />
            </div>
          )}

          {/* Switch para Pedir email PRO */}
          <div className="flex items-center space-x-2 mb-2">
            <Switch
              id="switchPedirEmail"
              checked={switchPedirEmail}
              onCheckedChange={(checked) => setSwitchPedirEmail(checked)}
              disabled={!isEditing}
              className={!isEditing ? "cursor-not-allowed" : ""}
            />
            <Label htmlFor="switchPedirEmail" className="text-sm font-medium">
              Pedir email <span className="text-xs text-muted-foreground">PRO</span>
            </Label>
          </div>
          {switchPedirEmail && (
            <div className="mb-4">
              <Textarea
                id="emailPrompt"
                value={emailPrompt}
                onChange={(e) => setEmailPrompt(e.target.value)}
                placeholder="Digite sua mensagem para solicitação de email"
                className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
                disabled={!isEditing}
              />
            </div>
          )}

          {/* Switch para Pedir para Seguir PRO */}
          <div className="flex items-center space-x-2 mb-2">
            <Switch
              id="switchPedirParaSeguir"
              checked={switchPedirParaSeguir}
              onCheckedChange={(checked) => setSwitchPedirParaSeguir(checked)}
              disabled={!isEditing}
              className={!isEditing ? "cursor-not-allowed" : ""}
            />
            <Label htmlFor="switchPedirParaSeguir" className="text-sm font-medium">
              Pedir para seguir antes de enviar o link <span className="text-xs text-muted-foreground">PRO</span>
            </Label>
          </div>
          {switchPedirParaSeguir && (
            <div className="mb-4">
              <Textarea
                id="followPrompt"
                value={followPrompt}
                onChange={(e) => setFollowPrompt(e.target.value)}
                placeholder="Você está quase lá! 🚀 Este link é exclusivo para meus seguidores..."
                className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
                disabled={!isEditing}
              />
            </div>
          )}

          {/* Switch para Entrar em Contato caso não cliquem no link */}
          <div className="flex items-center space-x-2 mb-2">
            <Switch
              id="switchEntrarEmContato"
              checked={switchEntrarEmContato}
              onCheckedChange={(checked) => setSwitchEntrarEmContato(checked)}
              disabled={!isEditing}
              className={!isEditing ? "cursor-not-allowed" : ""}
            />
            <Label htmlFor="switchEntrarEmContato" className="text-sm font-medium">
              Entrar em contato caso não cliquem no link
            </Label>
          </div>
          {switchEntrarEmContato && (
            <div className="mb-4">
              <Textarea
                id="noClickPrompt"
                value={noClickPrompt}
                onChange={(e) => setNoClickPrompt(e.target.value)}
                placeholder="🔥 Quer saber mais? Então não esquece de clicar no link aqui embaixo! ⬇️✨ Tenho certeza de que você vai amar! ❤️😍🚀"
                className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`}
                disabled={!isEditing}
              />
            </div>
          )}

          {/* Switch para controlar o status live */}
          <div className="flex items-center space-x-2 mb-4 mt-4">
            <Switch
              id="switchLive"
              checked={isLive}
              onCheckedChange={(checked) => setIsLive(checked)}
              disabled={!isEditing}
              className={!isEditing ? "cursor-not-allowed" : ""}
            />
            <Label htmlFor="switchLive">
              {isLive ? "Automação Ativa" : "Automação Pausada"}
            </Label>
          </div>
        </div>

        {/* Botões Editar/Pausar ou Cancelar/Salvar */}
        <div style={{ marginTop: "20px", width: "100%" }}>
          <Button variant="outline" size="sm" onClick={handleClickEdit} style={{ marginRight: "10px" }}>
            {isEditing ? "Cancelar" : "Editar"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClickPauseOrSalvar}>
            {isEditing ? "Salvar" : isLive ? "Pausar" : "Ativar"}
          </Button>
        </div>
      </div>

      {/* COLUNA DIREITA – PREVIEW */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", marginBottom: "10px" }}>
          <span style={{ fontWeight: "bold", fontSize: "16px" }}>Preview</span>
        </div>
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
          responderPublico={switchResponderComentario}
          publicReply1={publicReply1}
        />
        <ToggleActions toggleValue={toggleValue} setToggleValue={setToggleValue} />
      </div>
    </div>
  );
}
