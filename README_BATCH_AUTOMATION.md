# Sistema de Automação em Lote para Leads

## Visão Geral

O sistema de automação em lote permite processar múltiplos leads simultaneamente, automatizando as etapas de:

1. **Unificação de PDF** - Combina todos os arquivos do lead em um único PDF
2. **Geração de Imagens** - Converte o PDF unificado em imagens
3. **Processamento de Manuscrito** - Digitalização automática do texto da prova
4. **Espelho de Correção** - Criação do espelho para correção
5. **Pré-Análise** - Envio para análise automática

## Como Usar

### 1. Seleção de Leads
- Na lista de leads, marque os checkboxes dos leads que deseja processar
- Um banner aparecerá mostrando quantos leads foram selecionados

### 2. Iniciar Processamento
- Clique no botão **"Processamento em Lote"** com ícone de raio ⚡
- Um diálogo de progresso será exibido mostrando o andamento

### 3. Fluxo Automático
O sistema processa cada lead seguindo esta ordem:

#### Etapa 1: Processamento Automático
- **Unificação de PDF**: Se o lead não tem PDF unificado, será criado automaticamente
- **Geração de Imagens**: Se não há imagens convertidas, serão geradas do PDF
- **Verificação de Dependências**: Identifica quais leads precisam de ação manual

#### Etapa 2: Ações Manuais (Manuscrito)
Se algum lead precisar de manuscrito:
- O processamento pausa automaticamente
- Diálogos sequenciais são abertos para cada lead
- Você seleciona as imagens e envia para digitação
- O sistema aguarda o processamento externo

#### Etapa 3: Ações Manuais (Espelho)
Se algum lead precisar de espelho:
- Novamente o processamento pausa
- Diálogos para seleção de imagens do espelho
- Envio para processamento de correção

#### Etapa 4: Finalização
- Leads completos são enviados para pré-análise automaticamente
- Relatório final é exibido

## Interface do Usuário

### Barra de Ferramentas
- **Indicador de Processamento**: Mostra quando está rodando
- **Botão Principal**: Inicia/cancela o processamento
- **Status Visual**: Animações e indicadores de progresso

### Diálogo de Progresso
- **Barra de Progresso**: Percentual concluído
- **Status Atual**: Qual lead está sendo processado
- **Informações de Pausa**: Motivo da parada e próximos passos
- **Lista de Pendências**: Leads aguardando ação manual

### Diálogos em Modo Batch
- **Contador**: "X de Y" no cabeçalho
- **Nome do Lead**: Mostra qual lead está sendo processado
- **Botões Especiais**: "Pular Este Lead", "Próximo", "Cancelar Lote"

## Regras de Negócio

### Leads Ignorados
- **Consultoria Ativa**: Leads com `consultoriaFase2 = true` são pulados automaticamente
- **Notification**: O usuário é notificado sobre leads ignorados

### Dependências Respeitadas
- PDF deve existir antes de gerar imagens
- Imagens devem existir antes de processar manuscrito
- Manuscrito e espelho devem existir antes da análise

### Pausas Inteligentes
- **Manuscrito**: Para quando leads precisam de digitação manual
- **Espelho**: Para quando leads precisam de espelho de correção
- **Continuação**: O usuário pode executar novamente para continuar

## Tratamento de Erros

### Erros Individuais
- Erros em um lead não afetam os outros
- Lead com erro é pulado com notificação
- Processamento continua para os próximos leads

### Erros de Sistema
- Falhas de rede são tratadas com retry automático
- Timeouts têm fallback apropriado
- Usuário pode cancelar a qualquer momento

## Feedback Visual

### Notificações (Toast)
- **Início**: "Processamento iniciado para X leads"
- **Progresso**: "PDF unificado para [Nome]"
- **Pausas**: "Fluxo pausado - aguardando ação manual"
- **Conclusão**: "Processamento concluído! X leads enviados para análise"

### Indicadores de Estado
- **Animação de Pulsação**: Durante processamento ativo
- **Cores Semânticas**: Verde (sucesso), Amarelo (pausa), Vermelho (erro)
- **Ícones Contextais**: Diferentes ícones para cada tipo de ação

## Benefícios

### Para o Administrador
- **Economia de Tempo**: Automatiza 80% das tarefas repetitivas
- **Menos Cliques**: Reduz de ~50 cliques por lead para ~5 cliques total
- **Processamento Noturno**: Pode ser executado em lotes grandes
- **Controle Granular**: Possibilidade de pular leads problemáticos

### Para o Sistema
- **Eficiência**: Processamento paralelo onde possível
- **Robustez**: Tratamento de erros individual por lead
- **Escalabilidade**: Pode processar centenas de leads
- **Observabilidade**: Logs detalhados de cada etapa

## Limitações Conhecidas

1. **Processamento Sequencial**: Dialogs manuais são abertos um por vez
2. **Dependência Externa**: Pausas necessárias para sistemas de IA
3. **Memória do Navegador**: Lotes muito grandes podem causar lentidão
4. **Conexão de Rede**: Requer conexão estável durante todo o processo

## Casos de Uso Ideais

### Lote Pequeno (5-20 leads)
- Processamento completo em uma sessão
- Ideal para leads recém-chegados
- Supervisão ativa do administrador

### Lote Grande (50+ leads)
- Processamento em múltiplas sessões
- Foco em etapas automáticas primeiro
- Deixar manuscritos/espelhos para depois

### Limpeza de Backlog
- Executar várias vezes ao dia
- Processar leads mais antigos primeiro
- Aproveitar horários de menor uso do sistema

## Dicas de Uso

1. **Ordenação**: Ordene leads por data para processar os mais antigos primeiro
2. **Horário**: Execute durante horários de menor uso do sistema externo
3. **Lotes**: Prefira lotes de 10-30 leads para melhor controle
4. **Monitoramento**: Acompanhe as notificações para identificar problemas
5. **Backup**: Sempre mantenha backups antes de processamentos grandes

---

**Versão**: 1.0  
**Data**: Dezembro 2024  
**Autor**: Sistema Chatwit Social 