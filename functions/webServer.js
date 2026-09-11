const http = require("http");

const DEFAULT_PORT = 32013;

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SatBot - teste de acesso</title>
</head>
<body>
  <h1>Funcionou!</h1>
  <p>O site temporário do SatBot está acessível.</p>
</body>
</html>`;

function getPort() {
  const configuredPort = Number.parseInt(process.env.PORT || "", 10);
  return Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
    ? configuredPort
    : DEFAULT_PORT;
}

function start() {
  const port = getPort();
  const server = http.createServer((request, response) => {
    if (request.method !== "GET" || (request.url !== "/" && request.url !== "/index.html")) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  });

  server.on("error", (error) => {
    console.error(`[WEB] Falha ao iniciar o site na porta ${port}:`, error);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[WEB] Site de teste disponível na porta ${port}.`);
  });

  return server;
}

module.exports = { start };
