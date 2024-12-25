// app/api/agendar/route.ts

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { scheduleAgendamento } from "@/lib/scheduler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Corpo da requisição:", body);

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
      // Certifique-se de incluir todos os campos necessários
    } = body;

    if (!userID) {
      console.error("userID não fornecido.");
      return NextResponse.json({ error: "userID é obrigatório." }, { status: 400 });
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

    const newRow = {
      userID,
      Data,
      Descrição,
      Facebook: false,
      midia: midia || [],
      // Adicione outros campos conforme necessário
      Instagram,
      Stories,
      Reels,
      PostNormal,
      Diario,
      Randomizar,
      IGtoken,
      status: "pendente", // Assegure-se de que existe este campo no Baserow
    };

    console.log("Payload para Baserow:", newRow);

    const response = await axios.post(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
      newRow,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Resposta do Baserow:", response.data);

    // Agendar o webhook
    scheduleAgendamento({
      id: response.data.id,
      Data: response.data.Data,
      userID: response.data.userID,
      // Adicione outros campos se necessário
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    if (error.response?.data) {
      console.error("Erro ao criar agendamento:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Erro ao criar agendamento:", error.message);
    }
    return NextResponse.json(
      { error: "Erro ao criar agendamento." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obter o userID a partir dos headers
    const userID = request.headers.get("user-id");
    if (!userID) {
      return NextResponse.json({ error: "userID é obrigatório." }, { status: 400 });
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

    // Fazer a requisição ao Baserow para buscar os agendamentos do usuário
    const filter = JSON.stringify({
      userID: { _eq: userID },
    });

    const response = await axios.get(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&filter=${encodeURIComponent(filter)}`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao listar agendamentos:", error.message);
    return NextResponse.json(
      { error: "Erro ao listar agendamentos." },
      { status: 500 }
    );
  }
}
