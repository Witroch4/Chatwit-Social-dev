import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import dotenv from 'dotenv';
import { scheduleAgendamentoBullMQ } from '@/lib/scheduler-bullmq';

dotenv.config();

/**
 * Handler para GET em /api/agendar
 * - Lista agendamentos de um determinado userID (passado via query param ou header)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userID = url.searchParams.get('userID') || request.headers.get('user-id');
    if (!userID) {
      return NextResponse.json({ error: 'userID é obrigatório.' }, { status: 400 });
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      console.error('BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos.');
      return NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
    }

    // Filtra os agendamentos do usuário no Baserow
    const filter = JSON.stringify({
      userID: { _eq: userID },
    });

    const response = await axios.get(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&filter=${encodeURIComponent(
        filter
      )}`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar agendamentos:', error.message);
    return NextResponse.json({ error: 'Erro ao listar agendamentos.' }, { status: 500 });
  }
}

/**
 * Handler para POST em /api/agendar
 * - Cria um novo agendamento no Baserow
 * - Agenda no BullMQ
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Agendar] Corpo da requisição:', body);

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
    } = body;

    if (!userID) {
      console.error('userID não fornecido.');
      return NextResponse.json({ error: 'userID é obrigatório.' }, { status: 400 });
    }

    const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;

    if (!BASEROW_TOKEN || !BASEROW_TABLE_ID) {
      console.error('BASEROW_TOKEN ou BASEROW_TABLE_ID não definidos.');
      return NextResponse.json({ error: 'Configuração do servidor incorreta.' }, { status: 500 });
    }

    // 1) Cria o registro no Baserow
    const newRow = {
      userID,
      Data,
      Descrição,
      Facebook: false, // Exemplo de campo fixo
      midia: midia || [],
      Instagram,
      Stories,
      Reels,
      PostNormal,
      Diario,
      Randomizar,
      IGtoken,
      status: 'pendente',
    };

    console.log('[Agendar] Payload para Baserow:', newRow);

    const baserowResponse = await axios.post(
      `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
      newRow,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[Agendar] Resposta do Baserow:', baserowResponse.data);

    // 2) Agenda com BullMQ
    const { id, Data: dataAgendada, userID: userIdAgend } = baserowResponse.data;

    // Montar jobId com BASEROW_TABLE_ID
    await scheduleAgendamentoBullMQ({
      id,             // <== ID numérico puro do Baserow
      Data: dataAgendada,
      userID: userIdAgend,
    });

    // Retorna a resposta com os dados do Baserow
    return NextResponse.json(baserowResponse.data, { status: 200 });
  } catch (error: any) {
    console.error('[Agendar] Erro ao criar agendamento:', error.message);

    if (error.response?.data) {
      console.error('Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Erro completo:', error);
    }

    return NextResponse.json({ error: 'Erro ao criar agendamento.' }, { status: 500 });
  }
}
