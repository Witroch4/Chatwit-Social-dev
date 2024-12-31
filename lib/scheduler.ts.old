// lib/scheduler.ts
import axios from "axios";

/**
 * Mapa para armazenar em memória os timers de cada agendamento.
 * chave: ID do Baserow (string ou number)
 * valor: objeto Timeout do Node
 */
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * URL do webhook externo para onde enviar as requisições quando chegar o horário.
 */
const WEBHOOK_URL = "https://autofluxofilaapi.witdev.com.br/webhook/5f439037-6e1a-4d53-80ae-1cc0c4633c51";

// Armazenamento de logs
let logs: string[] = [];

/**
 * Função para adicionar logs tanto no console quanto no array de logs.
 * @param message Mensagem de log.
 */
function addLog(message: string) {
  console.log(message);
  logs.push(message);
}

/**
 * Função para recuperar os logs e limpar o array.
 * @returns Array de logs.
 */
export function getLogs(): string[] {
  const currentLogs = [...logs];
  logs = [];
  return currentLogs;
}

/**
 * Cancela um agendamento se existir um timer ativo em memória.
 */
export function cancelAgendamento(id: string | number) {
  const timer = activeTimers.get(String(id));
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(String(id));
    addLog(`[Scheduler] Agendamento ${id} cancelado.`);
  }
}

/**
 * Dispara o webhook para o agendamento especificado.
 */
