// app/api/agendar/update/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import dotenv from 'dotenv';
import { scheduleAgendamentoBullMQ } from '@/lib/scheduler-bullmq';

dotenv.config();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rowId = params.id;
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
      userID,
    } = await request.json();

    if (!userID) {
      return NextResponse.json({ error: 'userID é obrigatório.' }, { status: 400 });
    }

    if (!rowId) {
      return NextResponse.json({ error: 'row_id é obrigatório.' }, { status: 400 });
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      return NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
    }

    // 1) Atualiza no Baserow
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

    console.log('[Update] Payload para Baserow:', updatedRow);

    const response = await axios.patch(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/?user_field_names=true`,
      updatedRow,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[Update] Resposta do Baserow:', response.data);

    // 2) Re-agenda no BullMQ (cancela anterior e cria novo, se preferir)
    //  - Caso você queira remover o anterior, faça `cancelAgendamentoBullMQ(rowId);` antes.
    await scheduleAgendamentoBullMQ({
      id: response.data.id,
      Data: response.data.Data,
      userID: response.data.userID,
    });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('[Update] Erro ao atualizar agendamento:', error.message);
    return NextResponse.json({ error: 'Erro ao atualizar agendamento.' }, { status: 500 });
  }
}
