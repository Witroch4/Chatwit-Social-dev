// app/dashboard/automação/components/CommentsDrawer.tsx

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { InstagramUserData } from "../page";

interface CommentsDrawerProps {
  open: boolean; // Controla se o Drawer deve ser exibido ou não
  commentContent: string; // Conteúdo digitado na caixa de "Palavra ou Expressão"
  instagramUser: InstagramUserData | null;
}

export default function CommentsDrawer({
  open,
  commentContent,
  instagramUser,
}: CommentsDrawerProps) {
  // Se "open" for false, retorna null (drawer oculto)
  if (!open) return null;

  // Lista de emojis específicos
  const emojis = ["❤️", "😍", "🔥", "👍", "🙏", "🎉", "🤔", "😎"];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "75%", // Drawer ocupando 75% da tela
        backgroundColor: "#262626",
        zIndex: 9999, // Ficar acima de tudo no Mockup
        display: "flex",
        flexDirection: "column",
        borderTopLeftRadius: "12px",
        borderTopRightRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Grabber (aquele tracinho cinza no topo) */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
        <svg width="37" height="5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x=".5" y=".5" width="36" height="4" rx="2" fill="#A8A8A8" />
        </svg>
      </div>

      {/* Header do Drawer */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #363636",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#FAFAFA", fontWeight: 600 }}>Comentários</span>
        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M2.324 5.095C1.64 4.338 2.1 3 3.244 3H21a1 1 0 0 1 .872 1.488l-8.877 15.874c-.55.982-1.97.782-2.277-.257l-2.513-8.507-5.88-6.503Zm7.954 6.462 1.85 6.259 6.176-11.044-8.026 4.785ZM17.37 5H4.935l4.356 4.818L17.371 5Z"
            fill="#FAFAFA"
          />
        </svg>
      </div>

      {/* Corpo do Drawer (lista de comentários) */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Exemplo de um comentário — se não houver palavra/expressão, podemos ocultar ou exibir um placeholder */}
        {commentContent ? (
          <div style={{ display: "flex", flexDirection: "row", gap: "8px", alignItems: "flex-start" }}>
            {/* Foto do usuário que fez o comentário */}
            {instagramUser?.profile_picture_url ? (
              <img
                src={instagramUser.profile_picture_url}
                alt="Foto de Perfil"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <Skeleton className="h-8 w-8 rounded-full" />
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minWidth: 0, // Importante para evitar overflow em flex containers
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "nowrap" }}>
                <span style={{ color: "#FAFAFA", fontWeight: 600, whiteSpace: "nowrap" }}>Usuário</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", whiteSpace: "nowrap" }}>
                  Agora
                </span>
              </div>

              {/* Mensagem digitada (sem quebra de linha) */}
              <span
                style={{
                  color: "#FAFAFA",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {commentContent}
              </span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginTop: "4px",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Responder</span>
              </div>
            </div>

            {/* Like Gray Icon */}
            <div style={{ alignSelf: "center" }}>
              <svg
                width="16"
                height="16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ cursor: "pointer" }}
              >
                <path
                  d="M7.97 12.898c-.13 0-.26-.03-.38-.12-1.48-1.08-3.01-2.26-4.14-3.89-.4-.57-.93-1.45-.95-2.57-.03-1.34.73-2.57 1.89-3.07s2.55-.21 3.52.75l.09.08.17-.17c1.1-1 2.61-1.19 3.78-.49 1.21.73 1.8 2.23 1.45 3.65-.31 1.26-1.09 2.22-1.8 3-.98 1.07-2.14 1.95-3.14 2.67-.11.08-.29.15-.48.15l-.01.01Zm-2.4-8.89c-.27 0-.53.05-.78.16-.79.34-1.31 1.2-1.29 2.13.01.65.25 1.28.77 2.02 1 1.44 2.38 2.53 3.73 3.52.97-.71 1.98-1.49 2.86-2.45.66-.72 1.31-1.52 1.57-2.56.25-1-.16-2.05-.99-2.55-.79-.48-1.81-.33-2.59.38-.11.1-.2.2-.3.31l-.51.54-.81-.79c-.47-.46-1.07-.71-1.65-.71h-.01Z"
                  fill="#A8A8A8"
                />
              </svg>
            </div>
          </div>
        ) : (
          <span style={{ color: "#999", fontSize: "14px" }}>Nenhum comentário ainda...</span>
        )}
      </div>

      {/* Barra de Emojis Acima do Campo de Digitação */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #363636",
          backgroundColor: "#1f1f1f",
          overflow: "hidden", // Remove a possibilidade de rolagem horizontal
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            flexWrap: "nowrap", // Impede quebra de linha
            maxWidth: "100%", // Garante que a barra de emojis não exceda a largura
          }}
        >
          {emojis.map((emoji, index) => (
            <span
              key={index}
              style={{
                fontSize: "20px",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLSpanElement).style.transform = "scale(1.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLSpanElement).style.transform = "scale(1)";
              }}
              aria-label={`Emoji ${emoji}`}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Footer do Drawer: barra de digitação */}
      <div
        style={{
          borderTop: "1px solid #363636",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Imagem de perfil do usuário principal (dono da conta, por exemplo) */}
        {instagramUser?.profile_picture_url ? (
          <img
            src={instagramUser.profile_picture_url}
            alt="Perfil"
            style={{
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              objectFit: "cover",
            }}
          />
        ) : (
          <Skeleton className="h-6 w-6 rounded-full" />
        )}

        {/* Input: "Insira um comentário..." */}
        <div
          style={{
            flex: 1,
            color: "#A8A8A8",
            fontSize: "14px",
            padding: "8px 12px",
            backgroundColor: "#3a3a3a",
            borderRadius: "20px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Insira um comentário para o usuário...
        </div>
      </div>
    </div>
  );
}
