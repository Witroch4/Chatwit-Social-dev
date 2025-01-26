// app/dashboard/automacao/guiado-facil/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Importando useRouter

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Switch do shadcn

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Tooltip do shadcn

import LoadingState from "../components/WIT-EQ/LoadingState";
import UnauthenticatedState from "../components/WIT-EQ/UnauthenticatedState";
import ErrorState from "../components/WIT-EQ/ErrorState";
import PostSelection from "../components/WIT-EQ/PostSelection";
import PalavraExpressaoSelection from "../components/WIT-EQ/PalavraExpressaoSelection";
import PreviewPhoneMockup from "../components/PreviewPhoneMockup";
import ToggleActions from "../components/WIT-EQ/ToggleActions";

import { useToast } from "@/hooks/use-toast";

// Tipagens
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
  const { toast } = useToast();
  const router = useRouter(); // Inicializando useRouter

  // ------------ Estado geral ------------
  const [instagramUser, setInstagramUser] = useState<InstagramUserData | null>(null);
  const [instagramMedia, setInstagramMedia] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ------------ Etapa 1: Seleção de Post ------------
  const [selectedOptionPostagem, setSelectedOptionPostagem] = useState<"especifico" | "qualquer">(
    "especifico"
  );
  const [selectedPost, setSelectedPost] = useState<InstagramMediaItem | null>(null);

  // ------------ Etapa 1: Palavra/Expressão ------------
  const [selectedOptionPalavra, setSelectedOptionPalavra] = useState<"especifica" | "qualquer">(
    "qualquer"
  );
  const [inputPalavra, setInputPalavra] = useState("");

  // ------------ Etapas 2 e 3: DMs ------------
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

  // ------------ Etapa 4: Outros recursos ------------
  // Switch: "Responder comentário publicamente"
  const [switchResponderComentario, setSwitchResponderComentario] = useState(false);

  // 3 frases de resposta pública
  const [publicReply1, setPublicReply1] = useState("Obrigado! ❤️ Por favor, veja DMs.");
  const [publicReply2, setPublicReply2] = useState("Te enviei uma mensagem ✅️  Verificar.");
  const [publicReply3, setPublicReply3] = useState("Que bom 👍 Verifica as tuas DMs.");

  // Checkboxes PRO
  const [checkboxPedirEmail, setCheckboxPedirEmail] = useState(false);
  const [checkboxPedirParaSeguir, setCheckboxPedirParaSeguir] = useState(false);
  const [checkboxEntrarEmContato, setCheckboxEntrarEmContato] = useState(false);

  // ------------ Preview ------------
  const [openDialog, setOpenDialog] = useState(false);
  const [toggleValue, setToggleValue] = useState<"publicar" | "comentarios" | "dm">("publicar");
  const [commentContent, setCommentContent] = useState("");

  // ------------ Access Token ------------
  const accessToken = session?.user?.instagramAccessToken;

  // ============ Carregar dados do Instagram ============
  useEffect(() => {
    const fetchInstagramData = async () => {
      if (status === "authenticated" && accessToken) {
        try {
          // 1) Dados do usuário
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

          // 2) Dados das mídias
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

  // ----------------------------------------------------------------------
  // 3) Exibir estados de carregamento e erro
  // ----------------------------------------------------------------------
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

  // ----------------------------------------------------------------------
  // 4) Lógica de validar e salvar (se precisar)
  // ----------------------------------------------------------------------
  function validarEtapas(): boolean {
    // Etapa 1
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

    // Etapa 2
    if (dmWelcomeMessage.trim() === "" || dmQuickReply.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha a DM de boas-vindas e o texto do Quick Reply.",
        variant: "destructive",
      });
      return false;
    }

    // Etapa 3
    if (dmSecondMessage.trim() === "" || dmLink.trim() === "" || dmButtonLabel.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha a mensagem, o link e a legenda do botão da Etapa 3.",
        variant: "destructive",
      });
      return false;
    }

    // Etapa 4: se estiver ON, validar as frases
    if (switchResponderComentario) {
      if (
        publicReply1.trim() === "" ||
        publicReply2.trim() === "" ||
        publicReply3.trim() === ""
      ) {
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

  // ============ Salvar Automação ============
  async function handleAtivarAutomacao() {
    if (!validarEtapas()) return;

    try {
      // Montar as 3 respostas em um único campo (JSON)
      const publicReplyArray = [publicReply1, publicReply2, publicReply3];
      const publicReplyJson = switchResponderComentario ? JSON.stringify(publicReplyArray) : null;

      // Payload
      const payload = {
        // Etapa 1
        selectedMediaId:
          selectedOptionPostagem === "especifico" ? selectedPost?.id || null : null,
        anyMediaSelected: selectedOptionPostagem === "qualquer",

        selectedOptionPalavra,
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
        pedirEmailPro: checkboxPedirEmail,
        pedirParaSeguirPro: checkboxPedirParaSeguir,
        contatoSemClique: checkboxEntrarEmContato,
        publicReply: publicReplyJson,

        // Novo: Definir live como true na criação
        live: true,
      };

      // Chamar a rota /api/automacao
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

      // Redirecionar para a página de edição da automação recém-criada
      router.push(`/dashboard/automacao/guiado-facil/${data.id}`);
    } catch (error: any) {
      console.error("Erro ao salvar automação:", error.message);
      toast({
        title: "Falha",
        description: "Falha ao salvar automação: " + error.message,
        variant: "destructive",
      });
    }
  }

  // ----------------------------------------------------------------------
  // 5) Render final
  // ----------------------------------------------------------------------
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
      {/* ======================================================
          COLUNA ESQUERDA - FORMULÁRIO
      ======================================================= */}
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
        {/* Etapa 1 */}
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
            setCommentContent(val); // Passa a "palavra" para o preview de comentário
            if (val.trim() !== "") {
              setToggleValue("comentarios"); // Muda o preview para comentários
            } else {
              setToggleValue("publicar"); // Caso apague, volta a publicar
            }
          }}
        />

        <Separator className="my-4 w-full" />

        {/* Etapa 2 */}
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

        {/* Etapa 3 */}
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

        {/* Etapa 4 */}
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
                      Responder ao comentário de forma pública
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Escolha 3 opções de respostas públicas que vamos mandar 1 delas aleatoriamente
                    em cada comentário 😊
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {switchResponderComentario && (
            <div className="space-y-2 mb-4 mt-2">
              <Input
                value={publicReply1}
                onChange={(e) => setPublicReply1(e.target.value)}
              />
              <Input
                value={publicReply2}
                onChange={(e) => setPublicReply2(e.target.value)}
              />
              <Input
                value={publicReply3}
                onChange={(e) => setPublicReply3(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="checkboxPedirEmail"
              checked={checkboxPedirEmail}
              onCheckedChange={(checked) => setCheckboxPedirEmail(Boolean(checked))}
            />
            <label
              htmlFor="checkboxPedirEmail"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
            >
              Pedir email <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="checkboxPedirParaSeguir"
              checked={checkboxPedirParaSeguir}
              onCheckedChange={(checked) => setCheckboxPedirParaSeguir(Boolean(checked))}
            />
            <label
              htmlFor="checkboxPedirParaSeguir"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
            >
              Pedir para seguir antes de enviar o link{" "}
              <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="checkboxEntrarEmContato"
              checked={checkboxEntrarEmContato}
              onCheckedChange={(checked) => setCheckboxEntrarEmContato(Boolean(checked))}
            />
            <label
              htmlFor="checkboxEntrarEmContato"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
            >
              Entrar em contato caso não cliquem no link
            </label>
          </div>
        </div>

        {/* Botão de Ativar */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAtivarAutomacao}
          style={{ marginTop: "20px" }}
        >
          Ativar
        </Button>
      </div>

      {/* ======================================================
          COLUNA DIREITA - PREVIEW E BOTÃO
      ======================================================= */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Topo do preview */}
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
          {/* O botão de ativar foi movido para a coluna esquerda */}
        </div>

        {/* Componente de Preview */}
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

          // Props da etapa 4 (para exibir no preview de comentários)
          responderPublico={switchResponderComentario}
          publicReply1={publicReply1}
        />

        {/* Toggle entre as ações do preview */}
        <ToggleActions toggleValue={toggleValue} setToggleValue={setToggleValue} />
      </div>
    </div>
  );
}
