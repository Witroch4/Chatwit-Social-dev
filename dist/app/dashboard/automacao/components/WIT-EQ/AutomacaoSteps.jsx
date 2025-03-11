"use strict";
// app/dashboard/automacao/components/WIT-EQ/AutomacaoSteps.tsx
"use client";
// app/dashboard/automacao/components/WIT-EQ/AutomacaoSteps.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AutomacaoSteps;
const react_1 = require("react");
const button_1 = require("../../../../../components/ui/button");
const PreviewPhoneMockup_1 = __importDefault(require("../PreviewPhoneMockup"));
function AutomacaoSteps({ instagramUser, selectedPost, }) {
    // Controla a etapa atual
    const [step, setStep] = (0, react_1.useState)(1);
    // Estado para definir se uma postagem específica foi selecionada ou se é "qualquer"
    const [selectedOptionPostagem, setSelectedOptionPostagem] = (0, react_1.useState)("especifico");
    // --------------- ETAPA 1 --------------- //
    const [selectedOptionPalavra, setSelectedOptionPalavra] = (0, react_1.useState)("especifica");
    const [palavrasChave, setPalavrasChave] = (0, react_1.useState)("");
    // --------------- ETAPA 2 --------------- //
    const [bemVindoTitulo] = (0, react_1.useState)("Inicialmente, eles receberão uma DM de boas-vindas");
    const [bemVindoSubtitulo] = (0, react_1.useState)("Primeiro, é enviada a DM de abertura, seguida pela mensagem com o link.");
    // Frase de boas-vindas que aparece no preview
    const [fraseBoasVindas, setFraseBoasVindas] = (0, react_1.useState)("Olá! Eu estou muito feliz que você está aqui, muito obrigado pelo seu interesse 😊\n\nClique abaixo e eu vou te mandar o link em um segundo ✨");
    // Texto do quick reply, p. ex.: "Me envie o link"
    const [quickReplyTexto, setQuickReplyTexto] = (0, react_1.useState)("Me envie o link");
    // --------------- ETAPA 3 --------------- //
    const [tituloEtapa3] = (0, react_1.useState)("Logo depois, a DM com o link será enviada");
    // Mensagem + link + legenda do botão
    const [mensagemEtapa3, setMensagemEtapa3] = (0, react_1.useState)("Obrigado por ter respondido segue o nosso link do produto");
    const [linkEtapa3, setLinkEtapa3] = (0, react_1.useState)("https://witdev.com.br");
    const [legendaBotaoEtapa3, setLegendaBotaoEtapa3] = (0, react_1.useState)("Segue Nosso Site");
    // --------------- ETAPA 4 --------------- //
    const [outrosRecursos, setOutrosRecursos] = (0, react_1.useState)({
        responderPublico: false,
        pedirEmailPro: false,
        pedirParaSeguirPro: false,
        contatoSemClique: false,
    });
    // --------------------------------------------
    // FUNÇÃO PRINCIPAL PARA SALVAR AUTOMACAO
    // --------------------------------------------
    async function salvarAutomacao() {
        try {
            // 1) Montar o objeto payload
            const payload = {
                // Mídia selecionada ou "qualquer"
                selectedMediaId: (selectedPost === null || selectedPost === void 0 ? void 0 : selectedPost.id) || null,
                anyMediaSelected: selectedOptionPostagem === "qualquer",
                // Palavras
                selectedOptionPalavra, // "especifica" ou "qualquer"
                palavrasChave, // ex.: "Preço, Link, Comprar"
                // DM de boas-vindas
                fraseBoasVindas,
                quickReplyTexto,
                // DM com link
                mensagemEtapa3,
                linkEtapa3,
                legendaBotaoEtapa3,
                // Outros recursos (checkboxes)
                responderPublico: outrosRecursos.responderPublico,
                pedirEmailPro: outrosRecursos.pedirEmailPro,
                pedirParaSeguirPro: outrosRecursos.pedirParaSeguirPro,
                contatoSemClique: outrosRecursos.contatoSemClique,
            };
            // 2) Enviar para a rota /api/automacao
            const res = await fetch("/api/automacao", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            // 3) Verificar se deu erro
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Erro ao salvar automação.");
            }
            // 4) Se deu certo, mostrar resultado
            const data = await res.json();
            console.log("Automação salva com sucesso:", data);
            alert("Automação configurada e salva!");
        }
        catch (error) {
            console.error("Erro ao salvar automação:", error.message);
            alert("Falha ao salvar automação: " + error.message);
        }
    }
    // Exemplo de estado para controlar qual aba do preview está ativa
    const [toggleValue, setToggleValue] = (0, react_1.useState)("dm");
    const [commentContent, setCommentContent] = (0, react_1.useState)("");
    // --------------- FUNÇÕES DE VALIDAÇÃO --------------- //
    const canGoNextStep = () => {
        switch (step) {
            case 1:
                // Verificar se Etapa 1 está preenchida
                if (selectedOptionPalavra === "especifica") {
                    return palavrasChave.trim().length > 0;
                }
                // Se "qualquer" está selecionado, pode prosseguir
                return true;
            case 2:
                // Verificar se Etapa 2 está preenchida
                return fraseBoasVindas.trim().length > 0 && quickReplyTexto.trim().length > 0;
            case 3:
                // Verificar se Etapa 3 está preenchida
                return (mensagemEtapa3.trim().length > 0 &&
                    linkEtapa3.trim().length > 0 &&
                    legendaBotaoEtapa3.trim().length > 0);
            case 4:
                // Na Etapa 4, permite prosseguir livremente
                return true;
            default:
                return true;
        }
    };
    const handleNext = () => {
        if (canGoNextStep()) {
            setStep((prev) => prev + 1);
        }
        else {
            alert("Preencha todos os campos obrigatórios antes de prosseguir!");
        }
    };
    const handleFinalizar = () => {
        // Aqui você pode enviar os dados para uma API ou realizar outras ações necessárias
        alert("Automação finalizada!");
    };
    const handleCheckboxChange = (field) => {
        setOutrosRecursos((prev) => (Object.assign(Object.assign({}, prev), { [field]: !prev[field] })));
    };
    // --------------- RENDERIZAÇÃO DAS ETAPAS --------------- //
    const renderStep1 = () => {
        return (<div style={{ padding: 16, border: "1px solid #444", borderRadius: 8, marginBottom: 16 }}>
        <h2>Etapa 1</h2>
        <p>E esse comentário possui:</p>

        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="radio" name="palavraOuQualquer" value="especifica" checked={selectedOptionPalavra === "especifica"} onChange={() => setSelectedOptionPalavra("especifica")}/>
          &nbsp; Uma palavra ou expressão específica
        </label>

        {selectedOptionPalavra === "especifica" && (<div style={{ marginLeft: 24, marginBottom: 8 }}>
            <p>Use vírgulas para separar as palavras (por exemplo: Preço, Link, Comprar)</p>
            <input type="text" placeholder="Digite suas palavras-chave separadas por vírgula" value={palavrasChave} onChange={(e) => setPalavrasChave(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #ccc" }}/>
          </div>)}

        <label style={{ display: "block", marginTop: 8 }}>
          <input type="radio" name="palavraOuQualquer" value="qualquer" checked={selectedOptionPalavra === "qualquer"} onChange={() => setSelectedOptionPalavra("qualquer")}/>
          &nbsp; Qualquer palavra
        </label>
      </div>);
    };
    const renderStep2 = () => {
        return (<div style={{ padding: 16, border: "1px solid #444", borderRadius: 8, marginBottom: 16 }}>
        <h2>Etapa 2</h2>
        <h3>{bemVindoTitulo}</h3>
        <p>{bemVindoSubtitulo}</p>

        <label style={{ display: "block", margin: "12px 0 4px" }}>
          Frase de boas-vindas
        </label>
        <textarea rows={4} value={fraseBoasVindas} onChange={(e) => setFraseBoasVindas(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #ccc" }}/>

        <label style={{ display: "block", margin: "12px 0 4px" }}>
          Quick Reply (ex.: "Me envie o link")
        </label>
        <input type="text" value={quickReplyTexto} onChange={(e) => setQuickReplyTexto(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #ccc" }}/>
      </div>);
    };
    const renderStep3 = () => {
        return (<div style={{ padding: 16, border: "1px solid #444", borderRadius: 8, marginBottom: 16 }}>
        <h2>Etapa 3</h2>
        <h3>{tituloEtapa3}</h3>

        <label style={{ display: "block", margin: "12px 0 4px" }}>Escreva uma mensagem</label>
        <textarea rows={3} style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #ccc" }} placeholder="Exemplo: Obrigado por ter respondido, segue o nosso link do produto" value={mensagemEtapa3} onChange={(e) => setMensagemEtapa3(e.target.value)}/>

        <label style={{ display: "block", margin: "12px 0 4px" }}>Adicionar um link</label>
        <input type="url" style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #ccc" }} placeholder="Exemplo: https://witdev.com.br" value={linkEtapa3} onChange={(e) => setLinkEtapa3(e.target.value)}/>

        <label style={{ display: "block", margin: "12px 0 4px" }}>
          Adicione legenda ao botão (exemplo: Nosso Produto)
        </label>
        <input type="text" style={{ width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #ccc" }} placeholder="Exemplo: Segue Nosso Site" value={legendaBotaoEtapa3} onChange={(e) => setLegendaBotaoEtapa3(e.target.value)}/>
      </div>);
    };
    const renderStep4 = () => {
        return (<div style={{ padding: 16, border: "1px solid #444", borderRadius: 8, marginBottom: 16 }}>
        <h2>Etapa 4</h2>
        <p>Outros recursos para automatizar:</p>

        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={outrosRecursos.responderPublico} onChange={() => handleCheckboxChange("responderPublico")}/>
          &nbsp; Responder ao comentário de forma pública
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={outrosRecursos.pedirEmailPro} onChange={() => handleCheckboxChange("pedirEmailPro")}/>
          &nbsp; Pedir email <strong>(PRO)</strong>
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={outrosRecursos.pedirParaSeguirPro} onChange={() => handleCheckboxChange("pedirParaSeguirPro")}/>
          &nbsp; Pedir para seguir antes de enviar o link <strong>(PRO)</strong>
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={outrosRecursos.contatoSemClique} onChange={() => handleCheckboxChange("contatoSemClique")}/>
          &nbsp; Entrar em contato caso não cliquem no link
        </label>
      </div>);
    };
    // --------------- RENDERIZAÇÃO ATUAL --------------- //
    const renderCurrentStep = () => {
        switch (step) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            case 4:
                return renderStep4();
            default:
                return (<div style={{ textAlign: "center", padding: 16 }}>
            <h2>Formulário concluído!</h2>
            <p>Suas automações foram configuradas com sucesso.</p>
          </div>);
        }
    };
    // --------------- FUNÇÃO PARA OBTER O CONTEÚDO DO COMMENT --------------- //
    const getCommentContent = () => {
        // Dependendo da seleção na Etapa 1, retornar palavras-chave ou "qualquer"
        if (selectedOptionPalavra === "especifica") {
            return palavrasChave;
        }
        else {
            return "qualquer";
        }
    };
    return (<div style={{ display: "flex", gap: 20 }}>
      {/* COLUNA ESQUERDA: FORMULÁRIO DE VÁRIAS ETAPAS */}
      <div style={{ flex: 1 }}>
        {renderCurrentStep()}

        {/* Botão de próximo (ou de finalização, se step > 4) */}
        {step <= 4 ? (<button_1.Button variant="outline" onClick={handleNext} style={{ marginTop: 8 }}>
            Próximo
          </button_1.Button>) : (<button_1.Button variant="default" onClick={handleFinalizar} style={{ marginTop: 8 }}>
            Concluir
          </button_1.Button>)}
      </div>

      {/* COLUNA DIREITA: PREVIEW */}
      <div style={{ flex: 1, position: "relative" }}>
        <h3 style={{ marginBottom: 10 }}>Preview (Simulação)</h3>
        <PreviewPhoneMockup_1.default selectedPost={selectedPost} instagramUser={instagramUser} toggleValue={toggleValue} commentContent={commentContent} dmWelcomeMessage={fraseBoasVindas} dmQuickReply={quickReplyTexto} dmSecondMessage={mensagemEtapa3} dmLink={linkEtapa3} dmButtonLabel={legendaBotaoEtapa3}/>

        {/* Botões para alternar manualmente o toggleValue */}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button_1.Button variant="outline" onClick={() => setToggleValue("publicar")}>
            Publicar
          </button_1.Button>
          <button_1.Button variant="outline" onClick={() => setToggleValue("comentarios")}>
            Comentários
          </button_1.Button>
          <button_1.Button variant="outline" onClick={() => setToggleValue("dm")}>
            DM
          </button_1.Button>
        </div>
      </div>
    </div>);
}
