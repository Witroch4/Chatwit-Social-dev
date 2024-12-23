// app/api/agendar/update/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rowId = params.id;

    // Extrair os dados do corpo da requisição
    const {
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
      userID, // Garantir que userID seja incluído para segurança
    } = await request.json();

    // Validação básica
    if (!userID) {
      console.error("userID não fornecido.");
      return NextResponse.json({ error: "userID é obrigatório." }, { status: 400 });
    }

    // Garantir que o rowId seja fornecido
    if (!rowId) {
      console.error("row_id não fornecido.");
      return NextResponse.json({ error: "row_id é obrigatório." }, { status: 400 });
    }

    // Variáveis de ambiente
    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      console.error("BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos.");
      return NextResponse.json(
        { error: "Configuração do servidor incorreta." },
        { status: 500 }
      );
    }

    const updatedRow = {
      Data,
      Descrição,
      midia: midia || [],
      Instagram,
      Stories,
      Reels,
      PostNormal,
      Diario,
      Randomizar,
      IGtoken,
      userID,
    };

    console.log("Payload para Baserow (Atualização):", updatedRow);

    const response = await axios.patch(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`,
      updatedRow,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Resposta do Baserow (Atualização):", response.data);

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    if (error.response?.data) {
      console.error("Erro ao atualizar agendamento:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Erro ao atualizar agendamento:", error.message);
    }
    return NextResponse.json(
      { error: "Erro ao atualizar agendamento." },
      { status: 500 }
    );
  }
}
