const fs = require("fs");
const path = require("path");
const baileys = require("@whiskeysockets/baileys");
const { sameUserId } = require("./moderationHelper");

const SETTINGS_DIR = path.join(__dirname, "..", "settings");
const SCOPED_DATA_DIRS = ["activity", "economy", "xp", "marriages", "notes", "autorepo", "act"];
const PLATFORM_PREFIXES = ["discord", "telegram", "whatsapp"];
const areJidsSameUser = baileys.areJidsSameUser;

function sanitizeFilename(value) {
    return String(value).replace(/[\\/:*?"<>|]/g, "_");
}

function safeReadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listJsonFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    const directoryStats = fs.lstatSync(directory);
    if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
        throw new Error(`Pasta de dados inválida ou link simbólico: ${directory}`);
    }
    return fs.readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
        .map(entry => path.join(directory, entry.name));
}

function assertSafeParent(root, filePath) {
    const rootPath = fs.realpathSync(root);
    const parentPath = fs.realpathSync(path.dirname(filePath));
    const relative = path.relative(rootPath, parentPath);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error("O caminho resolvido está fora da pasta de dados permitida.");
    }
}

function isRegularFile(root, filePath) {
    if (!fs.existsSync(filePath)) return false;
    assertSafeParent(root, filePath);
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) throw new Error(`Arquivo de dados é um link simbólico: ${filePath}`);
    return stats.isFile();
}

function addCandidate(candidates, platform, id) {
    const value = String(id || "").trim();
    if (!PLATFORM_PREFIXES.includes(platform) || !value) return;
    if (!candidates.has(platform)) candidates.set(platform, new Set());
    candidates.get(platform).add(value);
}

function parseScopedFilename(filePath) {
    const basename = path.basename(filePath);
    const match = basename.match(/^(discord|telegram|whatsapp)_(.+)\.json$/i);
    if (!match) return null;
    const platform = match[1].toLowerCase();
    let id = match[2];
    if (platform === "whatsapp" && id.endsWith("_g.us")) {
        id = `${id.slice(0, -5)}@g.us`;
    }
    return { platform, id };
}

function parseScopedDirectory(directoryPath) {
    const match = path.basename(directoryPath).match(/^(discord|telegram|whatsapp)_(.+)$/i);
    if (!match) return null;
    const platform = match[1].toLowerCase();
    let id = match[2];
    if (platform === "whatsapp" && id.endsWith("_g.us")) {
        id = `${id.slice(0, -5)}@g.us`;
    }
    return { platform, id };
}

function readGroupConfig(filePath) {
    const basename = path.basename(filePath);
    const prefixes = [
        ["DiscS", "discord", "server"],
        ["telG", "telegram", "group"],
        ["telC", "telegram", "channel"],
        ["waG", "whatsapp", "group"],
        ["waC", "whatsapp", "community"]
    ];
    for (const [prefix, platform, type] of prefixes) {
        if (!basename.startsWith(prefix) || !basename.endsWith(".json")) continue;
        const id = basename.slice(prefix.length, -5);
        try {
            return { filePath, platform, type, id, data: safeReadJson(filePath), unreadable: false };
        } catch (error) {
            return { filePath, platform, type, id, data: null, unreadable: true, error };
        }
    }
    return null;
}

