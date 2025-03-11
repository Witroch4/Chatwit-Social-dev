"use strict";
// app/dashboard/automacao/guiado-facil/[id]/page.tsx
"use client";
// app/dashboard/automacao/guiado-facil/[id]/page.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GuiadoFacilEditPage;
const navigation_1 = require("next/navigation");
const react_1 = require("next-auth/react");
const react_2 = require("react");
// Imports de componentes que você já usa
const LoadingState_1 = __importDefault(require("../../components/WIT-EQ/LoadingState"));
const UnauthenticatedState_1 = __importDefault(require("../../components/WIT-EQ/UnauthenticatedState"));
const ErrorState_1 = __importDefault(require("../../components/WIT-EQ/ErrorState"));
const PostSelection_1 = __importDefault(require("../../components/WIT-EQ/PostSelection"));
const PalavraExpressaoSelection_1 = __importDefault(require("../../components/WIT-EQ/PalavraExpressaoSelection"));
const PreviewPhoneMockup_1 = __importDefault(require("../../components/PreviewPhoneMockup"));
const ToggleActions_1 = __importDefault(require("../../components/WIT-EQ/ToggleActions"));
const use_toast_1 = require("../../../../../hooks/use-toast");
const checkbox_1 = require("../../../../../components/ui/checkbox");
const switch_1 = require("../../../../../components/ui/switch");
const label_1 = require("../../../../../components/ui/label");
const input_1 = require("../../../../../components/ui/input");
const textarea_1 = require("../../../../../components/ui/textarea");
const button_1 = require("../../../../../components/ui/button");
const separator_1 = require("../../../../../components/ui/separator");
const tooltip_1 = require("../../../../../components/ui/tooltip");
function GuiadoFacilEditPage() {
    var _a;
    const { id } = (0, navigation_1.useParams)();
    const { data: session, status } = (0, react_1.useSession)();
    const { toast } = (0, use_toast_1.useToast)();
    // ========== NOVO: Estado de edição ou bloqueado ==========
    const [isEditing, setIsEditing] = (0, react_2.useState)(false);
    // Estados de loading e erro para carregamento da automação
    const [loadingAuto, setLoadingAuto] = (0, react_2.useState)(true);
    const [autoError, setAutoError] = (0, react_2.useState)(null);
    // ========== Estados do seu formulário (passo 1, 2, 3, 4 etc.) ==========
    const [instagramUser, setInstagramUser] = (0, react_2.useState)(null);
    const [instagramMedia, setInstagramMedia] = (0, react_2.useState)([]);
    const [loading, setLoading] = (0, react_2.useState)(true);
    const [error, setError] = (0, react_2.useState)(null);
    // Etapa 1: Seleção de Post
    const [selectedOptionPostagem, setSelectedOptionPostagem] = (0, react_2.useState)("especifico");
    const [selectedPost, setSelectedPost] = (0, react_2.useState)(null);
    // Novo: Guardar o selectedMediaId que veio do BD,
    // para podermos tentar associar com instagramMedia quando ele carregar
    const [selectedMediaIdLocal, setSelectedMediaIdLocal] = (0, react_2.useState)(null);
    // Etapa 1: Palavra/Expressão
    const [selectedOptionPalavra, setSelectedOptionPalavra] = (0, react_2.useState)("qualquer");
    const [inputPalavra, setInputPalavra] = (0, react_2.useState)("");
    // Etapa 2
    const [dmWelcomeMessage, setDmWelcomeMessage] = (0, react_2.useState)("");
    const [dmQuickReply, setDmQuickReply] = (0, react_2.useState)("");
    // Crie uma função wrapper para ajustar o tipo esperado
    const handleSetSelectedOptionPalavra = (val) => {
        setSelectedOptionPalavra(val);
    };
    // Etapa 3
    const [dmSecondMessage, setDmSecondMessage] = (0, react_2.useState)("");
    const [dmLink, setDmLink] = (0, react_2.useState)("");
    const [dmButtonLabel, setDmButtonLabel] = (0, react_2.useState)("");
    // Etapa 4
    const [switchResponderComentario, setSwitchResponderComentario] = (0, react_2.useState)(false);
    const [publicReply1, setPublicReply1] = (0, react_2.useState)("");
    const [publicReply2, setPublicReply2] = (0, react_2.useState)("");
    const [publicReply3, setPublicReply3] = (0, react_2.useState)("");
    // Checkboxes PRO
    const [checkboxPedirEmail, setCheckboxPedirEmail] = (0, react_2.useState)(false);
    const [checkboxPedirParaSeguir, setCheckboxPedirParaSeguir] = (0, react_2.useState)(false);
    const [checkboxEntrarEmContato, setCheckboxEntrarEmContato] = (0, react_2.useState)(false);
    // Novo: Estado para controlar o live
    const [isLive, setIsLive] = (0, react_2.useState)(true);
    // Preview
    const [openDialog, setOpenDialog] = (0, react_2.useState)(false);
    const [toggleValue, setToggleValue] = (0, react_2.useState)("publicar");
    const [commentContent, setCommentContent] = (0, react_2.useState)("");
    // Access Token
    const accessToken = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.instagramAccessToken;
    // ----------------------------------------------------------------------
    // 1) Carrega a automação do BD pelo ID
    // ----------------------------------------------------------------------
    (0, react_2.useEffect)(() => {
        var _a;
        if (!id)
            return;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return;
        async function fetchAutomacao() {
            try {
                setLoadingAuto(true);
                setAutoError(null);
                const res = await fetch(`/api/automacao/${id}`, {
                    method: "GET",
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Falha ao buscar automação");
                }
                const data = (await res.json());
                // Preenche os estados do formulário
                setSelectedOptionPostagem(data.anyMediaSelected ? "qualquer" : "especifico");
                // Guardar no estado local
                setSelectedMediaIdLocal(data.selectedMediaId);
                setSelectedOptionPalavra(data.selectedOptionPalavra);
                setInputPalavra(data.palavrasChave || "");
                setDmWelcomeMessage(data.fraseBoasVindas || "");
                setDmQuickReply(data.quickReplyTexto || "");
                setDmSecondMessage(data.mensagemEtapa3 || "");
                setDmLink(data.linkEtapa3 || "");
                setDmButtonLabel(data.legendaBotaoEtapa3 || "");
                setSwitchResponderComentario(data.responderPublico);
                if (data.publicReply) {
                    try {
                        const arr = JSON.parse(data.publicReply);
                        setPublicReply1(arr[0] || "");
                        setPublicReply2(arr[1] || "");
                        setPublicReply3(arr[2] || "");
                    }
                    catch (_a) { }
                }
                setCheckboxPedirEmail(data.pedirEmailPro);
                setCheckboxPedirParaSeguir(data.pedirParaSeguirPro);
                setCheckboxEntrarEmContato(data.contatoSemClique);
                // Definir o estado de live conforme o que veio do banco
                setIsLive(data.live);
            }
            catch (err) {
                setAutoError(err.message);
            }
            finally {
                setLoadingAuto(false);
            }
        }
        fetchAutomacao();
    }, [id, session]);
    // ----------------------------------------------------------------------
    // 2) Carrega dados do Instagram (se necessário)
    // ----------------------------------------------------------------------
    (0, react_2.useEffect)(() => {
        const fetchInstagramData = async () => {
            setLoading(true);
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
    // [NOVO] 2.1) Quando já temos "instagramMedia" e "selectedMediaIdLocal"
    // -------------------------------------------------------------
    (0, react_2.useEffect)(() => {
        if (!selectedMediaIdLocal)
            return;
        if (selectedOptionPostagem !== "especifico")
            return;
        if (instagramMedia.length === 0)
            return;
        // Tenta achar a mídia correspondente
        const found = instagramMedia.find((m) => m.id === selectedMediaIdLocal);
        if (found) {
            setSelectedPost(found);
        }
        else {
            // Se não achar, você pode forçar "qualquer"
            // ou deixar como "específico" sem post (vazio)
            console.warn("Mídia salva no BD não encontrada nas últimas do Instagram.");
        }
    }, [selectedMediaIdLocal, selectedOptionPostagem, instagramMedia]);
    // ----------------------------------------------------------------------
    // 3) Exibir estados de carregamento e erro
    // ----------------------------------------------------------------------
    if (status === "loading") {
        return <LoadingState_1.default />;
    }
    if (status === "unauthenticated") {
        return <UnauthenticatedState_1.default />;
    }
    if (loadingAuto) {
        return <LoadingState_1.default />;
    }
    if (autoError) {
        return <ErrorState_1.default error={autoError}/>;
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
    async function handleAtivarAutomacao() {
        if (!validarEtapas())
            return;
        try {
            const publicReplyArray = [publicReply1, publicReply2, publicReply3];
            const publicReplyJson = switchResponderComentario ? JSON.stringify(publicReplyArray) : null;
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
                // Novo: Incluir o estado de live
                live: isLive,
            };
            const res = await fetch(`/api/automacao/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updateAll",
                    data: payload,
                }),
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
    // Controlar botões Editar/Pausar & Cancelar/Salvar
    async function handleClickEdit() {
        if (isEditing) {
            // Cancelar
            setIsEditing(false);
        }
        else {
            // Editar
            setIsEditing(true);
        }
    }
    async function handleClickPauseOrSalvar() {
        if (isEditing) {
            // Modo edição => Salvar
            await handleAtivarAutomacao();
            setIsEditing(false);
        }
        else {
            // Modo bloqueado => Pausar ou Ativar
            try {
                // Inverter o estado de live
                const newLiveStatus = !isLive;
                const payload = {
                    live: newLiveStatus,
                };
                const res = await fetch(`/api/automacao/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "updateAll",
                        data: payload,
                    }),
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Erro ao atualizar status da automação.");
                }
                // Atualizar o estado local
                setIsLive(newLiveStatus);
                toast({
                    title: "Sucesso",
                    description: `Automação ${newLiveStatus ? "ativada" : "pausada"} com sucesso!`,
                    variant: "default",
                });
            }
            catch (error) {
                console.error("Erro ao atualizar status da automação:", error.message);
                toast({
                    title: "Falha",
                    description: "Falha ao atualizar status da automação: " + error.message,
                    variant: "destructive",
                });
            }
        }
    }
    const editButtonLabel = isEditing ? "Cancelar" : "Editar";
    const pauseButtonLabel = isEditing ? "Salvar" : isLive ? "Pausar" : "Ativar";
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
        <PostSelection_1.default selectedOptionPostagem={selectedOptionPostagem} setSelectedOptionPostagem={setSelectedOptionPostagem} selectedPost={selectedPost} setSelectedPost={setSelectedPost} ultimasPostagens={ultimasPostagens} instagramMedia={instagramMedia} openDialog={openDialog} setOpenDialog={setOpenDialog} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""} onSelectPost={() => {
            // Selecione manualmente um post
            if (selectedPost) {
                setCommentContent(selectedPost.caption || "");
            }
        }}/>

    <PalavraExpressaoSelection_1.default selectedOptionPalavra={selectedOptionPalavra} setSelectedOptionPalavra={handleSetSelectedOptionPalavra} inputPalavra={inputPalavra} setInputPalavra={setInputPalavra} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""}/>

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
            <textarea_1.Textarea id="dmWelcomeMessage" className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`} value={dmWelcomeMessage} onChange={(e) => setDmWelcomeMessage(e.target.value)} onFocus={() => setToggleValue("dm")} readOnly={!isEditing}/>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmQuickReply">
              Quick Reply (ex.: "Me envie o link")
            </label>
            <input_1.Input id="dmQuickReply" className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`} value={dmQuickReply} onChange={(e) => setDmQuickReply(e.target.value)} onFocus={() => setToggleValue("dm")} disabled={!isEditing}/>
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
            <textarea_1.Textarea id="dmSecondMessage" className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`} value={dmSecondMessage} onChange={(e) => setDmSecondMessage(e.target.value)} onFocus={() => setToggleValue("dm")} readOnly={!isEditing}/>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmLink">
              Adicionar um link
            </label>
            <input_1.Input id="dmLink" className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`} value={dmLink} onChange={(e) => setDmLink(e.target.value)} onFocus={() => setToggleValue("dm")} disabled={!isEditing}/>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="dmButtonLabel">
              Adicione legenda ao botão
            </label>
            <input_1.Input id="dmButtonLabel" className={`mt-2 ${!isEditing ? "cursor-not-allowed" : ""}`} value={dmButtonLabel} onChange={(e) => setDmButtonLabel(e.target.value)} onFocus={() => setToggleValue("dm")} disabled={!isEditing}/>
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
                    <switch_1.Switch id="switchResponderComentario" checked={switchResponderComentario} onCheckedChange={(checked) => setSwitchResponderComentario(checked)} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""}/>
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
              <input_1.Input value={publicReply1} onChange={(e) => setPublicReply1(e.target.value)} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""} placeholder="Resposta Pública 1"/>
              <input_1.Input value={publicReply2} onChange={(e) => setPublicReply2(e.target.value)} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""} placeholder="Resposta Pública 2"/>
              <input_1.Input value={publicReply3} onChange={(e) => setPublicReply3(e.target.value)} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""} placeholder="Resposta Pública 3"/>
            </div>)}

          <div className="flex items-center space-x-2 mb-2">
            <checkbox_1.Checkbox id="checkboxPedirEmail" checked={checkboxPedirEmail} onCheckedChange={(checked) => setCheckboxPedirEmail(Boolean(checked))} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""}/>
            <label htmlFor="checkboxPedirEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Pedir email <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <checkbox_1.Checkbox id="checkboxPedirParaSeguir" checked={checkboxPedirParaSeguir} onCheckedChange={(checked) => setCheckboxPedirParaSeguir(Boolean(checked))} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""}/>
            <label htmlFor="checkboxPedirParaSeguir" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Pedir para seguir antes de enviar o link{" "}
              <span className="text-xs text-muted-foreground">PRO</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <checkbox_1.Checkbox id="checkboxEntrarEmContato" checked={checkboxEntrarEmContato} onCheckedChange={(checked) => setCheckboxEntrarEmContato(Boolean(checked))} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""}/>
            <label htmlFor="checkboxEntrarEmContato" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
              Entrar em contato caso não cliquem no link
            </label>
          </div>

          {/* Novo: Switch para controlar o live */}
          <div className="flex items-center space-x-2 mb-4 mt-4">
            <switch_1.Switch id="switchLive" checked={isLive} onCheckedChange={(checked) => setIsLive(checked)} disabled={!isEditing} className={!isEditing ? "cursor-not-allowed" : ""}/>
            <label_1.Label htmlFor="switchLive">
              {isLive ? "Automação Ativa" : "Automação Pausada"}
            </label_1.Label>
          </div>
        </div>

        {/* Botões Editar/Pausar ou Cancelar/Salvar */}
        <div style={{ marginTop: "20px", width: "100%" }}>
          <button_1.Button variant="outline" size="sm" onClick={handleClickEdit} style={{ marginRight: "10px" }}>
            {editButtonLabel}
          </button_1.Button>

          <button_1.Button variant="outline" size="sm" onClick={handleClickPauseOrSalvar}>
            {pauseButtonLabel}
          </button_1.Button>
        </div>
      </div>

      {/* ======================================================
            COLUNA DIREITA - PREVIEW E BOTÕES SUPERIORES
        ======================================================= */}
      <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
        {/* Título do Preview */}
        <div style={{ width: "100%", marginBottom: "10px" }}>
          <span style={{ fontWeight: "bold", fontSize: "16px" }}>Preview</span>
        </div>

        {/* Componente de Preview */}
        <PreviewPhoneMockup_1.default selectedPost={selectedPost} instagramUser={instagramUser} toggleValue={toggleValue} commentContent={commentContent} dmWelcomeMessage={dmWelcomeMessage} dmQuickReply={dmQuickReply} dmSecondMessage={dmSecondMessage} dmLink={dmLink} dmButtonLabel={dmButtonLabel} responderPublico={switchResponderComentario} publicReply1={publicReply1}/>

        {/* Toggle entre as ações do preview */}
        <ToggleActions_1.default toggleValue={toggleValue} setToggleValue={setToggleValue}/>
      </div>
    </div>);
}
