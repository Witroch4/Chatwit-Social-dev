// app/api/scheduler/trigger/route.ts
import { NextResponse } from 'next/server';
import { loadAllAgendamentosPendentes, getLogs } from '../../../../lib/scheduler.ts.old';

export async function POST() {
  try {
    await loadAllAgendamentosPendentes();
    const logs = getLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}