function discoverGroupData(settingsDir = SETTINGS_DIR) {
    const candidates = new Map();
    const configs = [];
    const errors = [];
    const groupsDir = path.join(settingsDir, "groups");

    for (const filePath of listJsonFiles(groupsDir)) {
        const config = readGroupConfig(filePath);
        if (!config) continue;
        configs.push(config);
        if (config.unreadable) {
            errors.push(`${path.basename(filePath)}: ${config.error.message}`);
            if (config.type !== "community") addCandidate(candidates, config.platform, config.id);
            continue;
        }
        if (config.type === "community") {
            for (const chat of Array.isArray(config.data?.chat) ? config.data.chat : []) {
                if (chat?.id) addCandidate(candidates, config.platform, chat.id);
            }
        } else {
            addCandidate(candidates, config.platform, config.id);
        }
    }

    for (const directoryName of SCOPED_DATA_DIRS) {
        const directory = path.join(settingsDir, directoryName);
        for (const filePath of listJsonFiles(directory)) {
            const scoped = parseScopedFilename(filePath);
            if (scoped) addCandidate(candidates, scoped.platform, scoped.id);
        }
    }
    const actionMediaDir = path.join(settingsDir, "act_media");
    if (fs.existsSync(actionMediaDir)) {
        const mediaStats = fs.lstatSync(actionMediaDir);
        if (!mediaStats.isDirectory() || mediaStats.isSymbolicLink()) {
            throw new Error("A pasta de mídias de ações não é uma pasta local segura.");
        }
        for (const entry of fs.readdirSync(actionMediaDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const scoped = parseScopedDirectory(path.join(actionMediaDir, entry.name));
            if (scoped) addCandidate(candidates, scoped.platform, scoped.id);
        }
    }
    return { candidates, configs, errors };
}

function requirePlatformClients({ discordClient, whatsappSock, telegramBot }) {
    const unavailable = [];
    if (!discordClient?.guilds?.cache) unavailable.push("Discord");
    if (typeof discordClient?.isReady === "function" && !discordClient.isReady()) unavailable.push("Discord");
    if (typeof whatsappSock?.groupFetchAllParticipating !== "function") unavailable.push("WhatsApp");
    if (!telegramBot?.telegram) unavailable.push("Telegram");
    if (unavailable.length) {
        throw new Error(`Não foi possível verificar todas as plataformas; indisponíveis: ${unavailable.join(", ")}. Nenhum dado foi apagado.`);
    }
}

async function getBotMembership(platform, chatId, telegramBotId, clients) {
    if (platform === "discord") {
        return clients.discordClient.guilds.cache.has(String(chatId)) ? "present" : "absent";
    }
    if (platform === "whatsapp") {
        return clients.whatsappGroups.has(String(chatId)) ? "present" : "absent";
    }
    try {
        const member = await clients.telegramBot.telegram.getChatMember(String(chatId), telegramBotId);
        if (["creator", "administrator", "member"].includes(member.status)) return "present";
        if (member.status === "restricted") return member.is_member === true ? "present" : "absent";
        if (["left", "kicked"].includes(member.status)) return "absent";
        return "unknown";
    } catch (error) {
        clients.errors.push(`Telegram ${chatId}: ${error.message || error}`);
        return "unknown";
    }
}

function findScopedFiles(settingsDir, platform, groupId) {
    const scopedName = `${sanitizeFilename(platform)}_${sanitizeFilename(groupId)}.json`;
    const files = [];
    for (const directoryName of SCOPED_DATA_DIRS) {
        const filePath = path.join(settingsDir, directoryName, scopedName);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) files.push(filePath);
    }
    return files;
}

function safeRemoveFile(filePath, report) {
    try {
        if (!isRegularFile(report.settingsDir || SETTINGS_DIR, filePath)) return false;
        fs.unlinkSync(filePath);
        report.deletedFiles += 1;
        return true;
    } catch (error) {
        report.errors.push(`${path.relative(SETTINGS_DIR, filePath)}: ${error.message || error}`);
        return false;
    }
}

function safeRemoveDirectory(directory, report) {
    try {
        if (!fs.existsSync(directory)) return false;
        assertSafeParent(report.settingsDir || SETTINGS_DIR, directory);
        const stats = fs.lstatSync(directory);
        if (!stats.isDirectory() || stats.isSymbolicLink()) {
            throw new Error("O caminho de mídia não é um diretório local seguro.");
        }
        const countFiles = current => fs.readdirSync(current, { withFileTypes: true }).reduce((count, entry) => {
            const child = path.join(current, entry.name);
            if (entry.isSymbolicLink()) return count;
            return count + (entry.isDirectory() ? countFiles(child) : entry.isFile() ? 1 : 0);
        }, 0);
        const removedFiles = countFiles(directory);
        fs.rmSync(directory, { recursive: true });
        report.deletedFiles += removedFiles;
        return true;
    } catch (error) {
        report.errors.push(`${path.relative(SETTINGS_DIR, directory)}: ${error.message || error}`);
        return false;
    }
}

