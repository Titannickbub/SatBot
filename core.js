const fs = require("fs");
const path = require("path");

/** Retorna a hora atual no formato [HH:MM:SS] */
function _ts() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `[${hh}:${mm}:${ss}]`;
}

const authFlow = require("./functions/authFlow");

const commands = {};
const platforms = [];
const platformRegistry = {};
const functions = {};
const middlewares = [];
const COMPONENT_MESSAGE_CONTEXT = Symbol.for("satbot.componentMessageContext");

function normalizeCommandName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim();
}

function migrateLegacyDataFiles() {
    const settingsDir = path.join(__dirname, "settings");
    const migrations = [
        {
            name: "central accounts",
            legacyPaths: [
                path.join(__dirname, "config", "central-accounts.json"),
                path.join(__dirname, "data", "central-accounts.json")
            ],
            currentPath: path.join(settingsDir, "central-accounts.json"),
            normalize(data) {
                return {
                    centralAccounts: data && typeof data.centralAccounts === "object" ? data.centralAccounts : {},
                    mergeCodes: data && typeof data.mergeCodes === "object" ? data.mergeCodes : {}
                };
            }
        },
        {
            name: "crossplay",
            legacyPaths: [
                path.join(__dirname, "config", "crossplay.json"),
                path.join(__dirname, "data", "crossplay.json")
            ],
            currentPath: path.join(settingsDir, "crossplay.json"),
            normalize(data) {
                return {
                    crossplayGroups: data && typeof data.crossplayGroups === "object" ? data.crossplayGroups : {},
                    linkCodes: data && typeof data.linkCodes === "object" ? data.linkCodes : {},
                    recentHistory: data && typeof data.recentHistory === "object" ? data.recentHistory : {}
                };
            }
        }
    ];

    for (const migration of migrations) {
        const legacyPath = migration.legacyPaths.find(candidate => fs.existsSync(candidate));
        if (!legacyPath) {
            continue;
        }

        if (!fs.existsSync(migration.currentPath)) {
            const legacyData = JSON.parse(fs.readFileSync(legacyPath, "utf8") || "{}");
            const normalizedData = migration.normalize(legacyData);
            fs.mkdirSync(settingsDir, { recursive: true });

            const temporaryPath = `${migration.currentPath}.tmp`;
            fs.writeFileSync(temporaryPath, JSON.stringify(normalizedData, null, 2), "utf8");
            fs.renameSync(temporaryPath, migration.currentPath);
            console.log(`${_ts()} ✅[CORE] Dados de ${migration.name} migrados para settings/.`);
        }

        const convertedData = JSON.parse(fs.readFileSync(migration.currentPath, "utf8") || "{}");
        const normalizedData = migration.normalize(convertedData);
        if (JSON.stringify(convertedData) !== JSON.stringify(normalizedData)) {
            throw new Error(`Migração de ${migration.name} gerou um arquivo inválido.`);
        }

        fs.unlinkSync(legacyPath);
        console.log(`${_ts()} ✅[CORE] Arquivo legado de ${migration.name} removido com segurança.`);
    }

    for (const legacyDirName of ["data", "config"]) {
        const legacyDir = path.join(__dirname, legacyDirName);
        if (fs.existsSync(legacyDir) && fs.readdirSync(legacyDir).length === 0) {
            fs.rmdirSync(legacyDir);
            console.log(`${_ts()} ✅[CORE] Pasta ${legacyDirName} antiga removida.`);
        }
    }
}

