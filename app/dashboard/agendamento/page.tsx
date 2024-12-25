// app/dashboard/agendamento/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoveRight } from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
} from "@/components/ui/drawer";

import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import AgendamentosList from "@/components/agendamento/AgendamentosList";

import { UploadedFile } from "@/components/custom/FileUpload";
import { useToast } from "@/hooks/use-toast";
import useAgendamentos from "@/hooks/useAgendamentos";
import { useRouter } from "next/navigation";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const AgendamentoDePostagens: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userID = session?.user?.id;
  const IGtoken = session?.user?.instagramAccessToken;

  // Estados principais do formulário
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState<string>("");
  const [tipoPostagem, setTipoPostagem] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [legenda, setLegenda] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Estados que controlam os Popovers do Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();

  // Hook para buscar agendamentos
  const { agendamentos, loading, error, refetch } = useAgendamentos(userID);

  // Função para lidar com o agendamento
  const handleAgendar = async () => {
    if (!date || !hora) {
      toast({
        title: "Agendamento Incompleto",
        description: "Por favor, selecione data e hora para agendar.",
      });
      return;
    }

    if (!userID) {
      toast({
        title: "Usuário Não Autenticado",
        description: "Por favor, faça login para agendar postagens.",
      });
      return;
    }

    if (!IGtoken) {
      toast({
        title: "Token do Instagram Não Disponível",
        description: "Não foi possível obter o token do Instagram.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const midiaNames = uploadedFiles
        .map((file) => file.name)
        .filter(Boolean) as string[];

      if (midiaNames.length === 0) {
        toast({
          title: "Mídia Não Enviada",
          description: "Por favor, faça upload de pelo menos um arquivo de mídia.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const tipos = {
        "Post Normal": tipoPostagem.includes("Post Normal"),
        Reels: tipoPostagem.includes("Reels"),
        Stories: tipoPostagem.includes("Stories"),
        Diario: tipoPostagem.includes("Diario"),
        Aleatorio: tipoPostagem.includes("Aleatório"),
      };

      const [hours, minutes] = hora.split(":").map(Number);
      const combinedDate = new Date(date);
      combinedDate.setHours(hours, minutes, 0, 0);
      const isoDate = combinedDate.toISOString();

      const newRow = {
        Data: isoDate,
        Descrição: legenda,
        Facebook: false,
        midia: midiaNames.map((name) => ({ name })),
        Instagram: true,
        Stories: tipos.Stories,
        Reels: tipos.Reels,
        PostNormal: tipos["Post Normal"],
        Diario: tipos.Diario,
        Randomizar: tipos.Aleatorio,
        IGtoken: IGtoken,
        userID: userID,
      };

      const response = await axios.post("/api/agendar", newRow, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      setUploading(false);

      if (response.status === 200 || response.status === 201) {
        toast({
          title: "Agendamento Criado com Sucesso!",
          description: `Data: ${format(combinedDate, "PPP", {
            locale: ptBR,
          })} às ${hora}`,
          action: (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                router.refresh();
              }}
            >
              Ver Agendamento
            </Button>
          ),
        });

        // Limpar o formulário após o sucesso
        setDate(undefined);
        setHora("");
        setTipoPostagem([]);
        setLegenda("");
        setUploadedFiles([]);
        setDrawerOpen(false); // Fechar o Drawer após o agendamento

        refetch(); // Refazer a busca dos agendamentos
      } else {
        toast({
          title: "Erro ao Agendar",
          description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setUploading(false);
      console.error("Erro ao agendar a postagem:", error);
      toast({
        title: "Erro ao Agendar",
        description:
          error.response?.data?.message ||
          "Ocorreu um erro ao agendar a postagem.",
        variant: "destructive",
      });
    }
  };

  // Redirecionamento ou alerta se não estiver autenticado
  useEffect(() => {
    if (status === "loading") return; // Não faça nada enquanto estiver carregando
    if (!session) {
      console.warn("Usuário não autenticado.");
      // Implementar redirecionamento se necessário
    }
  }, [session, status]);

  return (
    <main className="p-4 sm:p-10 space-y-4">
      <h1 className="text-2xl font-bold">Agendamento de Postagens</h1>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline">Novo Agendamento</Button>
        </DrawerTrigger>
        {/* Alteração: Trocar 'overflow-hidden' para 'overflow-visible' */}
        <DrawerContent className="fixed bottom-0 left-0 right-0 h-3/4 bg-white rounded-t-xl shadow-lg overflow-visible">
          <AgendamentoForm
            date={date}
            setDate={setDate}
            hora={hora}
            setHora={setHora}
            tipoPostagem={tipoPostagem}
            setTipoPostagem={setTipoPostagem}
            legenda={legenda}
            setLegenda={setLegenda}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            handleAgendar={handleAgendar}
            uploading={uploading}
            setDrawerOpen={setDrawerOpen}
          />
        </DrawerContent>
      </Drawer>

      {/* Listagem de Agendamentos */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Seus Agendamentos</h2>
        {loading && (
          <div className="flex justify-center items-center">
            <DotLottieReact
              src="/animations/loading.lottie" // Referência via URL
              autoplay
              loop={true}
              style={{ width: 150, height: 150 }}
              aria-label="Carregando agendamentos"
            />
          </div>
        )}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && agendamentos.length === 0 && (
          <p>Nenhum agendamento encontrado.</p>
        )}
        {!loading && agendamentos.length > 0 && (
          <AgendamentosList
            agendamentos={agendamentos}
            refetch={refetch}
            userID={userID || ""}
          />
        )}
      </section>

      {/* Exemplo de outro conteúdo na página, se necessário */}
      <div>
        <Link className="flex gap-1 items-center" href="https://github.com/ManishBisht777/file-vault">
          Github
          <MoveRight size={15} />
        </Link>
      </div>
    </main>
  );
};

export default AgendamentoDePostagens;
