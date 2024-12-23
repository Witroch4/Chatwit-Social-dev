// app/api/agendar/delete/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rowId = params.id;

    // Obter o userID dos headers para verificar a autorização
    const userID = request.headers.get("user-id");
    if (!userID) {
      console.error("userID não fornecido nos headers.");
      return NextResponse.json({ error: "userID é obrigatório nos headers." }, { status: 400 });
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

    console.log(`Tentando deletar agendamento com ID: ${rowId} para o usuário: ${userID}`);

    // Opcional: Verificar se o agendamento pertence ao usuário antes de deletar
    // Isso requer uma requisição GET para obter o agendamento e verificar o userID

    const getAgendamentoResponse = await axios.get(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    const agendamento = getAgendamentoResponse.data;

    if (agendamento.userID !== userID) {
      console.error("Usuário não autorizado a deletar este agendamento.");
      return NextResponse.json({ error: "Não autorizado a deletar este agendamento." }, { status: 403 });
    }

    // Fazer a requisição DELETE ao Baserow
    const response = await axios.delete(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    console.log("Resposta do Baserow (Exclusão):", response.data);

    return NextResponse.json({ message: "Agendamento deletado com sucesso." }, { status: 200 });
  } catch (error: any) {
    if (error.response?.data) {
      console.error("Erro ao deletar agendamento:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Erro ao deletar agendamento:", error.message);
    }
    return NextResponse.json(
      { error: "Erro ao deletar agendamento." },
      { status: 500 }
    );
  }
}