const status = {
    startedAt: null,
    initialSetup: false
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
                `${_ts()} ✅[CORE] Função carregada: ${name}`
            );
        } catch (err) {
            console.error(
                `${_ts()} ❌[CORE] Falha ao carregar função: ${name}`,
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
                console.log(`${_ts()} ✅[CORE] Middleware carregado: ${middleware.name}`);
            } else {
                console.warn(`${_ts()} ❌[CORE] Middleware inválido em: ${file}`);
            }
        } catch (err) {
            console.error(`${_ts()} ❌[CORE] Falha ao carregar middleware: ${name}`, err);
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

        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch (error) {
            if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
            console.warn(
                `${_ts()} ⚠️[CORE] Caminho listado, mas indisponível; ignorando: ${fullPath}`
            );
            continue;
        }

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
                `${_ts()} ❌[CORE] Falha ao carregar comando: ${file}`,
                err
            );
            continue;
        }

        if (
            !command.name ||
            !command.execute
        ) {

            console.warn(
                `${_ts()} ❌[CORE] Comando inválido: ${file}`
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

        const commandKey = normalizeCommandName(command.name);
        const commandEntry = {
            ...command,
            category,
            file: relativePath
        };
        commands[commandKey] = commandEntry;

        if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
                if (!alias || typeof alias !== 'string') continue;
                const aliasKey = normalizeCommandName(alias);
                if (commands[aliasKey] && commands[aliasKey] !== commandEntry) {
                    console.warn(`${_ts()} ❌[CORE] Alias de comando já em uso: ${aliasKey}`);
                    continue;
                }
                commands[aliasKey] = commandEntry;
            }
        }

        console.log(
            `${_ts()} ✅[CORE] Comando carregado: ${command.name} > ${category || "Raiz" }`
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
            `${_ts()} ⛔[CORE] Plataforma desativada: ${platformName}`
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
            `${_ts()} ❌[CORE] Falha ao carregar plataforma: ${platformName}`,
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
        `${_ts()} ✅[CORE] Plataforma carregada: ${file}`
    );

}

}

