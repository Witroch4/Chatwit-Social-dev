//app\api\agendar\update\[id]\route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { scheduleAgendamentoBullMQ, cancelAgendamentoBullMQ } from '@/lib/scheduler-bullmq';

/**
 * PATCH em /api/agendar/update/[id]
 * - Atualiza o agendamento no Baserow
 * - Re-agenda no BullMQ (remove job antigo e cria novo)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Aguarda a resolução dos parâmetros dinâmicos
    const { id: rowId } = await context.params;

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
      return NextResponse.json(
        { error: 'userID é obrigatório.' },
        { status: 400 }
      );
    }

    if (!rowId) {
      return NextResponse.json(
        { error: 'rowId é obrigatório na URL.' },
        { status: 400 }
      );
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      return NextResponse.json(
        { error: 'Configuração do servidor incorreta.' },
        { status: 500 }
      );
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

    // 2) Cancela o job antigo e re-agenda
    await cancelAgendamentoBullMQ(rowId);

    try {
      // Garantir que os dados necessários estão presentes e válidos
      const agendamentoData = {
        id: response.data.id,
        Data: Data || response.data.Data,
        userID: userID
      };

      // Verificar se os dados são válidos
      if (!agendamentoData.id || !agendamentoData.Data || !agendamentoData.userID) {
        throw new Error(`Dados inválidos para reagendamento: ${JSON.stringify(agendamentoData)}`);
      }

      await scheduleAgendamentoBullMQ(agendamentoData);
    } catch (bullMQError: any) {
      console.error("[BullMQ] Erro ao reagendar job:", bullMQError.message);
      // Não retornar erro para o cliente, apenas logar
      // A atualização já foi salva no Baserow
    }

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('[Update] Erro ao atualizar agendamento:', error.message);
    return NextResponse.json(
      { error: 'Erro ao atualizar agendamento.' },
      { status: 500 }
    );
  }
}
