// app/dashboard/automação/page.tsx

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import LoadingState from "./components/LoadingState";
import UnauthenticatedState from "./components/UnauthenticatedState";
import ErrorState from "./components/ErrorState";
import PostSelection from "./components/PostSelection";
import PalavraExpressaoSelection from "./components/PalavraExpressaoSelection";
import PreviewPhoneMockup from "./components/PreviewPhoneMockup";
import ToggleActions from "./components/ToggleActions";

import CommentsDrawer from "./components/CommentsDrawer"; // Certifique-se de que o caminho está correto

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

  const [selectedOptionPostagem, setSelectedOptionPostagem] = useState("especifico");
  const [selectedPost, setSelectedPost] = useState<InstagramMediaItem | null>(null);

  const [selectedOptionPalavra, setSelectedOptionPalavra] = useState("qualquer-palavra");
  const [inputPalavra, setInputPalavra] = useState("");

  const [toggleValue, setToggleValue] = useState<"publicar" | "comentarios" | "dm">("publicar");
  const [commentContent, setCommentContent] = useState(""); // Novo estado para o conteúdo do comentário

  const [openDialog, setOpenDialog] = useState(false);

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
            `https://graph.instagram.com/me/media?fields=` +
              `id,caption,media_url,media_type,thumbnail_url,media_product_type,` +
              `like_count,comments_count` +
              `&access_token=${accessToken}`
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
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchInstagramData();
  }, [status, accessToken]);

  // Função para lidar com a entrada na seção "Palavra ou Expressão"
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
      {/* Coluna Esquerda */}
      <div
        style={{
          flex: "1", // Ocupa 50% do espaço disponível
          borderRight: "1px solid #333",
          paddingRight: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center", // Centraliza o conteúdo horizontalmente
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
        />

        <PalavraExpressaoSelection
          selectedOptionPalavra={selectedOptionPalavra}
          setSelectedOptionPalavra={setSelectedOptionPalavra}
          inputPalavra={inputPalavra}
          setInputPalavra={handlePalavraInputChange} // Usando a função personalizada
        />
      </div>

      {/* Coluna Direita (Preview) */}
      <div
        style={{
          flex: "1", // Ocupa 50% do espaço disponível
          display: "flex",
          flexDirection: "column",
          alignItems: "center", // Centraliza o conteúdo horizontalmente
        }}
      >
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

        <PreviewPhoneMockup
          selectedPost={selectedPost}
          instagramUser={instagramUser}
          toggleValue={toggleValue}
          commentContent={commentContent}
        />

        <ToggleActions toggleValue={toggleValue} setToggleValue={setToggleValue} />
      </div>
    </div>
  );
}
