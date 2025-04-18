// app/api/admin/atendimento/disparo/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  sendTemplateMessage,
  testWhatsAppApiConnection,
} from '@/lib/whatsapp';

interface EnvioResult {
  nome: string;
  numero: string;
  status: 'enviado' | 'falha';
  erro?: string;
}

const disparoSchema = z.object({
  contatos: z
    .array(
      z.object({
        nome: z.string(),
        numero: z.string(),
      })
    )
    .nonempty(),
  templateName: z.string(),
  configuracoes: z.object({
    variaveis: z.array(z.string()).optional(),
    headerVar: z.string().optional(),
    headerMedia: z.string().optional(),
    buttonOverrides: z.record(z.any()).optional(),
  }),
  couponCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

    const body = await req.json();
    const v = disparoSchema.safeParse(body);
    if (!v.success)
      return NextResponse.json(
        { error: 'Dados inválidos', details: v.error },
        { status: 400 }
      );

    const { contatos, templateName, configuracoes, couponCode } = v.data;

    const conn = await testWhatsAppApiConnection(
      await (await import('@/app/lib')).getWhatsAppConfig(session.user.id)
    );
    if (!conn.success)
      return NextResponse.json(
        { error: 'Falha na conexão WhatsApp', details: conn.details },
        { status: 400 }
      );

    const results: EnvioResult[] = [];
    let enviados = 0,
      falhas = 0;

    for (const c of contatos) {
      const ok = await sendTemplateMessage(c.numero, templateName, {
        bodyVars: configuracoes.variaveis,
        headerVar: configuracoes.headerVar,
        headerMedia: configuracoes.headerMedia,
        buttonOverrides: configuracoes.buttonOverrides,
        couponCode,
      });
      if (ok) {
        enviados++;
        results.push({ nome: c.nome, numero: c.numero, status: 'enviado' });
      } else {
        falhas++;
        results.push({ nome: c.nome, numero: c.numero, status: 'falha' });
      }
      // throttle se quiser
      await new Promise((r) => setTimeout(r, 200));
    }

    return NextResponse.json({
      success: true,
      results: { total: contatos.length, enviados, falhas, detalhes: results },
    });
  } catch (e) {
    console.error('[disparo POST]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
