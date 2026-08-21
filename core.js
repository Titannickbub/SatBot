const fs = require("fs");
const path = require("path");

const authFlow = require("./functions/authFlow");

const commands = {};
const platforms = [];
const platformRegistry = {};
const functions = {};
const middlewares = [];

const status = {
    startedAt: null
};

function loadFunctions() {

    const functionsDir =
        path.join(
            __dirname,
            "functions"
        );

    if (
        !fs.existsSync(
            functionsDir
        )
    ) {

        return;

    }

    const files =
        fs.readdirSync(
            functionsDir
        )
        .filter(
            file =>
                file.endsWith(".js")
        );

    for (const file of files) {

        const name =
            file.replace(
                ".js",
                ""
            );

        try {
            functions[name] =
                require(
                    path.join(
                        functionsDir,
                        file
                    )
                );

            console.log(
                `✅[CORE] Função carregada: ${name}`
            );
        } catch (err) {
            console.error(
                `❌[CORE] Falha ao carregar função: ${name}`,
                err
            );
            continue;
        }

    }

}

function loadMiddlewares() {

    const middlewaresDir = path.join(__dirname, "middlewares");

    if (!fs.existsSync(middlewaresDir)) {
        return;
    }

    const files = fs.readdirSync(middlewaresDir)
        .filter(file => file.endsWith(".js"));

    for (const file of files) {

        const name = file.replace(".js", "");

        try {
            const middleware = require(path.join(middlewaresDir, file));
            if (middleware.name && typeof middleware.execute === "function") {
                middlewares.push(middleware);
                console.log(`✅[CORE] Middleware carregado: ${middleware.name}`);
            } else {
                console.warn(`❌[CORE] Middleware inválido em: ${file}`);
            }
        } catch (err) {
            console.error(`❌[CORE] Falha ao carregar middleware: ${name}`, err);
        }

    }

    // Ordena os middlewares por prioridade (do maior para o menor)
    middlewares.sort((a, b) => (b.priority || 0) - (a.priority || 0));

}

function getCommandFiles(dir) {

    let results = [];

    if (!fs.existsSync(dir)) {
        return results;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {

        const fullPath = path.join(dir, file);

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {

            results = results.concat(
                getCommandFiles(fullPath)
            );

        } else if (file.endsWith(".js")) {

            results.push(fullPath);

        }

    }

    return results;

}


function loadCommands() {

    const commandsDir = path.join(
        __dirname,
        "commands"
    );

    const files = getCommandFiles(
        commandsDir
    );

    for (const file of files) {

        let command;

        try {
            command = require(file);
        } catch (err) {
            console.error(
                `❌[CORE] Falha ao carregar comando: ${file}`,
                err
            );
            continue;
        }

        if (
            !command.name ||
            !command.execute
        ) {

            console.warn(
                `❌[CORE] Comando inválido: ${file}`
            );

            continue;

        }

        const relativePath = path.relative(
            commandsDir,
            file
        );

        const parts = relativePath.split(path.sep);

        const category =
            command.category ||
            (
                parts.length > 1
                    ? parts[0]
                    : null
            );

        const commandKey = command.name.toLowerCase();
        const commandEntry = {
            ...command,
            category,
            file: relativePath
        };
        commands[commandKey] = commandEntry;

        if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
                if (!alias || typeof alias !== 'string') continue;
                const aliasKey = alias.toLowerCase();
                if (commands[aliasKey] && commands[aliasKey] !== commandEntry) {
                    console.warn(`❌[CORE] Alias de comando já em uso: ${aliasKey}`);
                    continue;
                }
                commands[aliasKey] = commandEntry;
            }
        }

        console.log(
            `✅[CORE] Comando carregado: ${command.name} > ${category || "Raiz" }`
        );

    }

}

function loadPlatforms() {

    const platformsDir = path.join(__dirname, "platforms");

    if (!fs.existsSync(platformsDir)) {
        return;
    }

    const files = fs.readdirSync(platformsDir)
        .filter(file => file.endsWith(".js"));
        
    const config =
        functions.config &&
        typeof functions.config.getConfig === "function"
            ? functions.config.getConfig()
            : {};
    const platformsConfig =
        config.platforms || {};

    for (const file of files) {

        const platformName =
            file.replace(
                ".js",
                ""
            );

        if (
            platformsConfig[
                platformName
            ] === false
        ) {

        console.log(
            `⛔[CORE] Plataforma desativada: ${platformName}`
        );

        continue;

    }

    let platform;
    try {
        platform = require(
            path.join(
                platformsDir,
                file
            )
        );
    } catch (err) {
        console.error(
            `❌[CORE] Falha ao carregar plataforma: ${platformName}`,
            err
        );
        continue;
    }

    platforms.push(platform);
    if (platform.name) {

        platformRegistry[
            platform.name
        ] = platform;

    }
    console.log(
        `✅[CORE] Plataforma carregada: ${file}`
    );

}

}