function collectMediaUrls(value, results = []) {
    if (!value || typeof value !== "object") return results;
    if (Array.isArray(value)) {
        for (const item of value) collectMediaUrls(item, results);
        return results;
    }
    for (const [key, child] of Object.entries(value)) {
        if (key === "media" && child && typeof child === "object" && typeof child.url === "string") {
            results.push(child.url);
        } else {
            collectMediaUrls(child, results);
        }
    }
    return results;
}

function mediaPathKey(value) {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function collectDiscordLegacyConfigIds(serverData) {
    const ids = new Set();
    const addChannelIds = channels => {
        for (const channel of Array.isArray(channels) ? channels : []) {
            if (channel?.id) ids.add(String(channel.id));
        }
    };
    addChannelIds(serverData?.chat);
    for (const category of Array.isArray(serverData?.categoria) ? serverData.categoria : []) {
        if (category?.id) ids.add(String(category.id));
        addChannelIds(category?.chat);
    }
    return ids;
}

function listReferencedMedia(settingsDir) {
    const references = new Set();
    let complete = true;
    for (const filePath of listJsonFiles(path.join(settingsDir, "groups"))) {
        try {
            for (const mediaUrl of collectMediaUrls(safeReadJson(filePath))) {
                if (!/^https?:\/\//i.test(mediaUrl)) references.add(mediaPathKey(mediaUrl));
            }
        } catch {
            complete = false;
        }
    }
    return { references, complete };
}

function removeUnreferencedMedia(mediaUrls, settingsDir, report) {
    const uploadRoot = path.resolve(settingsDir, "uploads");
    const { references, complete } = listReferencedMedia(settingsDir);
    if (!complete) {
        report.errors.push("Há configurações de grupos ilegíveis; as mídias compartilhadas foram preservadas.");
        return;
    }
    const candidates = new Map(mediaUrls.map(value => [mediaPathKey(value), path.resolve(value)]));
    for (const [key, filePath] of candidates) {
        const relative = path.relative(uploadRoot, filePath);
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) continue;
        if (references.has(key)) continue;
        try {
            assertSafeParent(settingsDir, filePath);
            const stats = fs.lstatSync(filePath);
            if (!stats.isFile() || stats.isSymbolicLink()) continue;
            fs.unlinkSync(filePath);
            report.deletedMedia += 1;
            report.deletedFiles += 1;
        } catch (error) {
            if (error.code !== "ENOENT") report.errors.push(`${path.relative(settingsDir, filePath)}: ${error.message || error}`);
        }
    }
}

function invalidateEconomyScope(platform, groupId) {
    const economy = require("./economy");
    if (typeof economy.invalidateScope === "function") economy.invalidateScope(platform, groupId);
}

async function updateOrphanedChats({
    settingsDir = SETTINGS_DIR,
    discordClient = global.discordClient,
    whatsappSock = global.whatsappSock,
    telegramBot = global.telegramBot
} = {}) {
    const clients = { discordClient, whatsappSock, telegramBot, errors: [] };
    requirePlatformClients(clients);
    const { candidates, configs, errors: scanErrors } = discoverGroupData(settingsDir);
    const whatsappGroups = await whatsappSock.groupFetchAllParticipating();
    if (!whatsappGroups || typeof whatsappGroups !== "object") {
        throw new Error("Não foi possível obter a lista de grupos do WhatsApp. Nenhum dado foi apagado.");
    }
    clients.whatsappGroups = new Set((whatsappGroups instanceof Map
        ? [...whatsappGroups.keys()]
        : Object.keys(whatsappGroups)).map(String));

    let telegramBotId;
    try {
        telegramBotId = (await telegramBot.telegram.getMe()).id;
    } catch (error) {
        throw new Error(`Não foi possível identificar o bot do Telegram: ${error.message || error}. Nenhum dado foi apagado.`);
    }

    const membership = new Map();
    const telegramCandidates = candidates.get("telegram") || new Set();
    for (const chatId of telegramCandidates) {
        membership.set(`telegram:${chatId}`, await getBotMembership("telegram", chatId, telegramBotId, clients));
    }

    const stale = new Map();
    for (const platform of PLATFORM_PREFIXES) {
        stale.set(platform, new Set());
        for (const chatId of candidates.get(platform) || []) {
            const status = platform === "telegram"
                ? membership.get(`telegram:${chatId}`)
                : await getBotMembership(platform, chatId, telegramBotId, clients);
            if (status === "absent") stale.get(platform).add(chatId);
            if (status === "unknown" && platform !== "telegram") {
                clients.errors.push(`${platform} ${chatId}: presença não confirmada; dados preservados.`);
            }
        }
    }

    const report = {
        settingsDir,
        checked: Object.fromEntries(PLATFORM_PREFIXES.map(platform => [platform, (candidates.get(platform) || new Set()).size])),
        orphaned: Object.fromEntries(PLATFORM_PREFIXES.map(platform => [platform, stale.get(platform).size])),
        deletedGroups: [],
        deletedFiles: 0,
        deletedMedia: 0,
        errors: [...scanErrors, ...clients.errors]
    };
    const mediaUrls = [];
    const settingsFilesToDelete = new Set();

    for (const config of configs) {
        if (config.type === "community") continue;
        if (!stale.get(config.platform)?.has(config.id)) continue;
        settingsFilesToDelete.add(config.filePath);
        if (config.platform === "discord" && config.type === "server" && !config.unreadable) {
            for (const legacyId of collectDiscordLegacyConfigIds(config.data)) {
                const legacyPath = path.join(settingsDir, "groups", `DiscG${sanitizeFilename(legacyId)}.json`);
                if (isRegularFile(settingsDir, legacyPath)) settingsFilesToDelete.add(legacyPath);
            }
        }
    }

    for (const config of configs.filter(item => item.type === "community" && item.platform === "whatsapp")) {
        if (config.unreadable || !Array.isArray(config.data?.chat)) continue;
        const originalChats = config.data.chat;
        const removedChats = originalChats.filter(chat => chat?.id && stale.get("whatsapp").has(String(chat.id)));
        if (!removedChats.length) continue;
        for (const chat of removedChats) mediaUrls.push(...collectMediaUrls(chat.settings || {}));
        const remainingChats = originalChats.filter(chat => !removedChats.includes(chat));
        if (!remainingChats.length && originalChats.length > 0 && originalChats.every(chat =>
            chat?.id && stale.get("whatsapp").has(String(chat.id))
        )) {
            mediaUrls.push(...collectMediaUrls(config.data));
            settingsFilesToDelete.add(config.filePath);
        } else {
            config.data.chat = remainingChats;
            try {
                atomicWriteJson(config.filePath, config.data, settingsDir);
                report.updatedCommunityChats = (report.updatedCommunityChats || 0) + removedChats.length;
            } catch (error) {
                report.errors.push(`${path.basename(config.filePath)}: ${error.message || error}`);
            }
        }
    }

    for (const [platform, ids] of stale) {
        for (const groupId of ids) {
            const scopedFiles = findScopedFiles(settingsDir, platform, groupId);
            for (const filePath of scopedFiles) safeRemoveFile(filePath, report);
            const mediaDir = path.join(settingsDir, "act_media", `${sanitizeFilename(platform)}_${sanitizeFilename(groupId)}`);
            safeRemoveDirectory(mediaDir, report);
            invalidateEconomyScope(platform, groupId);
            report.deletedGroups.push({ platform, id: groupId });
        }
    }

    for (const filePath of settingsFilesToDelete) {
        const config = configs.find(item => item.filePath === filePath);
        if (!config?.unreadable) {
            try {
                mediaUrls.push(...collectMediaUrls(safeReadJson(filePath)));
            } catch (error) {
                report.errors.push(`${path.basename(filePath)}: ${error.message || error}`);
            }
        }
        safeRemoveFile(filePath, report);
    }

    removeUnreferencedMedia(mediaUrls, settingsDir, report);
    return report;
}

function normalizeMemberId(platform, id) {
    const value = String(id || "").trim();
    if (platform !== "whatsapp") return value;
    return value.includes("@") ? value.split("@")[0].split(":")[0] + "@" + value.split("@")[1] : `${value.replace(/\D/g, "")}@s.whatsapp.net`;
}

function sameMemberId(platform, left, right) {
    if (platform === "whatsapp") {
        try {
            if (typeof areJidsSameUser === "function" && areJidsSameUser(normalizeMemberId(platform, left), normalizeMemberId(platform, right))) return true;
        } catch {}
    }
    return sameUserId(normalizeMemberId(platform, left), normalizeMemberId(platform, right));
}

function addMemberCandidate(ids, value) {
    if (value !== undefined && value !== null && String(value).trim()) ids.add(String(value));
}

function getMemberDataFiles(settingsDir, platform, groupId) {
    const scopedName = `${sanitizeFilename(platform)}_${sanitizeFilename(groupId)}.json`;
    const files = [];
    for (const directoryName of SCOPED_DATA_DIRS) {
        const filePath = path.join(settingsDir, directoryName, scopedName);
        if (isRegularFile(settingsDir, filePath)) files.push({ type: directoryName, filePath });
    }
    const groupConfigFiles = [];
    const configPrefixes = platform === "discord"
        ? [`DiscS${sanitizeFilename(groupId)}.json`]
        : platform === "telegram"
            ? [`telG${sanitizeFilename(groupId)}.json`, `telC${sanitizeFilename(groupId)}.json`]
            : [`waG${sanitizeFilename(groupId)}.json`];
    for (const name of configPrefixes) {
        const filePath = path.join(settingsDir, "groups", name);
        if (isRegularFile(settingsDir, filePath)) groupConfigFiles.push(filePath);
    }
    if (platform === "whatsapp") {
        for (const filePath of listJsonFiles(path.join(settingsDir, "groups"))) {
            const config = readGroupConfig(filePath);
            if (config?.type === "community" && !config.unreadable &&
                Array.isArray(config.data?.chat) &&
                config.data.chat.some(chat => String(chat?.id) === String(groupId))) {
                groupConfigFiles.push(filePath);
            }
        }
    }
    return { files, groupConfigFiles };
}

function collectMemberIds(settingsDir, platform, groupId, files, configFiles) {
    const memberIds = new Set();
    const parsedFiles = files.map(file => ({ ...file, data: safeReadJson(file.filePath) }));
    const parsedConfigs = configFiles.map(filePath => ({
        filePath,
        data: safeReadJson(filePath),
        config: readGroupConfig(filePath)
    }));

    for (const { type, data } of parsedFiles) {
        const records = type === "economy" ? data.accounts : data.users;
        if (records && typeof records === "object") {
            for (const [id, record] of Object.entries(records)) addMemberCandidate(memberIds, record?.userId || id);
        }
        if (type === "economy" && data.accounts) {
            for (const account of Object.values(data.accounts)) {
                for (const id of Array.isArray(account?.robbedUserIds) ? account.robbedUserIds : []) addMemberCandidate(memberIds, id);
            }
        }
        if (type === "marriages") {
            for (const marriage of [...(data.marriages || []), ...(data.pending || [])]) {
                for (const key of ["firstId", "secondId", "requesterId", "recipientId"]) addMemberCandidate(memberIds, marriage?.[key]);
            }
        }
    }

    for (const { data } of parsedConfigs) {
        const warns = data.settings?.warnsData;
        if (warns && typeof warns === "object") {
            for (const id of Object.keys(warns)) addMemberCandidate(memberIds, id);
        }
        const participants = data.settings?.setembroNofap?.participants;
        if (participants && typeof participants === "object") {
            for (const participant of Object.values(participants)) {
                if ((participant?.platform || platform) === platform) addMemberCandidate(memberIds, participant?.platformId);
            }
        }
        if (Array.isArray(data.chat)) {
            for (const chat of data.chat) {
                const nestedWarnings = chat?.settings?.warnsData;
                if (nestedWarnings && typeof nestedWarnings === "object") {
                    for (const id of Object.keys(nestedWarnings)) addMemberCandidate(memberIds, id);
                }
            }
        }
    }
    return { memberIds, parsedFiles, parsedConfigs };
}

function getCurrentScope(message) {
    const platform = String(message?.platform || "").toLowerCase();
    const groupId = platform === "discord"
        ? message.guildId || message.raw?.guild?.id || message.raw?.guildId
        : message.chatId || message.raw?.chat?.id;
    if (!PLATFORM_PREFIXES.includes(platform) || !groupId || message.isPrivate || message.chatType === "private") {
        throw new Error("Este comando só pode ser executado dentro de um grupo ou servidor válido.");
    }
    return { platform, groupId: String(groupId) };
}

async function getCurrentMembers(platform, groupId, ids, communityIds = [], clients) {
    if (platform === "discord") {
        const guild = await clients.discordClient.guilds.fetch(groupId);
        const members = await guild.members.fetch();
        return {
            present: new Set([...members.keys()].map(String)),
            unknown: new Set()
        };
    }
    if (platform === "whatsapp") {
        const metadata = await clients.whatsappSock.groupMetadata(groupId);
        const participants = (metadata.participants || []).flatMap(participant =>
            [participant.id, participant.lid, participant.phoneNumber].filter(Boolean).map(String)
        );
        return { present: new Set(participants), unknown: new Set(), presentIds: participants };
    }
    const botId = (await clients.telegramBot.telegram.getMe()).id;
    const present = new Set();
    const absent = new Set();
    const unknown = new Set();
    for (const id of ids) {
        try {
            const member = await clients.telegramBot.telegram.getChatMember(groupId, Number(id));
            if (["creator", "administrator", "member"].includes(member.status) ||
                (member.status === "restricted" && member.is_member === true)) present.add(String(id));
            else if (["left", "kicked"].includes(member.status) ||
                (member.status === "restricted" && member.is_member === false)) absent.add(String(id));
            else unknown.add(String(id));
        } catch (error) {
            unknown.add(String(id));
            clients.errors.push(`${id}: ${error.message || error}`);
        }
    }
    return { present, absent, unknown, botId, communityIds };
}

async function getCommunityMemberStatuses(configs, memberIds, clients) {
    const result = new Map();
    for (const { filePath, data, config } of configs) {
        if (config?.type !== "community" || config.platform !== "whatsapp") continue;
        const groupIds = (Array.isArray(data.chat) ? data.chat : [])
            .map(chat => String(chat?.id || ""))
            .filter(Boolean);
        const presentIds = [];
        let verificationFailed = groupIds.length === 0;
        for (const childGroupId of groupIds) {
            try {
                const current = await getCurrentMembers("whatsapp", childGroupId, new Set(), [], clients);
                presentIds.push(...(current.presentIds || []));
            } catch (error) {
                verificationFailed = true;
                clients.errors.push(`Grupo comunitário ${childGroupId}: ${error.message || error}`);
            }
        }
        const statuses = new Map();
        for (const id of memberIds) {
            const present = presentIds.some(currentId => sameMemberId("whatsapp", id, currentId));
            statuses.set(id, present ? "present" : verificationFailed ? "unknown" : "absent");
        }
        result.set(filePath, statuses);
    }
    return result;
}

function statusForMember(platform, id, currentMembers) {
    if (platform === "telegram") {
        if (currentMembers.present.has(String(id))) return "present";
        if (currentMembers.absent.has(String(id))) return "absent";
        return "unknown";
    }
    if (platform === "whatsapp") {
        return currentMembers.presentIds.some(currentId => sameMemberId(platform, id, currentId)) ? "present" : "absent";
    }
    return currentMembers.present.has(String(id)) ? "present" : "absent";
}

function atomicWriteJson(filePath, data, settingsDir = SETTINGS_DIR) {
    assertSafeParent(settingsDir, filePath);
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const backup = `${filePath}.${process.pid}.${Date.now()}.bak`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 4), "utf8");
    let movedOriginal = false;
    try {
        if (fs.existsSync(filePath)) {
            fs.renameSync(filePath, backup);
            movedOriginal = true;
        }
        fs.renameSync(temporary, filePath);
        if (movedOriginal) fs.unlinkSync(backup);
    } catch (error) {
        if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
        if (movedOriginal && !fs.existsSync(filePath) && fs.existsSync(backup)) fs.renameSync(backup, filePath);
        throw error;
    }
}

