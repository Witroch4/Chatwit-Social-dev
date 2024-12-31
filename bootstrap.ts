// bootstrap.ts
import * as dotenv from "dotenv";
dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

import { spawn } from "child_process";
import { loadAllAgendamentosPendentes } from "./lib/scheduler.ts.old";

async function main() {
  // Verificar se as variáveis essenciais estão definidas
  if (!process.env.BASEROW_TABLE_ID || !process.env.BASEROW_TOKEN) {
    console.warn(
      "[Bootstrap] ATENÇÃO: BASEROW_TABLE_ID ou BASEROW_TOKEN não está definido! " +
      "As requisições para o Baserow falharão."
    );
    // Opcional: você pode optar por encerrar o processo aqui
    // process.exit(1);
  }

  console.log("[Bootstrap] Carregando agendamentos pendentes...");
  try {
    await loadAllAgendamentosPendentes();
    console.log("[Bootstrap] Agendamentos pendentes recarregados com sucesso.");
  } catch (err) {
    console.error("[Bootstrap] Erro ao carregar agendamentos pendentes:", err);
  }

  // Agora iniciar o servidor
  console.log("[Bootstrap] Iniciando servidor...");

  // Chama "node server.js" diretamente para evitar depender do 'npm' no PATH
  const child = spawn("node", ["server.js"], { stdio: "inherit" });

  child.on("exit", (code) => {
    console.log(`[Bootstrap] Servidor finalizado com código ${code}`);
    process.exit(code ?? 1);
  });

  // Opcional: Capturar erros no child process
  child.on("error", (error) => {
    console.error("[Bootstrap] Erro ao iniciar o servidor:", error);
    process.exit(1);
  });
}

main();
