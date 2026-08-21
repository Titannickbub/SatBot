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

process.env.TZ = "America/Sao_Paulo";

const core = require("./core");

core.start();