async function handleMessage(message) {

    const config =
        functions.config &&
        typeof functions.config.getConfig === "function"
            ? functions.config.getConfig()
            : {};
    const configuredPrefix = config.prefix || "!";
    const incomingText = String(message.text || "");
    const incomingCommand = incomingText.trim().split(/\s+/, 1)[0].toLowerCase();
    const isSensitiveCommand = incomingCommand === `${configuredPrefix}redefinir_senha`.toLowerCase();
    message.isSensitiveCommand = isSensitiveCommand;

console.log(
        `${_ts()} 📩[${message.platform}] ${message.username || "desconhecido"} (${message.userId}): ${isSensitiveCommand ? `${configuredPrefix}redefinir_senha [credenciais ocultas]` : message.text}`
    );

    const ignoreInitialSeconds = typeof config.ignoreInitialSeconds === "number" ? config.ignoreInitialSeconds : 30;
    const uptime = status.startedAt ? Date.now() - status.startedAt : 0;
    if (!status.initialSetup && uptime < ignoreInitialSeconds * 1000) {
        const formatTime = functions.config && typeof functions.config.formatTimeString === "function"
            ? functions.config.formatTimeString(ignoreInitialSeconds)
            : `${ignoreInitialSeconds}s`;
        console.log(`${_ts()} ⏳[CORE] Mensagem ignorada (carregamento inicial / warmup: ${(uptime / 1000).toFixed(1)}s / ${formatTime})`);
        return;
    }

    message.prefix =
        configuredPrefix;
    const prefix = message.prefix;
    const originalText = message.text || "";
    const text = originalText.startsWith(prefix)
        ? `${prefix}${originalText.slice(prefix.length).trimStart()}`
        : originalText;
    message.text = text;
    message.isCommand = text.startsWith(prefix);
    
    message.functions =
    functions;
    message.platforms =
    platforms;

    for (const nameStore of ["economy", "xp", "activity", "groupSettings"]) {
        const updateNames = functions[nameStore]?.refreshNames;
        if (typeof updateNames !== "function") continue;
        try {
            updateNames(message);
        } catch (error) {
            console.error(`${_ts()} ❌[CORE] Não foi possível atualizar nomes em ${nameStore}:`, error);
        }
    }

    // Garantir que o usuário tenha uma Conta Central (criada ao enviar qualquer mensagem)
    try {
        const store = functions.centralAccounts || global.centralAccounts;
        if (store && typeof store.getOrCreateByPlatform === 'function') {
            const centralAccount = await store.getOrCreateByPlatform(
                message.platform,
                message.userId,
                { username: message.username, displayName: message.displayName || message.name }
            );
            message.centralAccountId = centralAccount?.id || null;
            if (!message.centralAccountId) {
                console.error(`${_ts()} ❌[CORE] Não foi possível resolver a conta central de ${message.platform}:${message.userId}.`);
            }
        }
    } catch (err) {
        console.error(`${_ts()} ❌[CORE] CentralAccounts error:`, err);
    }

    message.sender = message.sender || { isAdmin: false, canManageMessages: false };
    message.sender.isOwner = functions.owners ? functions.owners.isOwner(message) : false;
    if (message.sender.isOwner) {
        message.sender.isAdmin = true;
        message.sender.canManageMessages = true;
    }

    if (!message.isPrivate &&
        !message.sender.isAdmin &&
        !message.sender.canManageMessages &&
        !message.sender.isOwner) {
        try {
            if (functions.soAdmHelper?.isEnabled(message)) {
                return;
            }
        } catch (error) {
            console.error(`${_ts()} ❌[CORE] Falha ao verificar o modo somente administradores:`, error);
            return;
        }
    }

    if (!isSensitiveCommand) {
        for (const middleware of middlewares) {
            if (middleware.runOn === "all" || !middleware.runOn) {
                try {
                    const continueExecution = await middleware.execute(message);
                    if (continueExecution === false) {
                        return;
                    }
                } catch (err) {
                    console.error(`${_ts()} ❌[CORE] Erro ao executar middleware '${middleware.name}':`, err);
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
    }

    if (!text.startsWith(message.prefix)) {
        return;
    }

const parts = text
    .trim()
    .split(/\s+/);

const commandName = normalizeCommandName(parts[0].slice(message.prefix.length));
    
    message.command = commandName;

message.args = parts.slice(1);

message.getArgText = function (fromIndex = 1) {
    if (!this.text) return "";
    const rawText = this.text;
    
    if (fromIndex <= 0) {
        const cmdName = this.command ? (this.prefix + this.command) : "";
        if (!cmdName) return rawText.trim();
        const cmdIdx = rawText.toLowerCase().indexOf(cmdName.toLowerCase());
        if (cmdIdx === -1) return rawText.trim();
        return rawText.slice(cmdIdx + cmdName.length).replace(/^[ \t]*\r?\n?/, "");
    }

    const args = this.args || [];
    if (fromIndex > args.length) return "";

    let searchPos = 0;
    const fullLower = rawText.toLowerCase();

    if (this.command) {
        const cmdLower = (this.prefix + this.command).toLowerCase();
        const cmdMatch = fullLower.indexOf(cmdLower, searchPos);
        if (cmdMatch !== -1) {
            searchPos = cmdMatch + cmdLower.length;
        }
    }

    for (let i = 0; i < fromIndex; i++) {
        const token = args[i];
        if (!token) break;
        const tokenLower = String(token).toLowerCase();
        const found = fullLower.indexOf(tokenLower, searchPos);
        if (found !== -1) {
            searchPos = found + tokenLower.length;
        } else {
            break;
        }
    }

    const remaining = rawText.slice(searchPos);
    return remaining.replace(/^[ \t]*\r?\n?/, "");
};

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

    
    let command = commands[commandName];

    if (!command) {
        const candidates = new Set(Object.values(commands));
        for (const candidate of candidates) {
            if (typeof candidate.resolveAlias !== "function") continue;

            let resolvedAlias;
            try {
                resolvedAlias = candidate.resolveAlias(commandName, message);
            } catch (err) {
                console.error(`${_ts()} ❌[CORE] Falha ao resolver alias dinâmico '${commandName}':`, err);
                await message.reply({
                    text: "❌ Não consegui carregar os atalhos desse comando agora."
                });
                return;
            }

            if (!resolvedAlias) continue;

            command = candidate;
            message.args = [resolvedAlias, ...message.args];
            break;
        }

        if (!command) return;
    }

    const commandCategory = String(command.category || "").toLowerCase();
    if ((commandCategory === "economia" || commandCategory.startsWith("economia/"))
        && typeof functions.economy?.isEnabled === "function"
        && !functions.economy.isEnabled(message)) {
        await message.reply({
            text: `❌ A economia está desativada neste grupo/servidor.\nUm administrador deve usar ${message.prefix}economia ativar para liberá-la.`
        });
        return;
    }

    if (!isSensitiveCommand) {
        for (const middleware of middlewares) {
            if (middleware.runOn === "command") {
                try {
                    const continueExecution = await middleware.execute(message);
                    if (continueExecution === false) {
                        return;
                    }
                } catch (err) {
                    console.error(`${_ts()} ❌[CORE] Erro ao executar middleware '${middleware.name}':`, err);
                }
            }
        }
    }

    try {

        await command.execute(message);

    } catch (err) {

        console.error(`${_ts()} ❌[CORE] Erro ao executar comando:`, err);

        await message.reply({
            text: "❌ Não consegui concluir esse comando agora. Tente novamente em instantes."
        });

    }
}

async function start() {

    status.startedAt = Date.now();

    loadMiddlewares();
    loadFunctions();
    migrateLegacyDataFiles();
    if (functions.bronxys && typeof functions.bronxys.loadConfig === "function") {
        functions.bronxys.loadConfig();
    }

    // Inicializa o módulo de contas centralizadas definido em `functions/centralAccounts.js` (se presente)
    if (functions.centralAccounts && typeof functions.centralAccounts.init === 'function') {
        const dataFile = path.join(__dirname, 'settings', 'central-accounts.json');
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
            console.error(`${_ts()} ❌[CORE] Falha ao inicializar functions.centralAccounts:`, err);
        }
    }

    if (functions.crossplay && typeof functions.crossplay.init === 'function') {
        const dataFile = path.join(__dirname, 'settings', 'crossplay.json');
        try {
            const crossplayStore = functions.crossplay.crossplayStore || functions.crossplay;
            await crossplayStore.init(dataFile);
            crossplayStore.startAutoSave(300_000);
            global.crossplayStore = crossplayStore;
            functions.crossplay = crossplayStore;
        } catch (err) {
            console.error(`${_ts()} ❌[CORE] Falha ao inicializar functions.crossplay:`, err);
        }
    }

    if (functions.config) {
        functions.config.syncPlatforms();
    }

    const config = functions.config && typeof functions.config.getConfig === "function"
        ? functions.config.getConfig()
        : {};
    status.initialSetup = Boolean(
        functions.owners &&
        typeof functions.owners.hasOwners === "function" &&
        !functions.owners.hasOwners()
    );
    const ignoreInitialSeconds = typeof config.ignoreInitialSeconds === "number"
        ? Math.max(0, config.ignoreInitialSeconds)
        : 30;
    if (status.initialSetup) {
        console.log(`${_ts()} [CORE] Warm-up ignorado durante a configuração inicial do Super Usuário.`);
    } else {
        setTimeout(() => {
            console.log(`${_ts()} ✅[CORE] Restrição de inicialização finalizada. Mensagens serão processadas normalmente.`);
        }, ignoreInitialSeconds * 1000);
    }

    try {
        const act18Loader = require("./functions/act18Loader");
        const result = act18Loader.loadFromZip();
        if (result.status === "loaded") {
            console.log(`${_ts()} ✅[CORE] Pacote MOD_ADULTO importado: ${result.importedActions} ações, ${result.importedMedia} mídias.`);
        }
        if (act18Loader.migrateGlobalCatalog()) {
            console.log(`${_ts()} ✅[CORE] Mídias base64 antigas do catálogo adulto convertidas para arquivos .bin.`);
        }
    } catch (error) {
        console.error(`${_ts()} ❌[CORE] Falha ao carregar settings/MOD_ADULTO.zip:`, error.message || error);
    }

    loadCommands();
    loadPlatforms();
    global.platformRegistry = platformRegistry;

    if (functions.owners && !functions.owners.hasOwners()) {
        const code = functions.owners.generateCode();
        console.log("");
        console.log("=================================");
        console.log(`${_ts()} [SU] Nenhum Super Usuário encontrado.`);
        console.log(`${_ts()} [SU] Código: ${code}`);
        console.log("=================================");
        console.log("");
    }

    const bootstrap = await authFlow.handleInitialBootstrap();
    if (bootstrap.status === "bootstrap") {
        global.__pendingAuthBootstrapPlatform = bootstrap.platform;
        console.log(`${_ts()} [AUTH] Bootstrap da plataforma: ${bootstrap.platform}`);
    } else if (bootstrap.status === "skipped") {
        global.__pendingAuthBootstrapPlatform = null;
        console.log(`${_ts()} [AUTH] Nenhuma plataforma foi configurada para iniciar neste ciclo.`);
    }

    console.log(`${_ts()} ✅[CORE] Plataformas carregadas (count=${platforms.length}): ${platforms.map((p, i) => `#${i}:${Object.keys(p).join(',') || 'module'}`).join(' | ')}`);

    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const name = platform && (platform.name || platform.file || "unknown");
        const isEnabled = authFlow.isPlatformEnabled(name);
        if (!isEnabled) {
            console.log(`${_ts()} ⏭️[CORE] Plataforma ignorada por configuração: ${name}`);
            continue;
        }
        console.log(`${_ts()} ♻️[CORE] Iniciando plataforma [${i}]: ${name}`);
        try {
            await platform.start(handleMessage, handleComponentInteraction);
            console.log(`${_ts()} ✅[CORE] Plataforma [${i}] inicializada: ${name}`);
        } catch (err) {
            console.error(`${_ts()} ❌[CORE] Erro ao iniciar plataforma [${name}]:`, err.message || err);
        }
    }

    const configuredBotName = typeof functions.config?.getBotName === "function"
        ? functions.config.getBotName()
        : "Sat Bot";
    console.log(`${_ts()} 🔛[CORE] ${configuredBotName} online.`);

    // Inicia o motor de agendamentos em background
    try {
        const schedulerHelper = require("./functions/schedulerHelper");
        schedulerHelper.startScheduler();
    } catch (err) {
        console.error(`${_ts()} ❌[CORE] Falha ao iniciar o motor de agendamentos:`, err.message || err);
    }

    try {
        const cafeMonitor = require("./functions/cafeMonitor");
        cafeMonitor.startMonitorLoop();
    } catch (err) {
        console.error(`${_ts()} ❌[CORE] Falha ao iniciar o monitor do café:`, err.message || err);
    }

    try {
        require("./functions/rentalHelper").startMaintenance();
    } catch (err) {
        console.error(`${_ts()} ❌[CORE] Falha ao iniciar o controle de aluguéis:`, err.message || err);
    }
}

function hasComponentPermission(permissions, permission) {
    try {
        return Boolean(permissions?.has?.(permission));
    } catch (error) {
        console.error(`[${_ts()}] ❌[COMPONENT] Falha ao verificar permissão ${permission}:`, error);
        return false;
    }
}

async function createComponentMessage(interaction, commandName) {
    const config = functions.config?.getConfig?.() || {};
    const prefix = config.prefix || "!";
    const isTelegram = Boolean(interaction?.callbackQuery);
    const user = isTelegram
        ? interaction.from || interaction.callbackQuery?.from
        : interaction.user;
    if (!user?.id) return null;

    let message;
    if (isTelegram) {
        const sourceMessage = interaction.callbackQuery?.message;
        const chat = sourceMessage?.chat || interaction.chat;
        if (!chat?.id) return null;

        const threadId = sourceMessage?.message_thread_id
            ? String(sourceMessage.message_thread_id)
            : null;
        let isAdmin = chat.type === "private";
        let canManageMessages = isAdmin;
        let permissionCheckFailed = false;
        const telegramApi = interaction.telegram || global.telegramBot?.telegram;
        if (!isAdmin && typeof telegramApi?.getChatAdministrators === "function") {
            let adminListLookupSucceeded = false;
            try {
                const administrators = await telegramApi.getChatAdministrators(chat.id);
                adminListLookupSucceeded = true;
                const member = administrators.find(entry =>
                    String(entry.user?.id) === String(user.id)
                );
                isAdmin = Boolean(member);
                canManageMessages = member?.status === "creator" ||
                    (member?.status === "administrator" && member.can_delete_messages === true);
            } catch (error) {
                console.error(
                    `[${_ts()}] ❌[COMPONENT] Falha ao buscar permissões do Telegram | chat: ${chat.id} | user: ${user.id}:`,
                    error.message || error
                );
                permissionCheckFailed = true;
            }
            if (!adminListLookupSucceeded && typeof telegramApi.getChatMember === "function") {
                try {
                    const member = await telegramApi.getChatMember(chat.id, user.id);
                    isAdmin = ["administrator", "creator"].includes(member.status);
                    canManageMessages = member.status === "creator" ||
                        (member.status === "administrator" && member.can_delete_messages === true);
                    if (isAdmin) permissionCheckFailed = false;
                } catch (error) {
                    console.error(
                        `[${_ts()}] ❌[COMPONENT] Falha ao consultar membro do Telegram | chat: ${chat.id} | user: ${user.id}:`,
                        error.message || error
                    );
                }
            }
        } else if (!isAdmin && typeof telegramApi?.getChatMember === "function") {
            try {
                const member = await telegramApi.getChatMember(chat.id, user.id);
                isAdmin = ["administrator", "creator"].includes(member.status);
                canManageMessages = member.status === "creator" ||
                    (member.status === "administrator" && member.can_delete_messages === true);
                permissionCheckFailed = !isAdmin;
            } catch (error) {
                console.error(
                    `[${_ts()}] ❌[COMPONENT] Falha ao consultar membro do Telegram | chat: ${chat.id} | user: ${user.id}:`,
                    error.message || error
                );
            }
        } else if (!isAdmin) {
            console.error(
                `[${_ts()}] ❌[COMPONENT] Cliente Telegram indisponível para verificar permissões | chat: ${chat.id} | user: ${user.id}`
            );
            permissionCheckFailed = true;
        }

        message = {
            platform: "telegram",
            chatId: String(chat.id),
            chatName: chat.title || null,
            chatType: chat.type || "group",
            isPrivate: chat.type === "private",
            threadId,
            userId: String(user.id),
            username: user.username || null,
            displayName: [user.first_name, user.last_name]
                .filter(Boolean)
                .join(" ") || user.username || String(user.id),
            messageId: sourceMessage?.message_id ? String(sourceMessage.message_id) : null,
            raw: { chat },
            sender: { isAdmin, canManageMessages, permissionCheckFailed },
            reply: async payload => {
                const text = typeof payload === "string" ? payload : payload?.text;
                if (!text || typeof interaction.answerCbQuery !== "function") return false;
                const response = await interaction.answerCbQuery(String(text).slice(0, 180), {
                    show_alert: true
                });
                message._componentReplySent = true;
                return response;
            }
        };
    } else {
        const channel = interaction.channel || null;
        const guild = interaction.guild || channel?.guild || null;
        const guildId = interaction.guildId ? String(interaction.guildId) : guild?.id ? String(guild.id) : null;
        const channelId = interaction.channelId ? String(interaction.channelId) : channel?.id ? String(channel.id) : null;
        if (!channelId || (guildId && !channel)) return null;

        const permissions = interaction.memberPermissions || interaction.member?.permissions;
        const isPrivate = !guildId;
        const isAdmin = isPrivate || hasComponentPermission(permissions, "Administrator");
        const canManageMessages = isPrivate || hasComponentPermission(permissions, "ManageMessages");
        const isThread = channel?.isThread?.() === true;
        const categoryId = isThread
            ? channel.parent?.parentId || channel.parent?.parent?.id || null
            : channel?.parentId || null;
        message = {
            platform: "discord",
            chatId: channelId,
            channelId,
            guildId,
            chatName: channel?.name || null,
            chatType: isPrivate ? "private" : "group",
            isPrivate,
            threadId: isThread ? channelId : null,
            categoryId: categoryId ? String(categoryId) : null,
            userId: String(user.id),
            username: user.username || null,
            displayName: interaction.member?.displayName ||
                interaction.member?.nickname ||
                user.globalName ||
                user.username ||
                String(user.id),
            messageId: String(interaction.id || ""),
            raw: {
                guild: guild || (guildId ? { id: guildId } : null),
                guildId,
                channel
            },
            sender: { isAdmin, canManageMessages },
            reply: async payload => {
                const text = typeof payload === "string" ? payload : payload?.text;
                if (!text) return false;
                const response = { content: String(text), ephemeral: true };
                const result = interaction.deferred || interaction.replied
                    ? await interaction.followUp(response)
                    : await interaction.reply(response);
                message._componentReplySent = true;
                return result;
            }
        };
    }

    message.prefix = prefix;
    message.command = commandName;
    message.args = [];
    message.text = `${prefix}${commandName}`;
    message.isCommand = true;
    message.isComponentInteraction = true;
    message.functions = functions;
    message.platforms = platforms;
    message.sender.isOwner = functions.owners?.isOwner?.(message) === true;
    if (message.sender.isOwner) {
        message.sender.isAdmin = true;
        message.sender.canManageMessages = true;
    }
    return message;
}

function logComponentInteraction(message, commandName, action, result) {
    const safe = value => String(value || "desconhecido")
        .replace(/[\r\n|]/g, " ")
        .slice(0, 100);
    console.log(
        `${_ts()} 🧩[COMPONENT:${safe(message?.platform)}] ` +
        `${safe(message?.username || message?.displayName)} (${safe(message?.userId)}) ` +
        `chat:${safe(message?.chatId)} comando:${safe(commandName)} ` +
        `ação:${safe(action)} resultado:${safe(result)}`
    );
}

async function runComponentMiddlewares(message, runOn) {
    const requiredNames = runOn === "all"
        ? new Set(["antipv", "onlychats", "vip"])
        : new Set(["antispam", "blockcmd"]);
    const required = [...requiredNames];
    const available = new Set(middlewares.map(middleware => middleware.name));
    const missing = required.filter(name => !available.has(name));
    if (missing.length) {
        console.error(`[${_ts()}] ❌[COMPONENT] Middlewares de proteção indisponíveis: ${missing.join(", ")}`);
        return { allowed: false, middleware: "proteções indisponíveis", error: true };
    }

    for (const middleware of middlewares) {
        if (!requiredNames.has(middleware.name)) continue;
        try {
            const continueExecution = await middleware.execute(message);
            if (continueExecution === false) {
                return { allowed: false, middleware: middleware.name };
            }
        } catch (error) {
            console.error(
                `[${_ts()}] ❌[COMPONENT] Erro no middleware '${middleware.name}':`,
                error
            );
            return { allowed: false, middleware: middleware.name, error: true };
        }
    }
    return { allowed: true };
}

async function acknowledgeComponentSilently(interaction) {
    if (interaction?.callbackQuery && typeof interaction.answerCbQuery === "function") {
        await interaction.answerCbQuery();
        return;
    }
    if (!interaction?.deferred && !interaction?.replied &&
        typeof interaction?.deferUpdate === "function") {
        await interaction.deferUpdate();
    }
}

async function handleComponentInteraction(interaction) {
    const componentId = interaction?.customId || interaction?.callbackQuery?.data;
    if (typeof componentId !== "string") return false;

    const componentParts = componentId.split(":");
    const rawCommandName = componentParts[0];
    const commandName = normalizeCommandName(rawCommandName);
    const safeActionTokens = new Set([
        "approve", "back", "cancel", "catalog", "category", "choose", "community", "confirm",
        "cosmetic", "details", "discord", "editplan", "extend", "initial", "items",
        "menu", "orders", "paid", "permanent", "pixhelp", "cancelorder", "reject", "rejectconfirm", "remove",
        "removeconfirm", "renewal", "select", "setplan", "subscriptions",
        "telegram", "tc", "tx", "cc", "cx"
    ]);
    const action = componentParts.slice(1, 4)
        .filter(part => safeActionTokens.has(part))
        .join(":") || "outro";
    const command = commands[commandName];
    let message;
    try {
        message = await createComponentMessage(interaction, commandName);
    } catch (error) {
        console.error(`[${_ts()}] ❌[COMPONENT] Falha ao criar contexto de interação:`, error);
        logComponentInteraction(null, commandName, action, "erro de contexto");
        throw error;
    }

    if (!message) {
        logComponentInteraction(null, commandName, action, "contexto inválido");
        if (interaction?.callbackQuery && typeof interaction.answerCbQuery === "function") {
            await interaction.answerCbQuery("Não foi possível validar esta ação.", { show_alert: true });
            return true;
        }
        if (typeof interaction?.reply === "function") {
            await interaction.reply({
                content: "❌ Não foi possível validar esta ação.",
                ephemeral: true
            });
            return true;
        }
        return false;
    }

    if (message.platform === "telegram" && !message.isPrivate) {
        let botMember;
        try {
            const telegram = platformRegistry.telegram;
            if (typeof telegram?.getBotChatMember !== "function") {
                throw new Error("Consulta de associação do bot ao grupo indisponível.");
            }
            botMember = await telegram.getBotChatMember(message.chatId);
        } catch (error) {
            console.error(
                `[${_ts()}] ❌[COMPONENT] Falha ao verificar se o bot ainda está no grupo | chat: ${message.chatId}:`,
                error.message || error
            );
            logComponentInteraction(message, commandName, action, "bloqueado: falha ao verificar bot no grupo");
            await message.reply({
                text: "❌ Não foi possível confirmar se o bot ainda está neste grupo. Tente novamente mais tarde."
            });
            return true;
        }

        const botIsInChat = ["creator", "administrator", "member"].includes(botMember?.status) ||
            (botMember?.status === "restricted" && botMember.is_member === true);
        if (!botIsInChat) {
            logComponentInteraction(message, commandName, action, "bloqueado: bot fora do grupo");
            await message.reply({
                text: "⚠️ O bot não está mais neste grupo. Adicione-o novamente para usar estes botões."
            });
            return true;
        }
    }

    if (!command || typeof command.handleInteraction !== "function") {
        logComponentInteraction(message, commandName, action, "não reconhecido");
        return false;
    }

    let config;
    try {
        config = functions.config?.getConfig?.() || {};
    } catch (error) {
        console.error(`[${_ts()}] ❌[COMPONENT] Falha ao carregar configurações:`, error);
        logComponentInteraction(message, commandName, action, "erro ao validar");
        await message.reply({ text: "❌ Não foi possível validar esta ação. Tente novamente." });
        return true;
    }
    const ignoreInitialSeconds = typeof config.ignoreInitialSeconds === "number"
        ? config.ignoreInitialSeconds
        : 30;
    const uptime = status.startedAt ? Date.now() - status.startedAt : 0;
    if (!status.initialSetup && uptime < ignoreInitialSeconds * 1000) {
        logComponentInteraction(message, commandName, action, "bloqueado: inicialização");
        await message.reply({
            text: "⏳ O bot ainda está iniciando. Tente novamente em alguns instantes."
        });
        return true;
    }

    if (!message.isPrivate &&
        !message.sender.isAdmin &&
        !message.sender.canManageMessages &&
        !message.sender.isOwner) {
        try {
            if (functions.soAdmHelper?.isEnabled?.(message)) {
                logComponentInteraction(message, commandName, action, "bloqueado: apenas administradores");
                await message.reply({ text: "⛔ Este servidor está configurado para aceitar apenas ações de administradores." });
                return true;
            }
        } catch (error) {
            console.error(`[${_ts()}] ❌[COMPONENT] Falha ao verificar modo somente administradores:`, error);
            logComponentInteraction(message, commandName, action, "bloqueado: falha de permissão");
            await message.reply({ text: "❌ Não foi possível validar suas permissões. Tente novamente." });
            return true;
        }
    }

    const allMiddlewareResult = await runComponentMiddlewares(message, "all");
    if (!allMiddlewareResult.allowed) {
        logComponentInteraction(
            message,
            commandName,
            action,
            `bloqueado: ${allMiddlewareResult.middleware}`
        );
        if (allMiddlewareResult.error && !message._componentReplySent) {
            await message.reply({
                text: "❌ Não foi possível validar esta ação. Tente novamente."
            });
        } else if (!message._componentReplySent) {
            await acknowledgeComponentSilently(interaction);
        }
        return true;
    }

    const commandCategory = String(command.category || "").toLowerCase();
    if ((commandCategory === "economia" || commandCategory.startsWith("economia/")) &&
        typeof functions.economy?.isEnabled === "function") {
        let economyEnabled;
        try {
            economyEnabled = functions.economy.isEnabled(message);
        } catch (error) {
            console.error(`[${_ts()}] ❌[COMPONENT] Falha ao validar estado da economia:`, error);
            logComponentInteraction(message, commandName, action, "erro ao validar economia");
            await message.reply({ text: "❌ Não foi possível validar a economia. Tente novamente." });
            return true;
        }
        if (!economyEnabled) {
            logComponentInteraction(message, commandName, action, "bloqueado: economia desativada");
            await message.reply({
                text: `❌ A economia está desativada neste grupo/servidor.\nUm administrador deve usar ${message.prefix}economia ativar para liberá-la.`
            });
            return true;
        }
    }

    const commandMiddlewareResult = await runComponentMiddlewares(message, "command");
    if (!commandMiddlewareResult.allowed) {
        logComponentInteraction(
            message,
            commandName,
            action,
            `bloqueado: ${commandMiddlewareResult.middleware}`
        );
        if (commandMiddlewareResult.error && !message._componentReplySent) {
            await message.reply({
                text: "❌ Não foi possível validar esta ação. Tente novamente."
            });
        } else if (!message._componentReplySent) {
            await acknowledgeComponentSilently(interaction);
        }
        return true;
    }

    const interactionTracker = middlewares.find(middleware => middleware.name === "trackInteraction");
    if (interactionTracker) {
        try {
            await interactionTracker.execute(message);
        } catch (error) {
            console.error(`[${_ts()}] ❌[COMPONENT] Falha ao registrar última interação:`, error);
        }
    }

    try {
        interaction[COMPONENT_MESSAGE_CONTEXT] = message;
        const handled = (await command.handleInteraction(interaction)) !== false;
        logComponentInteraction(message, commandName, action, handled ? "processado" : "não reconhecido");
        return handled;
    } catch (error) {
        logComponentInteraction(message, commandName, action, "erro");
        throw error;
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
    normalizeCommandName,
    getFunctions,
    handleMessage,
    handleComponentInteraction

};