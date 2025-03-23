# ChatWit Social - Sua Solução Completa para Redes Sociais 🚀

**ChatWit Social** é a plataforma ideal para gerenciar suas redes sociais e otimizar seu atendimento ao cliente com automação de ponta.

![GitHub last commit](https://img.shields.io/github/last-commit/Witroch4/ChatWit-Social)
![GitHub forks](https://img.shields.io/github/forks/Witroch4/ChatWit-Social)
![GitHub Repo stars](https://img.shields.io/github/stars/Witroch4/ChatWit-Social)
![GitHub watchers](https://img.shields.io/github/watchers/Witroch4/ChatWit-Social)

<div class="display:grid">
<img src="assets/chatwit_dashboard.jpg" alt="ChatWit Dashboard" width="400"/>
<img src="assets/chatwit_post_schedule.jpg" alt="Agendamento de Postagens" width="400"/>
<img src="assets/chatwit_automation.jpg" alt="Automação Inteligente" width="400"/>
<img src="assets/chatwit_mobile_view.jpg" alt="Visualização Mobile" width="400"/>
</div>

## <img src="assets/wave.gif" alt="drawing" width="20"/> Transforme sua Presença Digital com ChatWit Social

[![Instagram Badge](https://img.shields.io/badge/-WitDevOficial-purple?style=flat-square&logo=instagram&logoColor=white&link=https://www.instagram.com/witdevoficial/)](https://www.instagram.com/witdevoficial/)
[Visite Nosso Site Oficial](https://witdev.com.br)

ChatWit Social é uma plataforma poderosa e acessível, focada em micro, pequenos e médios empresários que desejam potencializar sua presença digital. Com recursos avançados de automação, agendamento de postagens e integração com redes sociais, é a ferramenta definitiva para gestão eficiente e resultados impressionantes.

## Funcionalidades Incríveis para Seu Negócio

- **Automação Inteligente**: Responda automaticamente a comentários e mensagens, economizando tempo.
- **Postagens Agendadas**: Planeje e publique conteúdos de forma automatizada.
- **Análise de Dados**: Obtenha insights detalhados sobre seu desempenho.
- **Integração Multicanal**: Gerencie Instagram, Facebook, WhatsApp e muito mais em um único painel.
- **Chatbot Personalizado com IA**: Melhore o atendimento ao cliente com respostas rápidas e precisas.

## Porque Escolher ChatWit Social?

**1. Gestão Centralizada**
Todos os seus canais de comunicação em um só lugar, permitindo uma visão clara e ações eficientes.

**2. Automação que Trabalha por Você**
Foque no que importa enquanto a plataforma cuida das tarefas repetitivas.

**3. Custo-Benefício**
Soluções avançadas a um preço acessível para todos os tipos de negócios.

**4. Suporte Exclusivo**
Equipe dedicada para garantir que você tenha a melhor experiência.

## Sistema de Notificações Avançado

O ChatWit Social conta com um sistema de notificações robusto e automatizado que mantém você e seus usuários sempre informados:

- **Notificações de Boas-vindas**: Mensagens automáticas para novos usuários que se registram na plataforma.
- **Alertas de Tokens Expirando**: Notificações proativas quando tokens de acesso às redes sociais estão próximos de expirar.
- **Processamento em Background**: Sistema de filas que garante o processamento eficiente das notificações sem impactar o desempenho da aplicação.
- **Painel Administrativo**: Interface intuitiva para gerenciar e testar o sistema de notificações.

### Como Funciona

1. **Verificação Automática**: O sistema verifica periodicamente tokens que estão próximos de expirar (10 dias e 3 dias antes).
2. **Processamento Assíncrono**: Todas as notificações são processadas em background através de um sistema de filas.
3. **Notificações Personalizadas**: Cada tipo de notificação é personalizada para o contexto específico.
4. **Monitoramento**: Administradores podem monitorar e testar o sistema através do painel administrativo.

## Ferramentas para Desenvolvedores

Para desenvolvedores que desejam contribuir ou personalizar o sistema, oferecemos:

- **Scripts de Administração**: Ferramentas para promover usuários a administradores e gerenciar o sistema.
- **API Documentada**: Endpoints bem documentados para integração com outros sistemas.
- **Arquitetura Modular**: Código organizado que facilita a manutenção e extensão.

## Configuração de Ambiente

O projeto utiliza diferentes arquivos de ambiente para desenvolvimento e produção:

1. **`.env.example`**: Modelo com variáveis necessárias para execução do projeto.
   
2. **`.env.development`**: Usado para desenvolvimento local com Docker.
   - Contém configurações específicas para ambiente de desenvolvimento.
   - Usado automaticamente pelo docker-compose.yml.

3. **`.env.production`**: Usado em ambiente de produção.

4. **`.env`** e **`.env.local`**: Arquivos usados para configurações específicas do ambiente ou sobreposições.

### Preparando o ambiente de desenvolvimento

Para configurar o ambiente de desenvolvimento:

1. Copie o arquivo `.env.example` para `.env.development`
   ```bash
   cp .env.example .env.development
   ```

2. Edite o arquivo `.env.development` e adicione os valores apropriados.

3. Execute o projeto usando Docker:
   ```bash
   docker-compose up
   ```

### Observações importantes

- As variáveis de ambiente do tipo `NEXT_PUBLIC_*` são expostas no cliente.
- Nunca comite arquivos `.env`, `.env.local`, `.env.development` ou `.env.production` no repositório.
- Utilize apenas o `.env.example` como modelo para configuração.

