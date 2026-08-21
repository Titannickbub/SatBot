const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const readline = require("readline");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "..", "settings", ".env");
const whatsappAuthDir = path.join(__dirname, "..", "settings", "whatsapp-auth");

function ensureEnvFile() {
    if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, "", "utf8");
    }
    return envPath;
}

function loadEnvValues() {
    ensureEnvFile();
    if (!fs.existsSync(envPath)) {
        return {};
    }
    const raw = fs.readFileSync(envPath, "utf8");
    return dotenv.parse(raw);
}

function getEnvValue(key) {
    const values = loadEnvValues();
    const value = values[key] || process.env[key];
    return value ? String(value) : "";
}

function setEnvValue(key, value) {
    ensureEnvFile();
    const values = loadEnvValues();
    const normalizedValue = String(value).trim();
    values[key] = normalizedValue;
    process.env[key] = normalizedValue;

    const lines = [];
    for (const [name, rawValue] of Object.entries(values)) {
        if (name && typeof rawValue !== "undefined") {
            lines.push(`${name}=${String(rawValue)}`);
        }
    }

    fs.writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");
}

function getEnabledPlatforms() {
    const config = require("./config").getConfig();
    const platforms = ["discord", "telegram", "whatsapp"];
    return platforms.filter(platform => config.platforms?.[platform] !== false);
}

function ensureWhatsAppAuthFolder(authFolderPath) {
    const resolvedPath = path.resolve(authFolderPath);
    const folderName = path.basename(resolvedPath);
    const parentDir = path.dirname(resolvedPath);
    const archiveCandidates = [
        path.join(parentDir, `${folderName}.zip`),
        path.join(parentDir, `${folderName}.tgz`),
        path.join(parentDir, `${folderName}.tar.gz`)
    ];

    if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
    }

    const hasExistingFiles = fs.existsSync(resolvedPath) && fs.readdirSync(resolvedPath).some(entry => entry && entry !== "." && entry !== "..");
    if (hasExistingFiles) {
        return { authFolder: resolvedPath, extracted: false, archivePath: null };
    }

    const archivePath = archiveCandidates.find(candidate => fs.existsSync(candidate));
    if (!archivePath) {
        return { authFolder: resolvedPath, extracted: false, archivePath: null };
    }

    try {
        if (process.platform === "win32") {
            execFileSync("powershell", [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                `Expand-Archive -Path "${archivePath}" -DestinationPath "${resolvedPath}" -Force`
            ], { stdio: "pipe" });
        } else {
            execFileSync("unzip", ["-o", archivePath, "-d", resolvedPath], { stdio: "pipe" });
        }

        return { authFolder: resolvedPath, extracted: true, archivePath };
    } catch (err) {
        console.error("[AUTH] Falha ao descompactar o zip de credenciais do WhatsApp:", err);
        return { authFolder: resolvedPath, extracted: false, archivePath };
    }
}

function inspectWhatsAppAuthState(authFolderPath) {
    const resolvedPath = path.resolve(authFolderPath);
    const exists = fs.existsSync(resolvedPath);
    const entries = exists ? fs.readdirSync(resolvedPath).filter(entry => entry && entry !== "." && entry !== "..") : [];
    const hasAnyData = entries.length > 0;
    const hasCredsFile = entries.includes("creds.json");
    const hasAppStateFiles = entries.some(entry => entry.startsWith("app-state") || entry.includes("app-state"));
    const hasSessionFiles = entries.some(entry => entry.includes("session") || entry.includes("sender") || entry.endsWith(".json"));
    const likelyValid = hasCredsFile && (hasAppStateFiles || hasSessionFiles);

    let reason = "sem arquivos de sessão";
    if (!exists) {
        reason = "pasta de auth não existe";
    } else if (!hasAnyData) {
        reason = "pasta de auth está vazia";
    } else if (!hasCredsFile) {
        reason = "faltando creds.json";
    } else if (!hasAppStateFiles && !hasSessionFiles) {
        reason = "arquivos de sessão ausentes";
    }

    return {
        authFolder: resolvedPath,
        exists,
        entries,
        hasAnyData,
        hasCredsFile,
        hasAppStateFiles,
        hasSessionFiles,
        likelyValid,
        reason
    };
}

