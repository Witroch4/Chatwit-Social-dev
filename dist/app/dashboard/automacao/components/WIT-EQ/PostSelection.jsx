"use strict";
// app/dashboard/automacao/components/WIT-EQ/PostSelection.tsx
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PostSelection;
const radio_group_1 = require("@/components/ui/radio-group");
const label_1 = require("@/components/ui/label");
const skeleton_1 = require("@/components/ui/skeleton");
const dialog_1 = require("@/components/ui/dialog");
const button_1 = require("@/components/ui/button");
function PostSelection({ selectedOptionPostagem, setSelectedOptionPostagem, selectedPost, setSelectedPost, ultimasPostagens, instagramMedia, openDialog, setOpenDialog, onSelectPost, disabled = false, // Valor padrão como false
className = "", }) {
    // Verifica se é Reels (ajuste se sua lógica for diferente)
    const isReel = (post) => {
        return post.media_type === "VIDEO" && post.media_product_type === "REELS";
    };
    // Ao selecionar um post específico
    const handleSelectPost = (post) => {
        if (disabled)
            return; // <<< BLOQUEIA A SELEÇÃO SE ESTIVER DESABILITADO
        setSelectedPost(post);
        setSelectedOptionPostagem("especifico");
        onSelectPost === null || onSelectPost === void 0 ? void 0 : onSelectPost(); // Usa optional chaining para evitar erro caso não exista
    };
    // Renderiza cards de posts (pequenos)
    const renderPostCard = (post) => (<div key={post.id} style={{
            width: "70px",
            height: "95px",
            border: (selectedPost === null || selectedPost === void 0 ? void 0 : selectedPost.id) === post.id ? "2px solid blue" : "1px solid #333",
            borderRadius: "5px",
            overflow: "hidden",
            cursor: disabled ? "not-allowed" : "pointer", // <<< ALTERAÇÃO DO CURSOR
            flexShrink: 0,
            position: "relative",
        }} onClick={() => handleSelectPost(post)}>
      {post.media_url ? (isReel(post) && post.thumbnail_url ? (<>
            <img src={post.thumbnail_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={post.caption || "Reels thumbnail"}/>
            {/* Indicador de Reels */}
            <div style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                padding: "2px 4px",
                borderRadius: "3px",
                fontSize: "10px",
            }}>
              Reels
            </div>
          </>) : (<img src={post.media_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={post.caption || "post"}/>)) : (<skeleton_1.Skeleton className="h-[95px] w-[70px] rounded"/>)}
    </div>);
    // Renderiza cards de posts dentro do Dialog (grid maior)
    const renderPostDialogCard = (post) => (<div key={post.id} style={{
            width: "205px",
            height: "265px",
            border: "1px solid #333",
            borderRadius: "5px",
            overflow: "hidden",
            cursor: disabled ? "not-allowed" : "pointer", // <<< ALTERAÇÃO DO CURSOR
            position: "relative",
        }} onClick={() => {
            if (disabled)
                return; // <<< BLOQUEIA A SELEÇÃO SE ESTIVER DESABILITADO
            setSelectedPost(post);
            setOpenDialog(false);
            setSelectedOptionPostagem("especifico");
            onSelectPost === null || onSelectPost === void 0 ? void 0 : onSelectPost(); // Atualiza o preview no pai
        }}>
      {post.media_url ? (isReel(post) && post.thumbnail_url ? (<>
            <img src={post.thumbnail_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={post.caption || "Reels thumbnail"}/>
            <div style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                padding: "2px 4px",
                borderRadius: "3px",
                fontSize: "12px",
            }}>
              Reel
            </div>
          </>) : (<img src={post.media_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={post.caption || "post"}/>)) : (<skeleton_1.Skeleton className="h-[265px] w-[205px] rounded"/>)}
    </div>);
    return (<div className={className} style={{ pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.6 : 1 }}>
      <h2 style={{ marginBottom: "10px" }}>Quando Alguém faz um Comentário</h2>
      <radio_group_1.RadioGroup value={selectedOptionPostagem} onValueChange={(v) => {
            if (disabled)
                return; // <<< BLOQUEIA A MUDANÇA SE ESTIVER DESABILITADO
            setSelectedOptionPostagem(v);
            if (v === "qualquer") {
                setSelectedPost(null);
                onSelectPost === null || onSelectPost === void 0 ? void 0 : onSelectPost();
            }
        }} style={{ marginBottom: "20px" }}>
        <div className="flex items-center space-x-2">
          <radio_group_1.RadioGroupItem value="especifico" id="especifico" disabled={disabled}/>
          <label_1.Label htmlFor="especifico">Uma Publicação ou Reels Específico</label_1.Label>
        </div>
        <div className="flex items-center space-x-2">
          <radio_group_1.RadioGroupItem value="qualquer" id="qualquer" disabled={disabled}/>
          <label_1.Label htmlFor="qualquer">Qualquer Publicação ou Reels</label_1.Label>
        </div>
      </radio_group_1.RadioGroup>

      {/* Se o usuário escolheu "específico", mostra algumas miniaturas e o botão de "Mostrar Todos" */}
      {selectedOptionPostagem === "especifico" && (<div style={{ marginBottom: "20px" }}>
          {ultimasPostagens.length > 0 ? (<div style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "10px",
                    overflowX: "auto",
                }}>
              {ultimasPostagens.map(renderPostCard)}
            </div>) : (<div className="flex gap-2">
              <skeleton_1.Skeleton className="h-[95px] w-[70px] rounded"/>
              <skeleton_1.Skeleton className="h-[95px] w-[70px] rounded"/>
              <skeleton_1.Skeleton className="h-[95px] w-[70px] rounded"/>
              <skeleton_1.Skeleton className="h-[95px] w-[70px] rounded"/>
            </div>)}

          {/* Botão "Mostrar Todos" abre o Dialog */}
          <dialog_1.Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <dialog_1.DialogTrigger asChild>
              <button style={{
                background: "transparent",
                border: "none",
                color: disabled ? "#aaa" : "#0af", // <<< COR P/ DESABILITADO
                textDecoration: disabled ? "none" : "underline",
                cursor: disabled ? "not-allowed" : "pointer",
                marginTop: "10px",
            }} disabled={disabled} // <<< DESABILITA O BOTÃO
        >
                Mostrar Todos
              </button>
            </dialog_1.DialogTrigger>
            <dialog_1.DialogContent className="sm:max-w-[730px] max-h-[730px] overflow-auto bg-background">
              <dialog_1.DialogHeader>
                <dialog_1.DialogTitle>Selecione Qualquer Publicação</dialog_1.DialogTitle>
                <dialog_1.DialogDescription>
                  Escolha uma publicação da lista abaixo.
                </dialog_1.DialogDescription>
              </dialog_1.DialogHeader>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(205px, 1fr))",
                gap: "10px",
                marginTop: "20px",
            }}>
                {instagramMedia.length > 0
                ? instagramMedia.map(renderPostDialogCard)
                : Array.from({ length: 9 }).map((_, i) => (<skeleton_1.Skeleton key={i} className="h-[265px] w-[205px] rounded"/>))}
              </div>

              <dialog_1.DialogFooter className="sm:justify-start">
                <dialog_1.DialogClose asChild>
                  <button_1.Button type="button" variant="secondary" disabled={disabled}>
                    Fechar
                  </button_1.Button>
                </dialog_1.DialogClose>
              </dialog_1.DialogFooter>
            </dialog_1.DialogContent>
          </dialog_1.Dialog>
        </div>)}
    </div>);
}