async function handleMessage(message) {


console.log(
        `📩[${message.platform}] ${message.username || "desconhecido"} (${message.userId}): ${message.text}`
    );
    
    const config =
        functions.config &&
        typeof functions.config.getConfig === "function"
            ? functions.config.getConfig()
            : {};

    const ignoreInitialSeconds = typeof config.ignoreInitialSeconds === "number" ? config.ignoreInitialSeconds : 30;
    const uptime = status.startedAt ? Date.now() - status.startedAt : 0;
    if (uptime < ignoreInitialSeconds * 1000) {
        const formatTime = functions.config && typeof functions.config.formatTimeString === "function"
            ? functions.config.formatTimeString(ignoreInitialSeconds)
            : `${ignoreInitialSeconds}s`;
        console.log(`⏳[CORE] Mensagem ignorada (carregamento inicial / warmup: ${(uptime / 1000).toFixed(1)}s / ${formatTime})`);
        return;
    }

    const text = message.text || "";
    message.prefix =
        config.prefix || "!";
    
    message.functions =
    functions;
    message.platforms =
    platforms;

    // Garantir que o usuário tenha uma Conta Central (criada ao enviar qualquer mensagem)
    try {
        const store = functions.centralAccounts || global.centralAccounts;
        if (store && typeof store.getOrCreateByPlatform === 'function') {
            store.getOrCreateByPlatform(message.platform, message.userId, { username: message.username, displayName: message.displayName || message.name }).then(async (central) => {
                const crossplayStore = functions.crossplay || global.crossplayStore;
                if (crossplayStore && typeof crossplayStore.ensureCentral === 'function') {
                    await crossplayStore.ensureCentral(central.id, { name: central.name }).catch(err => {
                        console.error('❌[CORE] Crossplay ensureCentral error:', err);
                    });
                }
            }).catch(err => {
                console.error('❌[CORE] CentralAccounts error:', err);
            });
        }
    } catch (err) {
        console.error('❌[CORE] Erro ao garantir Conta Central:', err);
    }

    message.sender = message.sender || { isAdmin: false, canManageMessages: false };
    message.sender.isOwner = functions.owners ? functions.owners.isOwner(message) : false;
    if (message.sender.isOwner) {
        message.sender.isAdmin = true;
        message.sender.canManageMessages = true;
    }

    for (const middleware of middlewares) {
        if (middleware.runOn === "all" || !middleware.runOn) {
            try {
                const continueExecution = await middleware.execute(message);
                if (continueExecution === false) {
                    return;
                }
            } catch (err) {
                console.error(`❌[CORE] Erro ao executar middleware '${middleware.name}':`, err);
            }
        }
    }

    const crossplayStore = functions.crossplay || global.crossplayStore;
    if (crossplayStore && typeof crossplayStore.relayIncomingMessage === 'function') {
        try {
            await crossplayStore.relayIncomingMessage(message);
        } catch (err) {
            console.error('❌[CORE] Crossplay relay error:', err);
        }
    }

    if (!text.startsWith(message.prefix)) {
        return;
    }

const parts = text
    .trim()
    .split(/\s+/);

const commandName = parts[0]
    .replace(message.prefix, "")
    .toLowerCase();
    
    message.command = commandName;

message.args = parts.slice(1);

message.uptime =
    Date.now() - status.startedAt;

    message.messagePing =
    typeof message.createdAt === "number"
        ? Date.now() - message.createdAt
        : 0;
    
message.core = {

    startedAt:
        status.startedAt,

    uptime:
        message.uptime,
    
    config

};

    
    const command = commands[commandName];

    if (!command) {
        return;
    }

    for (const middleware of middlewares) {
        if (middleware.runOn === "command") {
            try {
                const continueExecution = await middleware.execute(message);
                if (continueExecution === false) {
                    return;
                }
            } catch (err) {
                console.error(`❌[CORE] Erro ao executar middleware '${middleware.name}':`, err);
            }
        }
    }

    try {

        await command.execute(message);

    } catch (err) {

        console.error(err);

        await message.reply({
            text: "❌ Erro interno."
        });

    }
}

