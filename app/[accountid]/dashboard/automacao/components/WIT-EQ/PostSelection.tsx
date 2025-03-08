// app/dashboard/automacao/components/WIT-EQ/PostSelection.tsx

import { InstagramMediaItem } from "../../guiado-facil/page";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PostSelectionProps {
  anyMediaSelected: boolean;
  setAnyMediaSelected: (value: boolean) => void;
  selectedPost: InstagramMediaItem | null;
  setSelectedPost: (p: InstagramMediaItem | null) => void;
  instagramMedia: InstagramMediaItem[];
  openDialog: boolean;
  setOpenDialog: (open: boolean) => void;
  onSelectPost?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function PostSelection({
  anyMediaSelected,
  setAnyMediaSelected,
  selectedPost,
  setSelectedPost,
  instagramMedia,
  openDialog,
  setOpenDialog,
  onSelectPost,
  disabled = false,
  className = "",
}: PostSelectionProps) {
  // Log para depuração
  console.log("PostSelection - selectedPost:", selectedPost);
  console.log("PostSelection - anyMediaSelected:", anyMediaSelected);

  const params = useParams<{ accountid: string }>();
  const providerAccountId = params?.accountid;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstagramData = async () => {
      if (!providerAccountId) {
        setError("ID da conta não fornecido");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/instagram/posts?providerAccountId=${providerAccountId}`);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Erro ao buscar dados do Instagram");
        }

        const data = await res.json();
        setLoading(false);
      } catch (err: any) {
        console.error("Erro ao conectar com o Instagram:", err);
        setError(err.message || "Erro ao conectar com o Instagram.");
        setLoading(false);
      }
    };

    fetchInstagramData();
  }, [providerAccountId]);

  // Verifica se é Reels
  const isReel = (post: InstagramMediaItem) => {
    return post.media_type === "VIDEO" && post.media_product_type === "REELS";
  };

  // Ao selecionar um post específico
  const handleSelectPost = (post: InstagramMediaItem) => {
    if (disabled) return;
    setSelectedPost(post);
    setAnyMediaSelected(false); // Não é qualquer mídia, é específica
    onSelectPost?.();
  };

  // Pegar apenas as 4 últimas postagens para o preview
  const ultimasPostagens = instagramMedia.slice(0, 4);

  // Renderiza cards de posts (pequenos)
  const renderPostCard = (post: InstagramMediaItem) => (
    <div
      key={post.id}
      style={{
        width: "70px",
        height: "95px",
        border: selectedPost?.id === post.id ? "2px solid blue" : "1px solid #333",
        borderRadius: "5px",
        overflow: "hidden",
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        position: "relative",
      }}
      onClick={() => handleSelectPost(post)}
    >
      {post.media_url ? (
        isReel(post) && post.thumbnail_url ? (
          <>
            <img
              src={post.thumbnail_url}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt={post.caption || "Reels thumbnail"}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                padding: "2px 4px",
                borderRadius: "3px",
                fontSize: "10px",
              }}
            >
              Reels
            </div>
          </>
        ) : (
          <img
            src={post.media_url}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt={post.caption || "post"}
          />
        )
      ) : (
        <Skeleton className="h-[95px] w-[70px] rounded" />
      )}
    </div>
  );

  // Renderiza cards de posts dentro do Dialog (grid maior)
  const renderPostDialogCard = (post: InstagramMediaItem) => (
    <div
      key={post.id}
      style={{
        width: "205px",
        height: "265px",
        border: selectedPost?.id === post.id ? "2px solid blue" : "1px solid #333",
        borderRadius: "5px",
        overflow: "hidden",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
      }}
      onClick={() => {
        if (disabled) return;
        setSelectedPost(post);
        setOpenDialog(false);
        setAnyMediaSelected(false);
        onSelectPost?.();
      }}
    >
      {post.media_url ? (
        isReel(post) && post.thumbnail_url ? (
          <>
            <img
              src={post.thumbnail_url}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt={post.caption || "Reels thumbnail"}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                padding: "2px 4px",
                borderRadius: "3px",
                fontSize: "12px",
              }}
            >
              Reel
            </div>
          </>
        ) : (
          <img
            src={post.media_url}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt={post.caption || "post"}
          />
        )
      ) : (
        <Skeleton className="h-[265px] w-[205px] rounded" />
      )}
    </div>
  );

  return (
    <div className={className} style={{ opacity: disabled ? 0.6 : 1 }}>
      <h2 style={{ marginBottom: "10px" }}>Quando Alguém faz um Comentário</h2>
      <RadioGroup
        value={anyMediaSelected ? "qualquer" : "especifico"}
        onValueChange={(v) => {
          if (disabled) return;
          const isAnyMedia = v === "qualquer";
          setAnyMediaSelected(isAnyMedia);
          if (isAnyMedia) {
            setSelectedPost(null);
            onSelectPost?.();
          }
        }}
        style={{ marginBottom: "20px" }}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="especifico" id="especifico" disabled={disabled} />
          <Label htmlFor="especifico">Uma Publicação ou Reels Específico</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="qualquer" id="qualquer" disabled={disabled} />
          <Label htmlFor="qualquer">Qualquer Publicação ou Reels</Label>
        </div>
      </RadioGroup>

      {!anyMediaSelected && (
        <div style={{ marginBottom: "20px" }}>
          {ultimasPostagens.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "10px",
                overflowX: "auto",
              }}
            >
              {ultimasPostagens.map(renderPostCard)}
            </div>
          ) : (
            <div className="flex gap-2">
              <Skeleton className="h-[95px] w-[70px] rounded" />
              <Skeleton className="h-[95px] w-[70px] rounded" />
              <Skeleton className="h-[95px] w-[70px] rounded" />
              <Skeleton className="h-[95px] w-[70px] rounded" />
            </div>
          )}
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={disabled}
              >
                Ver Mais Publicações
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Selecione uma Publicação</DialogTitle>
                <DialogDescription>
                  Escolha uma publicação específica para monitorar comentários.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4 max-h-[500px] overflow-y-auto">
                {instagramMedia.map(renderPostDialogCard)}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
