// app/dashboard/automação/components/PostSelection.tsx

import { InstagramMediaItem } from "../page"; // Ajuste o caminho se necessário
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

interface PostSelectionProps {
  selectedOptionPostagem: string;
  setSelectedOptionPostagem: (v: string) => void;
  selectedPost: InstagramMediaItem | null;
  setSelectedPost: (p: InstagramMediaItem | null) => void;
  ultimasPostagens: InstagramMediaItem[];
  instagramMedia: InstagramMediaItem[];
  openDialog: boolean;
  setOpenDialog: (open: boolean) => void;
}

export default function PostSelection({
  selectedOptionPostagem,
  setSelectedOptionPostagem,
  selectedPost,
  setSelectedPost,
  ultimasPostagens,
  instagramMedia,
  openDialog,
  setOpenDialog
}: PostSelectionProps) {
  return (
    <div>
      <h2 style={{marginBottom: "10px"}}>Quando Alguém faz um Comentário</h2>
      <RadioGroup
        defaultValue="especifico"
        onValueChange={(v)=>{
          setSelectedOptionPostagem(v);
          if (v === "qualquer") setSelectedPost(null);
        }}
        style={{marginBottom:"20px"}}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="especifico" id="especifico"/>
          <Label htmlFor="especifico">Uma Publicação ou Reels Específico</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="qualquer" id="qualquer" />
          <Label htmlFor="qualquer">Qualquer Publicação ou Reels</Label>
        </div>
      </RadioGroup>

      {selectedOptionPostagem === "especifico" && (
        <div style={{marginBottom:"20px"}}>
          {ultimasPostagens.length > 0 ? (
            <div style={{display:"flex",flexDirection:"row",gap:"10px"}}>
              {ultimasPostagens.map((post)=>(
                <div
                  key={post.id}
                  style={{
                    width:"70px",
                    height:"95px",
                    border:"1px solid #333",
                    borderRadius:"5px",
                    overflow:"hidden",
                    cursor:"pointer",
                    flexShrink:0
                  }}
                  onClick={()=>setSelectedPost(post)}
                >
                  {post.media_url ? (
                    <img src={post.media_url} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={post.caption||"post"} />
                  ) : (
                    <Skeleton className="h-[95px] w-[70px] rounded" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <Skeleton className="h-[95px] w-[70px] rounded" />
              <Skeleton className="h-[95px] w-[70px] rounded" />
              <Skeleton className="h-[95px] w-[70px] rounded" />
              <Skeleton className="h-[95px] w-[70px] rounded" />
            </div>
          )}

          {/* Mostrar Todos - Dialog */}
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <button onClick={()=>setOpenDialog(true)} style={{background:"transparent",border:"none",color:"#0af",textDecoration:"underline",cursor:"pointer",marginTop:"10px"}}>Mostrar Todos</button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[730px] max-h-[730px] overflow-auto bg-background">
              <DialogHeader>
                <DialogTitle>Selecione Qualquer Publicação</DialogTitle>
                <DialogDescription>
                  Escolha uma publicação da lista abaixo.
                </DialogDescription>
              </DialogHeader>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(205px, 1fr))", gap:"10px", marginTop:"20px"}}>
                {instagramMedia.length > 0 ? instagramMedia.map((post)=>(
                  <div
                    key={post.id}
                    style={{
                      width:"205px",
                      height:"265px",
                      border:"1px solid #333",
                      borderRadius:"5px",
                      overflow:"hidden",
                      cursor:"pointer"
                    }}
                    onClick={()=>{
                      setSelectedPost(post);
                      setOpenDialog(false);
                    }}
                  >
                    {post.media_url ? (
                      <img
                        src={post.media_url}
                        style={{width:"100%", height:"100%", objectFit:"cover"}}
                        alt={post.caption||"post"}
                      />
                    ) : (
                      <Skeleton className="h-[265px] w-[205px] rounded" />
                    )}
                  </div>
                )) : (
                  Array.from({length:9}).map((_,i)=>(
                    <Skeleton key={i} className="h-[265px] w-[205px] rounded" />
                  ))
                )}
              </div>
              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Fechar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
