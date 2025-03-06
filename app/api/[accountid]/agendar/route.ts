import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { scheduleAgendamentoBullMQ } from "@/lib/scheduler-bullmq";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Handler para POST em /api/[accountid]/agendar
 * Cria um novo agendamento no Baserow e agenda no BullMQ, utilizando o accountid da rota.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountid: string }> }
): Promise<NextResponse> {
  const { accountid } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("[Agendar] Corpo da requisição:", body);

    if (!accountid) {
      return NextResponse.json(
        { error: "Campo accountid é obrigatório na URL." },
        { status: 400 }
      );
    }
    console.log("[Agendar] Usando accountid da URL:", accountid);

// Validação dos campos obrigatórios
const camposObrigatorios = { Data: body.Data, midia: body.midia };
const camposFaltando = Object.entries(camposObrigatorios)
  .filter(([_, value]) => !value)
  .map(([key]) => key);
if (camposFaltando.length > 0) {
  return NextResponse.json(
    { error: `Campos obrigatórios faltando: ${camposFaltando.join(", ")}`, camposFaltando },
    { status: 400 }
  );
}

// Valida se pelo menos um tipo de post está selecionado
if (!(body.Stories || body.Reels || body.PostNormal)) {
  return NextResponse.json(
    { error: "Selecione pelo menos um tipo de post (Stories, Reels ou Post Normal)" },
    { status: 400 }
  );
}


    // Valida se pelo menos um tipo de post está selecionado
    const tiposPost = [body.Stories, body.Reels, body.PostNormal];
    if (!tiposPost.some(tipo => tipo === true)) {
      return NextResponse.json(
        { error: "Selecione pelo menos um tipo de post (Stories, Reels ou Post Normal)" },
        { status: 400 }
      );
    }

    // Busca a conta do Instagram usando o accountid (que é o providerAccountId)
    const instagramAccount = await prisma.account.findFirst({
      where: {
        providerAccountId: accountid,
        userId: session.user.id,
        provider: "instagram",
      },
    });
    if (!instagramAccount) {
      return NextResponse.json(
        { error: "Conta do Instagram não encontrada ou não pertence ao usuário." },
        { status: 404 }
      );
    }
    console.log("[Agendar] Conta do Instagram encontrada:", sanitize(instagramAccount));
    console.log("[Agendar] Verificando accountid:", accountid);

    // Desestrutura os campos enviados
    const {
      Data,
      Descrição,
      midia,
      Instagram: instFlag,
      Stories,
      Reels,
      PostNormal,
      Diario,
      Randomizar,
    } = body;

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      console.error("BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos no .env.");
      return NextResponse.json(
        { error: "Configuração do servidor incorreta." },
        { status: 500 }
      );
    }

    // Prepara os dados para enviar ao Baserow
    const rowData = {
      userID: session.user.id,
      providerAccountId: instagramAccount.providerAccountId,
      igUserId: instagramAccount.igUserId || "",
      igUsername: instagramAccount.igUsername || "",
      Data,
      Descrição: Descrição || "",
      midia,
      Instagram: instFlag || false,
      Stories: Stories || false,
      Reels: Reels || false,
      PostNormal: PostNormal || false,
      Diario: Diario || false,
      Randomizar: Randomizar || false,
      IGtoken: instagramAccount.access_token || "",
    };
    console.log("[Agendar] Dados preparados para o Baserow:", sanitize(rowData));

    const urlBaserow = `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`;
    try {
      const response = await axios.post(urlBaserow, rowData, {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      });
      console.log("[Agendar] Resposta do Baserow:", response.data);

      if (response.data && typeof response.data === 'object') {
        console.log("[Agendar] Verificação de campos do Baserow:");
        console.log("- ID:", response.data.id);
        console.log("- Data:", response.data.Data);
        console.log("- Descrição:", response.data.Descrição);
        console.log("- Instagram:", response.data.Instagram);
        console.log("- Stories:", response.data.Stories);
        console.log("- Reels:", response.data.Reels);
        console.log("- PostNormal:", response.data.PostNormal);
      }

      // Agenda o job no BullMQ
      try {
        const agendamentoData = {
          id: response.data.id,
          Data: body.Data,
          userID: session.user.id,
        };

        if (!response.data.Data && response.data.field_6697) {
          console.log("[Agendar] Mapeando campos manualmente:");
          const fieldMapping = {
            Data: 'field_6697',
            Descrição: 'field_6698',
            Instagram: 'field_6699',
            Stories: 'field_6702',
            Reels: 'field_6703',
            PostNormal: 'field_6704',
            Diario: 'field_6705',
            Randomizar: 'field_6706',
            userID: 'field_6712',
            igUserId: 'field_6714',
            igUsername: 'field_6715',
            midia: 'field_6700'
          };
          const mappedData: Record<string, any> = {};
          for (const [appField, baserowField] of Object.entries(fieldMapping)) {
            if (response.data[baserowField] !== undefined) {
              mappedData[appField] = response.data[baserowField];
            }
          }
          console.log("[Agendar] Dados mapeados:", sanitize(mappedData));
          if (mappedData.Data) agendamentoData.Data = mappedData.Data;
          if (mappedData.userID) agendamentoData.userID = mappedData.userID;
        }

        if (!agendamentoData.id || !agendamentoData.Data || !agendamentoData.userID) {
          throw new Error(`Dados inválidos para agendamento: ${JSON.stringify(agendamentoData)}`);
        }
        await scheduleAgendamentoBullMQ(agendamentoData);
      } catch (bullMQError: any) {
        console.error("[BullMQ] Erro ao adicionar job:", bullMQError.message);
      }

      return NextResponse.json(response.data, { status: 201 });
    } catch (axiosError: any) {
      console.error(
        "[Agendar] Erro na requisição ao Baserow:",
        axiosError.response?.data || axiosError.message
      );
      return NextResponse.json(
        { error: "Erro ao salvar no Baserow", details: axiosError.response?.data || axiosError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Agendar] Erro ao criar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao criar agendamento", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handler para GET em /api/[accountid]/agendar
 * Lista agendamentos filtrando pela conta usando o accountid (que corresponde ao providerAccountId).
 * Utiliza o parâmetro "filters" em JSON para filtrar pelos campos "userID" (da sessão) e "providerAccountId" (da URL).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountid: string }> }
) {
  const { accountid } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }
    if (!accountid) {
      return NextResponse.json(
        { error: "Campo accountid é obrigatório na URL." },
        { status: 400 }
      );
    }
    console.log("[Agendar] Listando agendamentos para accountid:", accountid);

    // Verifica se a conta pertence ao usuário autenticado
    const account = await prisma.account.findFirst({
      where: {
        providerAccountId: accountid,
        userId: session.user.id,
        provider: "instagram",
      },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Conta não encontrada ou não pertence ao usuário." },
        { status: 404 }
      );
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      console.error("BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos no .env.");
      return NextResponse.json(
        { error: "Configuração do servidor incorreta." },
        { status: 500 }
      );
    }

    // Cria o filtro em JSON para filtrar por userID e providerAccountId
    const filterObj = {
      filter_type: "AND",
      filters: [
        { field: "userID", type: "equal", value: session.user.id },
        { field: "providerAccountId", type: "equal", value: accountid }
      ]
    };
    const filters = encodeURIComponent(JSON.stringify(filterObj));

    const urlBaserow = `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&filters=${filters}`;

    const response = await axios.get(urlBaserow, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
    });
    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao listar agendamentos:", error.message);
    return NextResponse.json(
      { error: "Erro ao listar agendamentos." },
      { status: 500 }
    );
  }
}

/**
 * Função para sanitizar objetos antes de logar (remove tokens, senhas e outros campos sensíveis)
 */
function sanitize(obj: any): any {
  if (!obj) return obj;
  const sanitized = { ...obj };
  const sensitivePaths = ['access_token', 'IGtoken', 'token', 'password', 'secret'];
  for (const path of sensitivePaths) {
    if (sanitized[path]) {
      sanitized[path] = '***REDACTED***';
    }
  }
  return sanitized;
}
