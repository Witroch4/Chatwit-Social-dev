"use strict";
// app/dashboard/automacao/guiado-facil/page.tsx
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserPage;
const react_1 = require("next-auth/react");
const react_2 = require("react");
const navigation_1 = require("next/navigation"); // Importando useRouter
const button_1 = require("../../../../components/ui/button");
const separator_1 = require("../../../../components/ui/separator");
const input_1 = require("../../../../components/ui/input");
const textarea_1 = require("../../../../components/ui/textarea");
const checkbox_1 = require("../../../../components/ui/checkbox");
const label_1 = require("../../../../components/ui/label");
const switch_1 = require("../../../../components/ui/switch"); // Switch do shadcn
const tooltip_1 = require("../../../../components/ui/tooltip"); // Tooltip do shadcn
const LoadingState_1 = __importDefault(require("../components/WIT-EQ/LoadingState"));
const UnauthenticatedState_1 = __importDefault(require("../components/WIT-EQ/UnauthenticatedState"));
const ErrorState_1 = __importDefault(require("../components/WIT-EQ/ErrorState"));
const PostSelection_1 = __importDefault(require("../components/WIT-EQ/PostSelection"));
const PalavraExpressaoSelection_1 = __importDefault(require("../components/WIT-EQ/PalavraExpressaoSelection"));
const PreviewPhoneMockup_1 = __importDefault(require("../components/PreviewPhoneMockup"));
const ToggleActions_1 = __importDefault(require("../components/WIT-EQ/ToggleActions"));
const use_toast_1 = require("../../../../hooks/use-toast");
function UserPage() {
    var _a;
    const { data: session, status } = (0, react_1.useSession)();
    const { toast } = (0, use_toast_1.useToast)();
    const router = (0, navigation_1.useRouter)(); // Inicializando useRouter
    const handleSetSelectedOptionPalavra = (val) => {
        setSelectedOptionPalavra(val);
    };
    // ------------ Estado geral ------------
    const [instagramUser, setInstagramUser] = (0, react_2.useState)(null);
    const [instagramMedia, setInstagramMedia] = (0, react_2.useState)([]);
    const [loading, setLoading] = (0, react_2.useState)(true);
    const [error, setError] = (0, react_2.useState)(null);
    // ------------ Etapa 1: Seleção de Post ------------
    const [selectedOptionPostagem, setSelectedOptionPostagem] = (0, react_2.useState)("especifico");
    const [selectedPost, setSelectedPost] = (0, react_2.useState)(null);
    // ------------ Etapa 1: Palavra/Expressão ------------
    const [selectedOptionPalavra, setSelectedOptionPalavra] = (0, react_2.useState)("qualquer");
    const [inputPalavra, setInputPalavra] = (0, react_2.useState)("");
    // ------------ Etapas 2 e 3: DMs ------------
    // Etapa 2
    const [dmWelcomeMessage, setDmWelcomeMessage] = (0, react_2.useState)("Olá! Eu estou muito feliz que você está aqui, muito obrigado pelo seu interesse 😊\n\nClique abaixo e eu vou te mandar o link em um segundo ✨");
    const [dmQuickReply, setDmQuickReply] = (0, react_2.useState)("Me envie o link");
    // Etapa 3
    const [dmSecondMessage, setDmSecondMessage] = (0, react_2.useState)("Obrigado por ter respondido segue o nosso link do produto");
    const [dmLink, setDmLink] = (0, react_2.useState)("https://witdev.com.br");
    const [dmButtonLabel, setDmButtonLabel] = (0, react_2.useState)("Segue Nosso Site");
    // ------------ Etapa 4: Outros recursos ------------
    // Switch: "Responder comentário publicamente"
    const [switchResponderComentario, setSwitchResponderComentario] = (0, react_2.useState)(false);
    // 3 frases de resposta pública
    const [publicReply1, setPublicReply1] = (0, react_2.useState)("Obrigado! ❤️ Por favor, veja DMs.");
    const [publicReply2, setPublicReply2] = (0, react_2.useState)("Te enviei uma mensagem ✅️  Verificar.");
    const [publicReply3, setPublicReply3] = (0, react_2.useState)("Que bom 👍 Verifica as tuas DMs.");
    // Checkboxes PRO
    const [checkboxPedirEmail, setCheckboxPedirEmail] = (0, react_2.useState)(false);
    const [checkboxPedirParaSeguir, setCheckboxPedirParaSeguir] = (0, react_2.useState)(false);
    const [checkboxEntrarEmContato, setCheckboxEntrarEmContato] = (0, react_2.useState)(false);
    // ------------ Preview ------------
    const [openDialog, setOpenDialog] = (0, react_2.useState)(false);
    const [toggleValue, setToggleValue] = (0, react_2.useState)("publicar");
    const [commentContent, setCommentContent] = (0, react_2.useState)("");
    // ------------ Access Token ------------
    const accessToken = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.instagramAccessToken;
    // ============ Carregar dados do Instagram ============
    (0, react_2.useEffect)(() => {
        const fetchInstagramData = async () => {
            if (status === "authenticated" && accessToken) {
                try {
                    // 1) Dados do usuário
                    const userRes = await fetch(`https://graph.instagram.com/me?fields=id,username,media_count,profile_picture_url&access_token=${accessToken}`);
                    if (!userRes.ok) {
                        const errorText = await userRes.text();
                        console.error("Erro ao buscar dados do Instagram (usuário):", errorText);
                        setError("Não foi possível obter os dados do Instagram do usuário.");
                        setLoading(false);
                        return;
                    }
                    const userData = await userRes.json();
                    setInstagramUser(userData);
                    // 2) Dados das mídias
                    const mediaRes = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_url,media_type,thumbnail_url,media_product_type,like_count,comments_count&access_token=${accessToken}`);
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
                }
                catch (err) {
                    console.error("Erro ao conectar-se à API do Instagram:", err);
                    setError("Erro ao conectar-se à API do Instagram.");
                    setLoading(false);
                }
            }
            else if (status === "authenticated") {
                // Usuário autenticado, mas sem accessToken
                setLoading(false);
            }
            else {
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
        return <LoadingState_1.default />;
    }
    if (status === "unauthenticated") {
        return <UnauthenticatedState_1.default />;
    }
    if (loading) {
        return <LoadingState_1.default />;
    }
    if (error) {
        return <ErrorState_1.default error={error}/>;
    }
    // ----------------------------------------------------------------------
    // 4) Lógica de validar e salvar (se precisar)
    // ----------------------------------------------------------------------
    function validarEtapas() {
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
            if (publicReply1.trim() === "" ||
                publicReply2.trim() === "" ||
                publicReply3.trim() === "") {
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
        if (!validarEtapas())
            return;
        try {
            // Montar as 3 respostas em um único campo (JSON)
            const publicReplyArray = [publicReply1, publicReply2, publicReply3];
            const publicReplyJson = switchResponderComentario ? JSON.stringify(publicReplyArray) : null;
            // Payload
            const payload = {
                // Etapa 1
                selectedMediaId: selectedOptionPostagem === "especifico" ? (selectedPost === null || selectedPost === void 0 ? void 0 : selectedPost.id) || null : null,
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
        }
        catch (error) {
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
    return (<div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            gap: "20px",
        }}>
      {/* ======================================================
            COLUNA ESQUERDA - FORMULÁRIO
        ======================================================= */}
      <div style={{
            flex: 1,
            borderRight: "1px solid #333",
            paddingRight: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
        {/* Etapa 1 */}
        <PostSelection_1.default selectedOptionPostagem={selectedOptionPostagem} setSelectedOptionPostagem={setSelectedOptionPostagem} selectedPost={selectedPost} setSelectedPost={setSelectedPost} ultimasPostagens={ultimasPostagens} instagramMedia={instagramMedia} openDialog={openDialog} setOpenDialog={setOpenDialog}/>

    <PalavraExpressaoSelection_1.default selectedOptionPalavra={selectedOptionPalavra} setSelectedOptionPalavra={handleSetSelectedOptionPalavra} inputPalavra={inputPalavra} setInputPalavra={(val) => {
            setInputPalavra(val);
            setCommentContent(val); // Passa a "palavra" para o preview de comentário
            if (val.trim() !== "") {
                setToggleValue("comentarios"); // Muda o preview para comentários
            }
            else {
                setToggleValue("publicar"); // Caso apague, volta a publicar
            }
        }}/>

        <separator_1.Separator className="my-4 w-full"/>

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
            <textarea_1.Textarea id="dmWelcomeMessage" className="mt-2" value={dmWelcomeMessage} onChange={(e) => setDmWelcomeMessage(e.target.value)} onFocus={() => setToggleValue("dm")}/>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmQuickReply">
              Quick Reply (ex.: "Me envie o link")
            </label>
            <input_1.Input id="dmQuickReply" className="mt-2" value={dmQuickReply} onChange={(e) => setDmQuickReply(e.target.value)} onFocus={() => setToggleValue("dm")}/>
          </div>
        </div>

        <separator_1.Separator className="my-4 w-full"/>

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
            <textarea_1.Textarea id="dmSecondMessage" className="mt-2" value={dmSecondMessage} onChange={(e) => setDmSecondMessage(e.target.value)} onFocus={() => setToggleValue("dm")}/>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmLink">
              Adicionar um link
            </label>
            <input_1.Input id="dmLink" className="mt-2" value={dmLink} onChange={(e) => setDmLink(e.target.value)} onFocus={() => setToggleValue("dm")}/>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmButtonLabel">
              Adicione legenda ao botão
            </label>
            <input_1.Input id="dmButtonLabel" className="mt-2" value={dmButtonLabel} onChange={(e) => setDmButtonLabel(e.target.value)} onFocus={() => setToggleValue("dm")}/>
          </div>
        </div>

        <separator_1.Separator className="my-4 w-full"/>

        {/* Etapa 4 */}
        <div style={{ width: "100%" }}>
          <h3 className="text-lg font-semibold">Etapa 4</h3>
          <p className="text-sm text-muted-foreground mb-4">
            (Outros recursos para automatizar)
          </p>

          <tooltip_1.TooltipProvider>
            <div className="flex items-center space-x-2 mb-2">
              <tooltip_1.Tooltip>
                <tooltip_1.TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <switch_1.Switch id="switchResponderComentario" checked={switchResponderComentario} onCheckedChange={(checked) => setSwitchResponderComentario(checked)}/>
                    <label_1.Label htmlFor="switchResponderComentario">
                      Responder ao comentário de forma pública
                    </label_1.Label>
                  </div>
                </tooltip_1.TooltipTrigger>
                <tooltip_1.TooltipContent>
                  <p>
                    Escolha 3 opções de respostas públicas que vamos mandar 1 delas aleatoriamente
                    em cada comentário 😊
                  </p>
                </tooltip_1.TooltipContent>
              </tooltip_1.Tooltip>
            </div>
          </tooltip_1.TooltipProvider>

          {switchResponderComentario && (<div className="space-y-2 mb-4 mt-2">
              <input_1.Input value={publicReply1} onChange={(e) => setPublicReply1(e.target.value)}/>
              <input_1.Input value={publicReply2} onChange={(e) => setPublicReply2(e.target.value)}/>
              <input_1.Input value={publicReply3} onChange={(e) => setPublicReply3(e.target.value)}/>
            </div>)}

          <div className="flex items-center space-x-2 mb-2">
            <checkbox_1.Checkbox id="checkboxPedirEmail" checked={checkboxPedirEmail} onCheckedChange={(checked) => setCheckboxPedirEmail(Boolean(checked))}/>
            <label htmlFor="checkboxPedirEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Pedir email <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <checkbox_1.Checkbox id="checkboxPedirParaSeguir" checked={checkboxPedirParaSeguir} onCheckedChange={(checked) => setCheckboxPedirParaSeguir(Boolean(checked))}/>
            <label htmlFor="checkboxPedirParaSeguir" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Pedir para seguir antes de enviar o link{" "}
              <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <checkbox_1.Checkbox id="checkboxEntrarEmContato" checked={checkboxEntrarEmContato} onCheckedChange={(checked) => setCheckboxEntrarEmContato(Boolean(checked))}/>
            <label htmlFor="checkboxEntrarEmContato" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Entrar em contato caso não cliquem no link
            </label>
          </div>
        </div>

        {/* Botão de Ativar */}
        <button_1.Button variant="outline" size="sm" onClick={handleAtivarAutomacao} style={{ marginTop: "20px" }}>
          Ativar
        </button_1.Button>
      </div>

      {/* ======================================================
            COLUNA DIREITA - PREVIEW E BOTÃO
        ======================================================= */}
      <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
        {/* Topo do preview */}
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center",
            marginBottom: "10px",
        }}>
          <span style={{ fontWeight: "bold", fontSize: "16px" }}>Preview</span>
          {/* O botão de ativar foi movido para a coluna esquerda */}
        </div>

        {/* Componente de Preview */}
        <PreviewPhoneMockup_1.default selectedPost={selectedPost} instagramUser={instagramUser} toggleValue={toggleValue} commentContent={commentContent} dmWelcomeMessage={dmWelcomeMessage} dmQuickReply={dmQuickReply} dmSecondMessage={dmSecondMessage} dmLink={dmLink} dmButtonLabel={dmButtonLabel} 
    // Props da etapa 4 (para exibir no preview de comentários)
    responderPublico={switchResponderComentario} publicReply1={publicReply1}/>

        {/* Toggle entre as ações do preview */}
        <ToggleActions_1.default toggleValue={toggleValue} setToggleValue={setToggleValue}/>
      </div>
    </div>);
}
