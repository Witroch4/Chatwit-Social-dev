"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import LoadingState from "../components/WIT-EQ/LoadingState";
import UnauthenticatedState from "../components/WIT-EQ/UnauthenticatedState";
import ErrorState from "../components/WIT-EQ/ErrorState";
import PostSelection from "../components/WIT-EQ/PostSelection";
import PalavraExpressaoSelection from "../components/WIT-EQ/PalavraExpressaoSelection";
import PreviewPhoneMockup from "../components/PreviewPhoneMockup";
import ToggleActions from "../components/WIT-EQ/ToggleActions";

import { useToast } from "@/hooks/use-toast";
import { useParams } from "next/navigation";

export interface InstagramUserData {
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
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ accountid: string }>();
  const providerAccountId = params?.accountid ?? '';

  if (!providerAccountId) {
    return <div>ID da conta não fornecido</div>;
  }

  // Estados para seleção de postagem
  const [selectedPost, setSelectedPost] = useState<InstagramMediaItem | null>(null);
  const [anyMediaSelected, setAnyMediaSelected] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  // Estados para palavras-chave
  const [anyword, setAnyword] = useState(false);
  const [inputPalavra, setInputPalavra] = useState("");

  // Instagram data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instagramUser, setInstagramUser] = useState<InstagramUserData | null>(null);
  const [instagramMedia, setInstagramMedia] = useState<InstagramMediaItem[]>([]);

  // Etapa 2: DM de Boas-Vindas
  const [dmWelcomeMessage, setDmWelcomeMessage] = useState(
    "Olá! Eu estou muito feliz que você está aqui, muito obrigado pelo seu interesse 😊\n\nClique abaixo e eu vou te mandar o link em um segundo ✨"
  );
  const [dmQuickReply, setDmQuickReply] = useState("Me envie o link");

  // Etapa 3: DM com Link
  const [dmSecondMessage, setDmSecondMessage] = useState(
    "Obrigado por ter respondido, segue o nosso link do produto"
  );
  const [dmLink, setDmLink] = useState("https://witdev.com.br");
  const [dmButtonLabel, setDmButtonLabel] = useState("Segue Nosso Site");

  // Etapa 4: Outros Recursos
  const [switchResponderComentario, setSwitchResponderComentario] = useState(false);
  const [publicReply1, setPublicReply1] = useState("Obrigado! ❤️ Por favor, veja DMs.");
  const [publicReply2, setPublicReply2] = useState("Te enviei uma mensagem ✅️  Verificar.");
  const [publicReply3, setPublicReply3] = useState("Que bom 👍 Verifica as tuas DMs.");

  // Switch para Pedir Email PRO
  const [switchPedirEmail, setSwitchPedirEmail] = useState(false);
  const [emailPrompt, setEmailPrompt] = useState(
    "✨ Pronto! Antes de compartilhar o link, quero que você saiba que eu guardo o melhor conteúdo só para meus inscritos! 🤗💖\n\nQuer receber as melhores novidades? Adicione seu email abaixo e fique por dentro de tudo! 🚀👇"
  );

  // Switch para Pedir para Seguir PRO
  const [switchPedirParaSeguir, setSwitchPedirParaSeguir] = useState(false);
  const [followPrompt, setFollowPrompt] = useState(
    "Você está quase lá! 🚀 Este link é exclusivo para meus seguidores ✨ Me segue agora e eu te envio o link para você aproveitar tudo! 🎉"
  );

  // Switch para Contato caso não cliquem no link
  const [switchEntrarEmContato, setSwitchEntrarEmContato] = useState(false);
  const [noClickPrompt, setNoClickPrompt] = useState(
    "🔥 Quer saber mais? Então não esquece de clicar no link aqui embaixo! ⬇️✨ Tenho certeza de que você vai amar! ❤️😍🚀"
  );

  // Preview e outros estados
  const [toggleValue, setToggleValue] = useState<"publicar" | "comentarios" | "dm">("publicar");
  const [commentContent, setCommentContent] = useState("");

  useEffect(() => {
    const fetchInstagramData = async () => {
      if (status === "authenticated" && providerAccountId) {
        try {
          const res = await fetch(`/api/instagram/posts?providerAccountId=${providerAccountId}`);

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Erro ao buscar dados do Instagram");
          }

          const data = await res.json();
          setInstagramUser(data.user);
          setInstagramMedia(data.media || []);
          setLoading(false);
        } catch (err: any) {
          console.error("Erro ao conectar com o Instagram:", err);
          setError(err.message || "Erro ao conectar com o Instagram.");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchInstagramData();
  }, [status, providerAccountId]);

  if (status === "loading" || loading) return <LoadingState />;
  if (status === "unauthenticated") return <UnauthenticatedState />;
  if (error) return <ErrorState error={error} />;

  function validarEtapas(): boolean {
    if (!anyMediaSelected && !selectedPost) {
      toast({
        title: "Erro",
        description: "Selecione uma publicação específica ou escolha 'Qualquer Publicação'",
        variant: "destructive",
      });
      return false;
    }
    // Validação de palavra/expressão:
    // Se anyword for false (ou seja, "específica"), o input não pode estar vazio
    if (anyword === false && inputPalavra.trim() === "") {
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
          description: "Preencha as 3 respostas públicas antes de ativar.",
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
        selectedMediaId: anyMediaSelected ? null : selectedPost?.id || null,
        anyMediaSelected: anyMediaSelected,
        anyword: anyword,
        palavrasChave: anyword ? null : inputPalavra,
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
        live: true,
      };

      const res = await fetch(`/api/automacao?providerAccountId=${providerAccountId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao salvar automação.");
      }
      const data = await res.json();
      console.log("Automação salva:", data);
      toast({
        title: "Sucesso",
        description: "Automação criada com sucesso!",
        variant: "default",
      });
      router.push(`/${providerAccountId}/dashboard/automacao/guiado-facil/${data.id}`);
    } catch (error: any) {
      console.error("Erro ao salvar automação:", error.message);
      toast({
        title: "Falha",
        description: "Erro ao salvar automação: " + error.message,
        variant: "destructive",
      });
    }
  }

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
          anyMediaSelected={anyMediaSelected}
          setAnyMediaSelected={setAnyMediaSelected}
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
          instagramMedia={instagramMedia}
          openDialog={openDialog}
          setOpenDialog={setOpenDialog}
        />

        <PalavraExpressaoSelection
          anyword={anyword}
          setAnyword={setAnyword}
          inputPalavra={inputPalavra}
          setInputPalavra={(val) => {
            setInputPalavra(val);
            setCommentContent(val);
            if (val.trim() !== "") setToggleValue("comentarios");
            else setToggleValue("publicar");
          }}
        />

        <Separator className="my-4 w-full" />

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

        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 4</h3>
          <p className="text-sm text-muted-foreground mb-4">
            (Outros recursos para automatizar)
          </p>
          <TooltipProvider>
            <div className="flex items-center space-x-2 mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="switchResponderComentario"
                      checked={switchResponderComentario}
                      onCheckedChange={(checked) => setSwitchResponderComentario(checked)}
                    />
                    <Label htmlFor="switchResponderComentario">
                      Responder ao comentário publicamente
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Defina 3 respostas públicas que serão escolhidas aleatoriamente.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          {switchResponderComentario && (
            <div className="space-y-2 mb-4 mt-2">
              <Input value={publicReply1} onChange={(e) => setPublicReply1(e.target.value)} />
              <Input value={publicReply2} onChange={(e) => setPublicReply2(e.target.value)} />
              <Input value={publicReply3} onChange={(e) => setPublicReply3(e.target.value)} />
            </div>
          )}

          <div className="flex items-center space-x-2 mb-2">
            <Switch
              id="switchPedirEmail"
              checked={switchPedirEmail}
              onCheckedChange={(checked) => setSwitchPedirEmail(checked)}
            />
            <label htmlFor="switchPedirEmail" className="text-sm font-medium">
              Pedir email <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>
          {switchPedirEmail && (
            <div className="mb-4">
              <Textarea
                id="emailPrompt"
                value={emailPrompt}
                onChange={(e) => setEmailPrompt(e.target.value)}
                placeholder="Digite sua mensagem para solicitação de email"
                className="mt-2"
              />
            </div>
          )}

          <div className="flex items-center space-x-2 mb-2">
            <Switch
              id="switchPedirParaSeguir"
              checked={switchPedirParaSeguir}
              onCheckedChange={(checked) => setSwitchPedirParaSeguir(checked)}
            />
            <label htmlFor="switchPedirParaSeguir" className="text-sm font-medium">
              Pedir para seguir antes de enviar o link <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>
          {switchPedirParaSeguir && (
            <div className="mb-4">
              <Textarea
                id="followPrompt"
                value={followPrompt}
                onChange={(e) => setFollowPrompt(e.target.value)}
                placeholder="Você está quase lá! 🚀 Este link é exclusivo..."
                className="mt-2"
              />
            </div>
          )}

          <div className="flex items-center space-x-2 mb-2">
            <Switch
              id="switchEntrarEmContato"
              checked={switchEntrarEmContato}
              onCheckedChange={(checked) => setSwitchEntrarEmContato(checked)}
            />
            <label htmlFor="switchEntrarEmContato" className="text-sm font-medium">
              Entrar em contato caso não cliquem no link
            </label>
          </div>
          {switchEntrarEmContato && (
            <div className="mb-4">
              <Textarea
                id="noClickPrompt"
                value={noClickPrompt}
                onChange={(e) => setNoClickPrompt(e.target.value)}
                placeholder="🔥 Quer saber mais? Então não esquece de clicar..."
                className="mt-2"
              />
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handleAtivarAutomacao} style={{ marginTop: "20px" }}>
          Ativar
        </Button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", marginBottom: "10px" }}>
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
