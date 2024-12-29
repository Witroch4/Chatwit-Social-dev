// app/api/admin/agendamentos/route.ts

import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import axios from "axios";

export async function GET(request: Request) {
  // Extrair token JWT do cabeçalho Authorization
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const user = await verifyAdmin(token);

  if (!user) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      return NextResponse.json({ error: "Configuração do servidor incorreta." }, { status: 500 });
    }

    const response = await axios.get(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    const agendamentos = response.data?.results.map((row: any) => ({
      id: row.id,
      userID: row.userID,
      Data: row.Data,
      Descrição: row.Descrição,
      status: row.status,
      // Mapeie outros campos conforme necessário
    })) || [];

    return NextResponse.json({ agendamentos }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar agendamentos:", error);
    return NextResponse.json({ error: "Erro ao buscar agendamentos." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  // Extrair token JWT do cabeçalho Authorization
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const user = await verifyAdmin(token);

  if (!user) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = Object.fromEntries(new URL(request.url).searchParams.entries());

  if (!id) {
    return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
  }

  try {
    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      return NextResponse.json({ error: "Configuração do servidor incorreta." }, { status: 500 });
    }

    await axios.delete(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${id}/`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    return NextResponse.json({ message: "Agendamento excluído com sucesso." }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao excluir agendamento:", error);
    return NextResponse.json({ error: "Erro ao excluir agendamento." }, { status: 500 });
  }
}
