//app\api\agendar\route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { scheduleAgendamentoBullMQ } from "@/lib/scheduler-bullmq";

/**
 * Handler para GET em /api/agendar
 * - Lista agendamentos de um determinado userID e igUserId (passados via query params)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userID = searchParams.get("userID");
    const igUserId = searchParams.get("igUserId"); // <-- novo

    // Se deseja tornar ambos obrigatórios
    if (!userID || !igUserId) {
      return NextResponse.json(
        { error: "Parâmetros userID e igUserId são obrigatórios." },
        { status: 400 }
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

    /**
     * Agora filtramos por userID e igUserId em conjunto
     *   filter__userID__equal = userID
     *   filter__igUserId__equal = igUserId
     *
     * Nesse formato, o Baserow retornará apenas as linhas
     * em que ambas as condições sejam verdadeiras.
     */
    const params = {
      user_field_names: true,
      [`filter__userID__equal`]: userID,
      [`filter__igUserId__equal`]: igUserId,
      size: 100, // limite de registros retornados
    };

    // Monta a URL base
    const url = `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/`;

    // Chama o Baserow
    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`,
      },
      params,
    });

    // Retorna a resposta do Baserow
    // Normalmente, vem no formato: { count, next, previous, results: [...] }
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
 * Handler para POST em /api/agendar
 * - Cria um novo agendamento no Baserow
 * - Agenda no BullMQ
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    console.log("[Agendar] Corpo da requisição:", body);

    const {
      userID,
      Data,
      Descrição,
      midia,
      Instagram,
      Stories,
      Reels,
      PostNormal,
      Diario,
      Randomizar,
      IGtoken,
      igUserId, // Campo para igUserId
    } = body;

    if (!userID) {
      console.error("userID não fornecido.");
      return NextResponse.json(
        { error: "userID é obrigatório." },
        { status: 400 }
      );
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      console.error("BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos.");
      return NextResponse.json(
        { error: "Configuração do servidor incorreta." },
        { status: 500 }
      );
    }

    // 1) Cria o registro no Baserow
    const newRow = {
      userID,
      Data,
      Descrição,
      Facebook: false,
      midia: midia || [],
      Instagram,
      Stories,
      Reels,
      PostNormal,
      Diario,
      Randomizar,
      IGtoken,
      igUserId, // Incluindo o campo igUserId
      status: "pendente",
    };

    console.log("[Agendar] Payload para Baserow:", newRow);

    const baserowResponse = await axios.post(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
      newRow,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("[Agendar] Resposta do Baserow:", baserowResponse.data);

    // 2) Agenda com BullMQ
    const { id, Data: dataAgendada, userID: userIdAgend } = baserowResponse.data;
    await scheduleAgendamentoBullMQ({
      id,
      Data: dataAgendada,
      userID: userIdAgend,
    });

    return NextResponse.json(baserowResponse.data, { status: 200 });
  } catch (error: any) {
    console.error("[Agendar] Erro ao criar agendamento:", error.message);
    if (error.response?.data) {
      console.error(
        "Detalhes do erro:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error("Erro completo:", error);
    }
    return NextResponse.json(
      { error: "Erro ao criar agendamento." },
      { status: 500 }
    );
  }
}
