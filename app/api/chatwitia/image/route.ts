import { NextResponse } from 'next/server';
import { openaiService } from '@/services/openai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { prompt, options } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt inválido' },
        { status: 400 }
      );
    }

    const response = await openaiService.generateImage(prompt, options);

    return NextResponse.json({ 
      images: response.data,
      created: response.created 
    });
  } catch (error) {
    console.error('Erro na geração de imagem:', error);
    return NextResponse.json(
      { error: 'Erro no processamento da solicitação de imagem' },
      { status: 500 }
    );
  }
} 