function updateMemberDataFile({ type, data, platform, statuses, removedIds }) {
    let removed = 0;
    if (type === "activity" || type === "xp" || type === "economy") {
        const key = type === "economy" ? "accounts" : "users";
        const records = data[key];
        if (!records || typeof records !== "object" || Array.isArray(records)) return { changed: false, removed };
        let changed = false;
        for (const [recordId, record] of Object.entries(records)) {
            const id = String(record?.userId || recordId);
            if (statuses.get(id) !== "absent") continue;
            removedIds.add(id);
            delete records[recordId];
            removed += 1;
            changed = true;
        }
        if (type === "economy") {
            for (const account of Object.values(records)) {
                if (!Array.isArray(account?.robbedUserIds)) continue;
                const remainingIds = account.robbedUserIds.filter(id => statuses.get(String(id)) !== "absent");
                if (remainingIds.length !== account.robbedUserIds.length) {
                    for (const id of account.robbedUserIds) {
                        if (statuses.get(String(id)) === "absent") removedIds.add(String(id));
                    }
                    removed += account.robbedUserIds.length - remainingIds.length;
                    account.robbedUserIds = remainingIds;
                    changed = true;
                }
            }
        }
        return { changed, removed };
    }
    if (type === "marriages") {
        const absentMemberIds = item =>
            ["firstId", "secondId", "requesterId", "recipientId"]
                .map(key => item?.[key])
                .filter(id => id && statuses.get(String(id)) === "absent")
                .map(String);
        for (const key of ["marriages", "pending"]) {
            if (!Array.isArray(data[key])) continue;
            const initial = data[key].length;
            data[key] = data[key].filter(item => {
                const absentIds = absentMemberIds(item);
                for (const id of absentIds) removedIds.add(id);
                return absentIds.length === 0;
            });
            removed += initial - data[key].length;
        }
        return { changed: removed > 0, removed };
    }
    return { changed: false, removed };
}