async function start() {

    status.startedAt = Date.now();

    loadMiddlewares();
    loadFunctions();

    // Inicializa o módulo de contas centralizadas definido em `functions/centralAccounts.js` (se presente)
    if (functions.centralAccounts && typeof functions.centralAccounts.init === 'function') {
        const dataFile = path.join(__dirname, 'data', 'central-accounts.json');
        try {
            await functions.centralAccounts.init(dataFile);
            functions.centralAccounts.startAutoSave(300_000); // 5 minutos
            functions.centralAccounts.startCleanup(); // rotina diária de limpeza (>30 dias)
            global.centralAccounts = functions.centralAccounts;

            const saveAndExit = async () => {
                try {
                    await functions.centralAccounts.stop();
                    process.exit(0);
                } catch (err) {
                    process.exit(1);
                }
            };
            process.on('SIGINT', saveAndExit);
            process.on('SIGTERM', saveAndExit);
        } catch (err) {
            console.error('❌[CORE] Falha ao inicializar functions.centralAccounts:', err);
        }
    }

    if (functions.crossplay && typeof functions.crossplay.init === 'function') {
        const dataFile = path.join(__dirname, 'data', 'crossplay.json');
        try {
            const crossplayStore = functions.crossplay.crossplayStore || functions.crossplay;
            await crossplayStore.init(dataFile);
            crossplayStore.startAutoSave(300_000);
            global.crossplayStore = crossplayStore;
            functions.crossplay = crossplayStore;
        } catch (err) {
            console.error('❌[CORE] Falha ao inicializar functions.crossplay:', err);
        }
    }

    if (functions.config) {
        functions.config.syncPlatforms();
    }

    loadCommands();
    loadPlatforms();
    global.platformRegistry = platformRegistry;

    if (functions.owners && !functions.owners.hasOwners()) {
        const code = functions.owners.generateCode();
        console.log("");
        console.log("=================================");
        console.log("[SU] Nenhum Super Usuário encontrado.");
        console.log(`[SU] Código: ${code}`);
        console.log("=================================");
        console.log("");
    }

    const bootstrap = await authFlow.handleInitialBootstrap();
    if (bootstrap.status === "bootstrap") {
        global.__pendingAuthBootstrapPlatform = bootstrap.platform;
        console.log(`[AUTH] Bootstrap da plataforma: ${bootstrap.platform}`);
    } else if (bootstrap.status === "skipped") {
        global.__pendingAuthBootstrapPlatform = null;
        console.log("[AUTH] Nenhuma plataforma foi configurada para iniciar neste ciclo.");
    }

    console.log(`✅[CORE] Plataformas carregadas (count=${platforms.length}): ${platforms.map((p, i) => `#${i}:${Object.keys(p).join(',') || 'module'}`).join(' | ')}`);

    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const name = platform && (platform.name || platform.file || "unknown");
        const isEnabled = authFlow.isPlatformEnabled(name);
        if (!isEnabled) {
            console.log(`⏭️[CORE] Plataforma ignorada por configuração: ${name}`);
            continue;
        }
        console.log(`♻️[CORE] Iniciando plataforma [${i}]: ${name}`);
        try {
            await platform.start(handleMessage);
            console.log(`✅[CORE] Plataforma [${i}] inicializada: ${name}`);
        } catch (err) {
            console.error(`❌[CORE] Erro ao iniciar plataforma [${name}]:`, err.message || err);
        }
    }

    console.log("🔛[CORE] Satella online.");

    // Inicia o motor de agendamentos em background
    try {
        const schedulerHelper = require("./functions/schedulerHelper");
        schedulerHelper.startScheduler();
    } catch (err) {
        console.error("❌[CORE] Falha ao iniciar o motor de agendamentos:", err.message || err);
    }

    try {
        const cafeMonitor = require("./functions/cafeMonitor");
        cafeMonitor.startMonitorLoop();
    } catch (err) {
        console.error("❌[CORE] Falha ao iniciar o monitor do café:", err.message || err);
    }
}

function getCommands() {
    return commands;
}

function getFunctions() {

    return functions;

}

module.exports = {

    start,
    status,

    getCommands,
    getFunctions,
    handleMessage

};