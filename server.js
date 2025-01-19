// server.js
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { spawn } = require("child_process");

// Variável que indica se está em modo desenvolvimento
const dev = process.env.NODE_ENV !== "production";

// Inicializa o app Next
const app = next({ dev });
const handle = app.getRequestHandler();

// Quando o Next estiver pronto, iniciamos nosso server
app.prepare().then(() => {
  // Cria um servidor HTTP simples
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Armazenamos as conexões ativas para fechá-las adequadamente depois
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
    console.log("> [server] Servidor rodando em https://moving-eagle-bright.ngrok-free.app");
  });

  // ---------------------------------------------------------------
  // SPANW DOS WORKERS
  // ---------------------------------------------------------------

  // Exemplo: Worker de agendamento
  const workerAgendamento = spawn(
    "ts-node",
    ["-r", "tsconfig-paths/register", "worker/agendamento.worker.ts"],
    {
      shell: true,
      stdio: "inherit", // se quiser ver os logs no console principal
    }
  );

  // Worker do Instagram webhook
  const workerInstagram = spawn(
    "ts-node",
    ["-r", "tsconfig-paths/register", "worker/instagram-webhook.worker.ts"],
    {
      shell: true,
      stdio: "inherit",
    }
  );

  // ---------------------------------------------------------------
  // SPAWN DO NGROK
  // ---------------------------------------------------------------
  // Se você quer forçar usar o subdomínio do ngrok (ex: moving-eagle-bright.ngrok-free.app),
  // a linha abaixo pode precisar de ajustes, dependendo do seu plano e config.
  // Na forma mais simples, bastaria spawn("ngrok", ["http", "3000"]);
  //
  // Caso queira tentar forçar um host, algo assim (mas pode não funcionar no plano free):
  // spawn("ngrok", ["http", "--hostname=moving-eagle-bright.ngrok-free.app", "3000"]);
  //
  // Vou deixar um exemplo genérico (sem hostname fixo).
  const ngrokProcess = spawn(
    "ngrok",
    [
      "http",
      "--region=sa",
      "--hostname=moving-eagle-bright.ngrok-free.app",
      "3000",
    ],
    {
      shell: true,
      stdio: "pipe",
    }
  );


  // Se quiser ver o que o ngrok está falando no console principal:
  ngrokProcess.stdout.on("data", (data) => {
    console.log(`[ngrok] ${data}`);
  });
  ngrokProcess.stderr.on("data", (data) => {
    console.error(`[ngrok-err] ${data}`);
  });

  // ---------------------------------------------------------------
  // FUNÇÃO DE ENCERRAMENTO LIMPO (CTRL + C, SIGINT, SIGTERM, ETC)
  // ---------------------------------------------------------------
  function shutdown() {
    console.log("> [server] Encerrando servidor e workers...");

    // 1) Fecha conexões ativas
    for (const conn of connections) {
      conn.destroy();
    }

    // 2) Fecha o servidor
    server.close(() => {
      console.log("> [server] Servidor encerrado.");

      // 3) Mata os workers
      workerAgendamento.kill();
      workerInstagram.kill();
      ngrokProcess.kill();

      // 4) Encerra o processo principal
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
