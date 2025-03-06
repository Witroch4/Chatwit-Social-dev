// server.js novo
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { spawn } = require("child_process");

// Verifica se está em ambiente de desenvolvimento
const dev = process.env.NODE_ENV !== "production";

// Inicializa o app Next
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Cria um servidor HTTP simples
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Armazena conexões ativas para encerramento limpo
  const connections = new Set();
  server.on("connection", (socket) => {
    connections.add(socket);
    socket.on("close", () => {
      connections.delete(socket);
    });
  });

  // Inicia o servidor na porta 3000
  server.listen(3000, (err) => {
    if (err) throw err;
    console.log(
      `> [server] Servidor rodando na porta 3000 ${dev ? "(modo desenvolvimento)" : "(produção)"}`
    );
  });

  if (dev) {
    // ---------------------------------------------------------------
    // SPAWN DOS WORKERS (apenas em desenvolvimento)
    // ---------------------------------------------------------------
    const workerAgendamento = spawn(
      "ts-node",
      ["-r", "tsconfig-paths/register", "worker/agendamento.worker.ts"],
      {
        shell: true,
        stdio: "inherit", // exibe os logs no console principal
      }
    );

    const workerInstagram = spawn(
      "ts-node",
      ["-r", "tsconfig-paths/register", "worker/instagram-webhook.worker.ts"],
      {
        shell: true,
        stdio: "inherit",
      }
    );

    // ---------------------------------------------------------------
    // SPAWN DO NGROK (apenas em desenvolvimento)
    // ---------------------------------------------------------------
    const ngrokProcess = spawn(
      "ngrok",
      [
        "http",
        "--region=sa",
        "--hostname=wondrous-climbing-mallard.ngrok-free.app",
        "3000",
      ],
      {
        shell: true,
        stdio: "pipe",
      }
    );

    ngrokProcess.stdout.on("data", (data) => {
      console.log(`[ngrok] ${data}`);
    });
    ngrokProcess.stderr.on("data", (data) => {
      console.error(`[ngrok-err] ${data}`);
    });

    // Função de encerramento que finaliza servidor e workers
    function shutdown() {
      console.log("> [server] Encerrando servidor e workers...");

      // Fecha conexões ativas
      for (const conn of connections) {
        conn.destroy();
      }

      server.close(() => {
        console.log("> [server] Servidor encerrado.");

        // Mata os workers e o processo do ngrok
        workerAgendamento.kill();
        workerInstagram.kill();
        ngrokProcess.kill();

        process.exit(0);
      });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else {
    // Em produção, apenas o servidor é iniciado
    function shutdown() {
      console.log("> [server] Encerrando servidor...");

      for (const conn of connections) {
        conn.destroy();
      }

      server.close(() => {
        console.log("> [server] Servidor encerrado.");
        process.exit(0);
      });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
});