async function dispararWebhook(agendamento: any) {
  const { id } = agendamento;
  addLog(`[Scheduler] Disparando webhook para agendamento ${id}...`);

  // Remover do map de timers para não disparar novamente
  activeTimers.delete(String(id));

  try {
    // 1) Dispara requisição ao seu webhook externo
    await axios.post(WEBHOOK_URL, {
      baserowId: id,
      dataAgendada: agendamento.Data,
      userID: agendamento.userID,
    });

    addLog(`[Scheduler] Webhook disparado com sucesso para agendamento ${id}.`);
  } catch (error: any) {
    if (error.response) {
      addLog(`[Scheduler] Erro ao disparar webhook do agendamento ${id}: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      addLog(`[Scheduler] Erro ao disparar webhook do agendamento ${id}: ${error?.message || error}`);
    }
  }
}

/**
 * Agenda um agendamento "normal" com base em data/hora completa (campo Data).
 */
export function scheduleAgendamento(agendamento: {
  id: string | number;
  Data: string; // Data/hora completa
  userID: string;
}) {
  cancelAgendamento(agendamento.id);

  const now = new Date();
  const dataExec = new Date(agendamento.Data);
  const delay = dataExec.getTime() - now.getTime();

  if (delay <= 0) {
    addLog(`[Scheduler] (Normal) Data de agendamento ${agendamento.id} já passou ou é agora. Disparando imediatamente.`);
    dispararWebhook(agendamento);
    return;
  }

  const timer = setTimeout(() => {
    dispararWebhook(agendamento);
  }, delay);

  activeTimers.set(String(agendamento.id), timer);
  addLog(`[Scheduler] (Normal) Agendamento ${agendamento.id} marcado para ${dataExec.toISOString()} (delay ${delay}ms).`);
}

/**
 * Agenda um agendamento "especial", ignorando o dia e usando apenas a hora/minuto/segundo.
 */
export function scheduleAgendamentoEspecial(agendamento: {
  id: string | number;
  Data: string; // Campo Data com data/hora, mas usaremos só a hora
  userID: string;
}) {
  cancelAgendamento(agendamento.id);

  const now = new Date();
  const parsed = new Date(agendamento.Data);

  // Extrair somente hora/min/seg
  const h = parsed.getHours();
  const m = parsed.getMinutes();
  const s = parsed.getSeconds();

  // Montar "hoje" com essa hora
  const dataExec = new Date(now);
  dataExec.setHours(h, m, s, 0);

  if (dataExec.getTime() <= now.getTime()) {
    // Se já passou hoje, agenda pra amanhã
    dataExec.setDate(dataExec.getDate() + 1);
    addLog(`[Scheduler] (Especial) Hora de agendamento ${agendamento.id} já passou hoje. Marcado para amanhã => ${dataExec.toISOString()}`);
  }

  const delay = dataExec.getTime() - now.getTime();

  if (delay <= 0) {
    addLog(`[Scheduler] (Especial) Hora de agendamento ${agendamento.id} já passou ou é agora. Disparando imediatamente.`);
    dispararWebhook(agendamento);
    return;
  }

  // Criar timeout
  const timer = setTimeout(() => {
    dispararWebhook(agendamento);
  }, delay);

  activeTimers.set(String(agendamento.id), timer);
  addLog(`[Scheduler] (Especial) Agendamento ${agendamento.id} marcado para ${dataExec.toISOString()} (delay ${delay}ms).`);
}

/**
 * Carrega todos os agendamentos "pendentes" do Baserow e agenda-os.
 * - Linhas NORMAIS: Concluido_IG vazio + Diario vazio => (Data + hora)
 * - Linhas ESPECIAIS: Concluido_IG vazio + Diario marcado => ignora data (só hora)
 */
export async function loadAllAgendamentosPendentes() {
  addLog("[Scheduler] Carregando agendamentos pendentes do Baserow...");
  try {
    const BASEROW_TOKEN = process.env.BASEROW_TOKEN || "";
    const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID || "";

    if (!BASEROW_TABLE_ID || !BASEROW_TOKEN) {
      addLog("[Scheduler] BASEROW_TABLE_ID ou BASEROW_TOKEN não está definido. Impossível carregar agendamentos.");
      return;
    }

    // Parâmetros para linhas NORMAIS
    const normalParams = {
      user_field_names: 'true',                // Deve ser string 'true'
      filter__Concluido_IG__empty: 'true',     // pendente como string 'true'
      filter__Diario__empty: 'true',           // "não especial" como string 'true'
      size: 200,
    };

    // Parâmetros para linhas ESPECIAIS
    const specialParams = {
      user_field_names: 'true',                // Deve ser string 'true'
      filter__Concluido_IG__empty: 'true',     // pendente como string 'true'
      filter__Diario__not_empty: true,         // "especial" (booleano) como booleano true
      size: 200,
    };

    const BASE_URL = `https://planilhatecnologicabd.witdev.com.br/api/database/rows/table/${BASEROW_TABLE_ID}/`;

    // Requisição para linhas NORMAIS
    addLog("[Scheduler] --> Fazendo GET para linhas NORMAIS...");
    const normalResponse = await axios.get(BASE_URL, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      params: normalParams,
    });
    addLog(`[Scheduler] --> GET Normal finalizado. Status: ${normalResponse.status}`);

    // Requisição para linhas ESPECIAIS
    addLog("[Scheduler] --> Fazendo GET para linhas ESPECIAIS...");
    const specialResponse = await axios.get(BASE_URL, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      params: specialParams,
    });
    addLog(`[Scheduler] --> GET Especial finalizado. Status: ${specialResponse.status}`);

    const normalRows = normalResponse.data?.results || [];
    const specialRows = specialResponse.data?.results || [];

    addLog(`[Scheduler] Linhas NORMAIS pendentes: ${normalRows.length}`);
    addLog(`[Scheduler] Linhas ESPECIAIS pendentes: ${specialRows.length}`);

    // Logs de debug (Opcional, mas útil)
    // addLog("[Scheduler] Resposta normalRows:", JSON.stringify(normalRows, null, 2));
    // addLog("[Scheduler] Resposta specialRows:", JSON.stringify(specialRows, null, 2));

    let totalAgendados = 0;

    const now = new Date();

    // 1) Agendar as linhas NORMAIS
    for (const ag of normalRows) {
      const dataExec = new Date(ag.Data);
      if (dataExec.getTime() > now.getTime()) {
        scheduleAgendamento(ag);
        totalAgendados++;
      } else {
        addLog(`[Scheduler] (Normal) Ag ${ag.id} já passou a data. Não agendado.`);
      }
    }

    // 2) Agendar as linhas ESPECIAIS
    for (const ag of specialRows) {
      const dataParsed = new Date(ag.Data);

      // Pegar somente hora/min/seg
      const h = dataParsed.getHours();
      const m = dataParsed.getMinutes();
      const s = dataParsed.getSeconds();

      // Montar "hoje" com essa hora
      const today = new Date();
      today.setHours(h, m, s, 0);

      // Se já passou hoje, jogamos pra amanhã
      if (today.getTime() <= now.getTime()) {
        today.setDate(today.getDate() + 1);
        addLog(`[Scheduler] (Especial) Hora de agendamento ${ag.id} já passou hoje. Marcado para amanhã => ${today.toISOString()}`);
      }

      const finalAgendamento = {
        id: ag.id,
        Data: today.toISOString(),
        userID: ag.userID || "", // adicione se tiver userID
      };

      scheduleAgendamentoEspecial(finalAgendamento);
      totalAgendados++;
    }

    addLog(`[Scheduler] Total de post(s) agendado(s) agora: ${totalAgendados}`);
  } catch (error: any) {
    if (error.response) {
      addLog(`[Scheduler] Erro ao carregar agendamentos: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      addLog(`[Scheduler] Erro ao carregar agendamentos: ${error?.message || error}`);
    }
  }
}