function isPlatformEnabled(platform) {
    return getEnabledPlatforms().includes(platform);
}

function isPlatformLoggedIn(platform) {
    if (!isPlatformEnabled(platform)) {
        return false;
    }

    if (platform === "discord") {
        return Boolean(getEnvValue("DISCORD_TOKEN"));
    }

    if (platform === "telegram") {
        return Boolean(getEnvValue("TELEGRAM_TOKEN"));
    }

    if (platform === "whatsapp") {
        if (!fs.existsSync(whatsappAuthDir)) {
            return false;
        }
        const entries = fs.readdirSync(whatsappAuthDir).filter(Boolean);
        return entries.length > 0;
    }

    return false;
}

function getLoggedPlatforms() {
    return getEnabledPlatforms().filter(isPlatformLoggedIn);
}

function writePlatformToken(platform, token) {
    if (platform === "discord") {
        setEnvValue("DISCORD_TOKEN", token);
        return true;
    }
    if (platform === "telegram") {
        setEnvValue("TELEGRAM_TOKEN", token);
        return true;
    }
    return false;
}

function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

async function askQuestion(question) {
    if (!process.stdin.isTTY) {
        return "";
    }

    const rl = createReadlineInterface();
    try {
        return await new Promise(resolve => {
            rl.question(question, answer => resolve(answer.trim()));
        });
    } finally {
        rl.close();
    }
}

async function promptForInitialPlatform() {
    const enabledPlatforms = getEnabledPlatforms();
    if (!enabledPlatforms.length) {
        return null;
    }

    if (enabledPlatforms.length === 1) {
        return enabledPlatforms[0];
    }

    console.log("[AUTH] Nenhuma plataforma autenticada. Escolha uma para iniciar:");
    enabledPlatforms.forEach((platform, index) => {
        const label = platform === "discord" ? "Discord" : platform === "telegram" ? "Telegram" : "WhatsApp";
        console.log(`  ${index + 1}. ${label}`);
    });

    const answer = await askQuestion("Digite o número da plataforma: ");
    const selection = Number(answer);
    if (!Number.isInteger(selection)) {
        return null;
    }

    return enabledPlatforms[selection - 1] || null;
}

async function promptForPlatformToken(platform) {
    const label = platform === "discord" ? "Discord" : platform === "telegram" ? "Telegram" : "WhatsApp";
    console.log(`[AUTH] Informe o token de ${label}.`);
    return askQuestion(`${label} token: `);
}

async function handleInitialBootstrap() {
    const loggedPlatforms = getLoggedPlatforms();
    if (loggedPlatforms.length > 0) {
        return { status: "ready", platform: null };
    }

    const selectedPlatform = await promptForInitialPlatform();
    if (!selectedPlatform) {
        return { status: "skipped", platform: null };
    }

    if (selectedPlatform === "whatsapp") {
        return { status: "bootstrap", platform: "whatsapp" };
    }

    const token = await promptForPlatformToken(selectedPlatform);
    if (!token) {
        return { status: "skipped", platform: null };
    }

    writePlatformToken(selectedPlatform, token);
    return { status: "bootstrap", platform: selectedPlatform };
}

module.exports = {
    getEnabledPlatforms,
    ensureWhatsAppAuthFolder,
    inspectWhatsAppAuthState,
    isPlatformEnabled,
    isPlatformLoggedIn,
    getLoggedPlatforms,
    writePlatformToken,
    handleInitialBootstrap,
    promptForInitialPlatform,
    promptForPlatformToken,
    getEnvValue
};
