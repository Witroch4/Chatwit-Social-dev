//app\dashboard\agendamento\page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
} from "@/components/ui/drawer";

import AgendamentoForm from "@/app/dashboard/agendamento/components/AgendamentoForm";
import AgendamentosList from "@/app/dashboard/agendamento/components/AgendamentosList";

import { UploadedFile } from "@/components/custom/FileUpload";
import { useToast } from "@/hooks/use-toast";
import useAgendamentos from "@/hooks/useAgendamentos";
import { useRouter } from "next/navigation";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const AgendamentoDePostagens: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // userID e igUserId do usuário logado
  const userID = session?.user?.id;
  const igUserId = session?.user?.providerAccountId;
  const IGtoken = session?.user?.instagramAccessToken;

  // Estado combinado para data e hora
  const [dateTime, setDateTime] = useState<Date | undefined>(new Date());
  const [tipoPostagem, setTipoPostagem] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [legenda, setLegenda] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Estados que controlam os Popovers do Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();

  // Hook para buscar agendamentos (recebe userID e igUserId)
  const { agendamentos, loading, error, refetch } = useAgendamentos(
    userID,
    igUserId
  );

  // Função para lidar com o agendamento
  const handleAgendar = async () => {
    if (!dateTime) {
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

      const isoDate = dateTime.toISOString();

      // Inclui o campo igUserId com o valor de providerAccountId da sessão
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
        igUserId: igUserId, // enviando para a API
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
          description: `Data: ${format(dateTime, "PPP", {
            locale: ptBR,
          })} às ${format(dateTime, "HH:mm:ss")}`,
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
        setDateTime(new Date());
        setTipoPostagem([]);
        setLegenda("");
        setUploadedFiles([]);
        setDrawerOpen(false);

        refetch();
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

  // Função que adapta o setter para aceitar SetStateAction completo
  const handleSetDateTime: React.Dispatch<React.SetStateAction<Date | undefined>> =
    (value) => {
      if (typeof value === "function") {
        setDateTime(value);
      } else if (value !== undefined) {
        setDateTime(value);
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
        {/* Ajuste no overflow */}
        <DrawerContent className="fixed bottom-0 left-0 right-0 h-3/4 bg-white rounded-t-xl shadow-lg overflow-visible">
          <AgendamentoForm
            dateTime={dateTime}
            setDateTime={handleSetDateTime}
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
        {status === "loading" && <p>Carregando sessão...</p>}
        {!session && <p>Você precisa estar logado para ver os agendamentos.</p>}

        {session && (
          <>
            {loading && (
              <div className="flex justify-center items-center">
                <DotLottieReact
                  src="/animations/loading.lottie"
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
          </>
        )}
      </section>
    </main>
  );
};

export default AgendamentoDePostagens;
