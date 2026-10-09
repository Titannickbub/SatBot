const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const ignoredDirs = ["node_modules", ".git"];

function isIgnoredFile(filename) {
  const normalized = filename.replace(/\\/g, "/");
  return ignoredDirs.some(dir => normalized.includes(`${dir}/`));
}

let restartTimer = null;

function scheduleRestart(file) {
  if (restartTimer) {
    return;
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    console.log(`🗃️[WATCHER] Arquivo alterado: ${file}. Efetuando Cold Boot...`);
    process.exit(0);
  }, 200);
}

const watcher = fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
  if (!filename || path.extname(filename) !== ".js") {
    return;
  }

  if (isIgnoredFile(filename)) {
    return;
  }

  scheduleRestart(filename);
});

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  watcher.close();
  process.exit(0);
});

const config = require("./functions/config");
process.env.TZ = config.getTimezone() || "America/Sao_Paulo";

require("./functions/webServer").start();

const { checkAndUpdate } = require("./functions/autoUpdate");

checkAndUpdate()
  .then((updated) => {
    if (updated) {
      process.exit(0);
      return;
    }
    const core = require("./core");
    return core.start();
  })
  .catch((error) => {
    console.error("[AUTO-UPDATE] Falha inesperada:", error);
    const core = require("./core");
    return core.start();
  });