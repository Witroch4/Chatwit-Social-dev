# ChatwitIA - Sua Versão Personalizada do ChatGPT

O ChatwitIA é uma integração completa com a API da OpenAI, oferecendo uma versão personalizada do ChatGPT com recursos adicionais como geração de imagens e reconhecimento de voz.

![ChatwitIA Logo](https://via.placeholder.com/800x400?text=ChatwitIA)

## Recursos Principais

- 🤖 **Chat com IA Avançada**: Interface de conversação completa usando os modelos GPT-3.5/GPT-4
- 🎨 **Geração de Imagens**: Crie imagens com DALL-E 2 ou DALL-E 3 a partir de descrições textuais
- 🎤 **Entrada de Voz**: Transcreva sua voz automaticamente para texto usando o modelo Whisper
- 💬 **System Prompts Personalizáveis**: Configure a personalidade da IA para diferentes casos de uso
- 🔍 **Suporte a Todos os Modelos**: Acesso aos modelos mais recentes da OpenAI

## Tecnologias Utilizadas

- Next.js 13+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- OpenAI API
- Edge Runtime

## Pré-requisitos

- Node.js 18.x ou superior
- Chave de API da OpenAI

## Instalação

1. Adicione sua chave de API da OpenAI no arquivo `.env`:

```bash
OPENAI_API_KEY=sua-chave-aqui
```

2. Adicione a rota `/chatwitia` ao seu aplicativo Next.js já existente.

## Uso

Acesse a página `/chatwitia` para interagir com o ChatwitIA:

- **Envie mensagens**: Digite no campo de entrada e pressione Enter ou clique em "Enviar"
- **Grave áudio**: Clique no ícone do microfone para iniciar a gravação de voz
- **Gere imagens**: Clique no botão "Gerar Imagem" para abrir a interface de geração de imagens
- **Configure o comportamento**: Personalize o "System Prompt" para definir a personalidade da IA

## Endpoints da API

O ChatwitIA fornece vários endpoints que você pode usar em suas aplicações:

### 1. Chat Completion API

```
POST /api/chatwitia
Body: { "messages": [{"role": "user", "content": "Olá, como você está?"}] }
```

### 2. Geração de Imagens API

```
POST /api/chatwitia/image
Body: {
  "prompt": "Um gato laranja sentado em uma cadeira",
  "options": {
    "model": "dall-e-3",
    "size": "1024x1024"
  }
}
```

### 3. Transcrição de Áudio API

```
POST /api/chatwitia/transcribe
Body: FormData com o arquivo de áudio no campo "file"
```

## Personalização

### Modelos Disponíveis

**Modelos de Chat:**
- gpt-4
- gpt-4-turbo
- gpt-3.5-turbo
- gpt-3.5-turbo-16k

**Modelos de Imagem:**
- dall-e-3
- dall-e-2

**Modelo de Transcrição:**
- whisper-1

### Parâmetros de Configuração

**Chat:**
- `temperature`: 0-1 (determina a criatividade)
- `max_tokens`: limite de tokens na resposta
- `top_p`: diversidade na geração de texto
- `frequency_penalty`: penalidade para repetição
- `presence_penalty`: penalidade para tópicos novos

**Imagens:**
- `size`: tamanho da imagem (256x256, 512x512, 1024x1024, etc.)
- `quality`: qualidade da imagem (standard, hd)
- `style`: estilo (vivid, natural)

## Exemplos de System Prompts

**Assistente Técnico:**
```
Você é um assistente técnico especializado em programação. Forneça respostas precisas e técnicas, com exemplos de código quando relevante.
```

**Assistente Criativo:**
```
Você é um assistente criativo que ajuda a gerar ideias inovadoras. Seja inspirador e pense fora da caixa.
```

**Tutor Educacional:**
```
Você é um tutor paciente que explica conceitos difíceis de forma simples. Use analogias e exemplos para facilitar o entendimento.
```

## Contribuição

Contribuições são bem-vindas! Para sugestões, bugs ou melhorias:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.

## Contato

Para dúvidas ou suporte, entre em contato conosco em [seu-email@exemplo.com](mailto:seu-email@exemplo.com).

---

Desenvolvido com ❤️ usando a API da OpenAI 