async function updateGroupMembers(message, {
    settingsDir = SETTINGS_DIR,
    discordClient = global.discordClient,
    whatsappSock = global.whatsappSock,
    telegramBot = global.telegramBot
} = {}) {
    const { platform, groupId } = getCurrentScope(message);
    const clients = { discordClient, whatsappSock, telegramBot, errors: [] };
    if (platform === "discord" && !discordClient?.guilds) throw new Error("Discord está indisponível; nenhum dado foi apagado.");
    if (platform === "whatsapp" && typeof whatsappSock?.groupMetadata !== "function") throw new Error("WhatsApp está indisponível; nenhum dado foi apagado.");
    if (platform === "telegram" && !telegramBot?.telegram) throw new Error("Telegram está indisponível; nenhum dado foi apagado.");

    const { files, groupConfigFiles } = getMemberDataFiles(settingsDir, platform, groupId);
    const { memberIds, parsedFiles, parsedConfigs } =
        collectMemberIds(settingsDir, platform, groupId, files, groupConfigFiles);
    const currentMembers = await getCurrentMembers(platform, groupId, memberIds, [], clients);
    const statuses = new Map();
    for (const id of memberIds) statuses.set(id, statusForMember(platform, id, currentMembers));
    const communityStatuses = platform === "whatsapp"
        ? await getCommunityMemberStatuses(parsedConfigs, memberIds, clients)
        : new Map();

    const missingSeptemberIds = [];
    for (const { filePath, data } of parsedConfigs) {
        const participants = data.settings?.setembroNofap?.participants;
        if (!participants || typeof participants !== "object") continue;
        for (const [centralId, participant] of Object.entries(participants)) {
            if ((participant?.platform || platform) === platform && !participant?.platformId) {
                missingSeptemberIds.push(`${path.basename(filePath)}: participante Setembro ${centralId} sem ID da plataforma; preservado.`);
            }
        }
    }

    const report = {
        platform,
        groupId,
        checkedMembers: memberIds.size,
        absentMembers: [...statuses.values()].filter(status => status === "absent").length,
        unverifiedMembers: [...statuses.values()].filter(status => status === "unknown").length + missingSeptemberIds.length,
        removedRecords: {},
        removedMembers: 0,
        errors: [...clients.errors, ...missingSeptemberIds]
    };
    const removedIds = new Set();

    for (const entry of parsedFiles) {
        const result = updateMemberDataFile({
            ...entry,
            platform,
            statuses,
            removedIds
        });
        if (!result.changed) continue;
        try {
            atomicWriteJson(entry.filePath, entry.data, settingsDir);
            report.removedRecords[entry.type] = (report.removedRecords[entry.type] || 0) + result.removed;
        } catch (error) {
            report.errors.push(`${path.basename(entry.filePath)}: ${error.message || error}`);
        }
    }

    for (const { filePath, data } of parsedConfigs) {
        let changed = false;
        const configStatuses = communityStatuses.get(filePath) || statuses;
        const warns = data.settings?.warnsData;
        if (warns && typeof warns === "object") {
            for (const id of Object.keys(warns)) {
                if (configStatuses.get(String(id)) !== "absent") continue;
                delete warns[id];
                removedIds.add(String(id));
                report.removedRecords.warnings = (report.removedRecords.warnings || 0) + 1;
                changed = true;
            }
        }
        const participants = data.settings?.setembroNofap?.participants;
        if (participants && typeof participants === "object") {
            for (const [centralId, participant] of Object.entries(participants)) {
                if ((participant?.platform || platform) !== platform) continue;
                const platformId = String(participant?.platformId || "");
                if (!platformId || statuses.get(platformId) !== "absent") continue;
                delete participants[centralId];
                removedIds.add(platformId);
                report.removedRecords.september = (report.removedRecords.september || 0) + 1;
                changed = true;
            }
        }
        if (Array.isArray(data.chat)) {
            for (const chat of data.chat) {
                if (String(chat?.id || "") !== groupId) continue;
                const warnsInChat = chat?.settings?.warnsData;
                if (!warnsInChat || typeof warnsInChat !== "object") continue;
                for (const id of Object.keys(warnsInChat)) {
                    if (statuses.get(String(id)) !== "absent") continue;
                    delete warnsInChat[id];
                    removedIds.add(String(id));
                    report.removedRecords.warnings = (report.removedRecords.warnings || 0) + 1;
                    changed = true;
                }
            }
        }
        if (changed) {
            try {
                atomicWriteJson(filePath, data, settingsDir);
            } catch (error) {
                report.errors.push(`${path.basename(filePath)}: ${error.message || error}`);
            }
        }
    }

    invalidateEconomyScope(platform, groupId);
    report.removedMembers = removedIds.size;
    return report;
}

module.exports = {
    discoverGroupData,
    updateOrphanedChats,
    updateGroupMembers
};
