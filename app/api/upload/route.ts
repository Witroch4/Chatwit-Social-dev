// app/api/upload/route.ts

import { NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: Request) {
  try {
    // Extrair o FormData da request
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      console.error('Nenhum arquivo foi enviado na requisição.')
      return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    // Criar novo FormData para enviar ao Baserow
    const uploadFormData = new FormData()
    uploadFormData.append('file', file, file.name)

    console.log('Enviando arquivo para o Baserow:', file.name)

    // Enviar requisição ao Baserow
    const response = await axios.post(process.env.BASEROW_UPLOAD_URL as string, uploadFormData, {
      headers: {
        Authorization: `Token ${process.env.BASEROW_TOKEN}`,
        // 'Content-Type': multipart/form-data é definido automaticamente pelo Axios ao enviar FormData
      },
    })

    console.log('Resposta do Baserow:', response.data)

    // Retornar a resposta do Baserow
    return NextResponse.json(response.data, { status: 200 })
  } catch (error: any) {
    console.error('Erro ao fazer upload:', error.response?.data || error.message)
    return NextResponse.json({ message: 'Erro ao fazer upload do arquivo.' }, { status: 500 })
  }
}
