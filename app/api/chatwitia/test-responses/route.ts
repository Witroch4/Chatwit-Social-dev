import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageUrl, model = 'gpt-4o-2024-11-20', prompt = 'Descreva esta imagem' } = await req.json();
    
    console.log('🧪 Teste da Responses API iniciado');
    console.log('🔧 Modelo:', model);
    console.log('📝 Prompt:', prompt);
    console.log('🖼️ URL da imagem:', imageUrl?.substring(0, 100) + '...');
    
    // Payload básico para teste
    const testPayload = {
      model: model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt }
          ]
        }
      ],
      stream: false,
      store: true
    };
    
    // Adicionar imagem se fornecida
    if (imageUrl) {
      testPayload.input[0].content.push({
        type: "input_image",
        image_url: imageUrl
      } as any);
    }
    
    console.log('📤 Payload de teste:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(testPayload),
    });
    
    console.log('📥 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Erro da OpenAI:', errorBody);
      
      try {
        const errorJson = JSON.parse(errorBody);
        return NextResponse.json({
          success: false,
          status: response.status,
          error: errorJson,
          payload: testPayload
        });
      } catch (parseError) {
        return NextResponse.json({
          success: false,
          status: response.status,
          error: errorBody,
          payload: testPayload
        });
      }
    }
    
    const responseData = await response.json();
    console.log('✅ Resposta da OpenAI recebida com sucesso');
    
    return NextResponse.json({
      success: true,
      status: response.status,
      data: responseData,
      payload: testPayload
    });
    
  } catch (error: any) {
    console.error('❌ Erro no teste:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 