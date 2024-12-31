// app/api/agendar/delete/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import dotenv from 'dotenv';
import { cancelAgendamentoBullMQ } from '@/lib/scheduler-bullmq';

dotenv.config();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rowId = params.id;
    const userID = request.headers.get('user-id');

    if (!userID) {
      return NextResponse.json({ error: 'userID é obrigatório nos headers.' }, { status: 400 });
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      return NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
    }

    console.log(`[DELETE] Deletando agendamento com ID: ${rowId} para o usuário: ${userID}`);

    // Verificar se o agendamento realmente pertence ao userID
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
      return NextResponse.json({ error: 'Não autorizado a deletar este agendamento.' }, { status: 403 });
    }

    // 1) Cancela na fila do BullMQ
    await cancelAgendamentoBullMQ(rowId);

    // 2) Remove do Baserow
    await axios.delete(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    return NextResponse.json({ message: 'Agendamento deletado com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE] Erro ao deletar agendamento:', error.message);
    return NextResponse.json({ error: 'Erro ao deletar agendamento.' }, { status: 500 });
  }
}
