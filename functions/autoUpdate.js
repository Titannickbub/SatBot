const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");
const config = require("./config");

const rootDir = path.join(__dirname, "..");
const packagePath = path.join(rootDir, "package.json");
const remotePackageUrl = "https://raw.githubusercontent.com/Titannickbub/SatBot/main/package.json";

function readLocalPackage() {
    return JSON.parse(fs.readFileSync(packagePath, "utf8"));
}

function parseVersion(version) {
    const match = String(version || "").match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
}

function compareVersions(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    if (!a || !b) return null;
    for (let index = 0; index < 3; index += 1) {
        if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
    }
    return 0;
}

function fetchRemotePackage() {
    return new Promise((resolve, reject) => {
        const request = https.get(remotePackageUrl, { headers: { "User-Agent": "SatBot-auto-update" } }, (response) => {
            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`GitHub respondeu HTTP ${response.statusCode}`));
                return;
            }
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => { body += chunk; });
            response.on("end", () => {
                try {
                    resolve(JSON.parse(body));
                } catch {
                    reject(new Error("package.json remoto inválido"));
                }
            });
        });
        request.setTimeout(10_000, () => request.destroy(new Error("tempo esgotado ao consultar o GitHub")));
        request.on("error", reject);
    });
}

function isEnabled() {
    return config.getAutoUpdateEnabled();
}

function runUpdater() {
    const script = process.platform === "win32" ? "update.bat" : "update.sh";
    const scriptPath = path.join(rootDir, script);
    if (!fs.existsSync(scriptPath)) throw new Error(`${script} não encontrado`);
    const command = process.platform === "win32" ? scriptPath : "sh";
    const args = process.platform === "win32" ? [] : [scriptPath];
    const result = spawnSync(command, args, { cwd: rootDir, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`atualizador terminou com código ${result.status}`);
}

async function checkAndUpdate() {
    const local = readLocalPackage();
    console.log(`[AUTO-UPDATE] Status na inicialização: ${isEnabled() ? "ATIVADO" : "DESATIVADO"}.`);
    const status = await getVersionStatus(local);
    if (status.error) {
        console.warn(`[AUTO-UPDATE] ${status.error}`);
        return false;
    }
    if (status.comparison <= 0) {
        if (status.comparison < 0) {
            console.log(`[AUTO-UPDATE] GitHub está na versão ${status.remoteVersion}; local ${local.version} é mais nova. Atualização ignorada.`);
        }
        return false;
    }

    console.warn(`[AUTO-UPDATE] Nova versão disponível: ${status.remoteVersion} (local: ${local.version}).`);
    if (!isEnabled()) {
        console.warn("[AUTO-UPDATE] Auto Update desativado. Atualize manualmente com update.bat/update.sh ou ignore este aviso para permanecer na versão atual.");
        console.warn("[AUTO-UPDATE] Para ativar a atualização automática permanente, use !autoupdate on. Ela ocorrerá na próxima reinicialização.");
        return false;
    }

    console.log("[AUTO-UPDATE] Atualização ativada; executando o atualizador antes da inicialização.");
    runUpdater();
    return true;
}

async function getVersionStatus(local = readLocalPackage()) {
    let remote;
    try {
        remote = await fetchRemotePackage();
    } catch (error) {
        return { error: `Não foi possível consultar a versão do GitHub: ${error.message}` };
    }

    const comparison = compareVersions(remote.version, local.version);
    if (comparison === null) {
        return {
            error: `Versão inválida para comparação (local=${local.version}, GitHub=${remote.version}).`
        };
    }
    return { comparison, localVersion: local.version, remoteVersion: remote.version };
}

module.exports = { checkAndUpdate, getVersionStatus, isEnabled, readLocalPackage };
