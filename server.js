// server.js novo
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { spawn } = require("child_process");
const path = require("path");

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

  // Armazena conexões ativas para encerramento limpa
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

  if (dev && !process.env.RUN_IN_DOCKER) {
    // ---------------------------------------------------------------
    // SPAWN DOS WORKERS (apenas em desenvolvimento local)
    // ---------------------------------------------------------------

    const npxPath = path.join(process.cwd(), 'node_modules', '.bin', 'npx');

    // Bull Board (que por sua vez inicializa seus próprios workers)
    const bullBoardServer = spawn(
      npxPath,
      ["ts-node", "-r", "tsconfig-paths/register", "bull-board-server.ts"],
      { shell: true, stdio: "inherit" }
    );

    // Worker de automação (caso queira rodar separado)
    const workerInstagram = spawn(
      npxPath,
      ["ts-node", "-r", "tsconfig-paths/register", "worker/automacao.worker.ts"],
      { shell: true, stdio: "inherit" }
    );

    // ngrok removido - agora é um serviço Docker separado

    // função de shutdown encerra também esses spawns
    function shutdown() {
      console.log("> [server] Encerrando servidor e workers...");
      for (const conn of connections) conn.destroy();
      server.close(() => {
        console.log("> [server] Servidor encerrado.");
        bullBoardServer.kill();
        workerInstagram.kill();
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
