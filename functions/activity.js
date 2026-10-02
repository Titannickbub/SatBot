const fs = require("fs");
const path = require("path");
const economy = require("./economy");

const activityDir = path.join(__dirname, "..", "settings", "activity");

function sanitizeFilename(value) {
    return String(value).replace(/[\\/:*?"<>|]/g, "_");
}

function getScope(message) {
    return economy.getScope(message);
}

function getFilePath(message) {
    const scope = getScope(message);
    if (!scope) return null;
    return path.join(activityDir, `${sanitizeFilename(scope.platform)}_${sanitizeFilename(scope.id)}.json`);
}

function defaultData(message) {
    const scope = getScope(message);
    return {
        platform: scope.platform,
        scopeId: scope.id,
        enabled: false,
        users: {}
    };
}

function normalizeUser(user, userId) {
    return {
        userId: String(user?.userId || userId),
        username: user?.username || null,
        displayName: user?.displayName || null,
        total: Math.max(0, Number(user?.total) || 0),
        dailyDate: typeof user?.dailyDate === "string" ? user.dailyDate : null,
        dailyTotal: Math.max(0, Number(user?.dailyTotal) || 0),
        messages: Math.max(0, Number(user?.messages) || 0),
        commands: Math.max(0, Number(user?.commands) || 0),
        stickers: Math.max(0, Number(user?.stickers) || 0),
        files: Math.max(0, Number(user?.files) || 0)
    };
}

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function load(message) {
    const target = getFilePath(message);
    if (!target) return null;
    fs.mkdirSync(activityDir, { recursive: true });
    if (!fs.existsSync(target)) return defaultData(message);

    try {
        const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
        const data = {
            ...defaultData(message),
            ...(parsed && typeof parsed === "object" ? parsed : {}),
            enabled: parsed?.enabled === true,
            users: {}
        };
        if (parsed?.users && typeof parsed.users === "object" && !Array.isArray(parsed.users)) {
            for (const [userId, user] of Object.entries(parsed.users)) {
                data.users[userId] = normalizeUser(user, userId);
            }
        }
        return data;
    } catch (error) {
        console.error("[activity] Erro ao carregar dados:", error);
        return defaultData(message);
    }
}

function save(message, data) {
    const target = getFilePath(message);
    if (!target) return false;
    fs.mkdirSync(activityDir, { recursive: true });
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    try {
        fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
        if (fs.existsSync(target)) fs.rmSync(target, { force: true });
        fs.renameSync(temporary, target);
        return true;
    } catch (error) {
        if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
        console.error("[activity] Erro ao salvar dados:", error);
        return false;
    }
}

function configure(message, enabled) {
    const data = load(message);
    if (!data) return null;
    data.enabled = Boolean(enabled);
    save(message, data);
    return data;
}

function record(message, kind) {
    const data = load(message);
    if (!data || !data.enabled || !message.userId) return null;

    const userId = String(message.userId);
    const user = normalizeUser(data.users[userId], userId);
    user.username = message.username || user.username;
    user.displayName = message.displayName || message.name || user.displayName;
    const today = getLocalDate();
    if (user.dailyDate !== today) {
        user.dailyDate = today;
        user.dailyTotal = 0;
    }
    user.total += 1;
    user.dailyTotal += 1;

    if (kind === "command") user.commands += 1;
    else if (kind === "sticker") user.stickers += 1;
    else if (kind === "file") user.files += 1;
    else user.messages += 1;

    data.users[userId] = user;
    save(message, data);
    return user;
}

function ranking(message) {
    const data = load(message);
    if (!data) return null;
    const today = getLocalDate();
    return {
        enabled: data.enabled,
        users: Object.values(data.users)
            .map(user => {
                const normalized = normalizeUser(user, user.userId);
                normalized.dailyTotal = normalized.dailyDate === today ? normalized.dailyTotal : 0;
                return normalized;
            })
            .sort((a, b) => b.total - a.total || String(a.userId).localeCompare(String(b.userId)))
    };
}

function findUser(message, identifier) {
    const data = load(message);
    if (!data || identifier === null || identifier === undefined) return null;
    const normalized = String(identifier).trim().replace(/^@/, "").toLowerCase();
    if (!normalized) return null;

    return Object.values(data.users).find(user =>
        [user.userId, user.username, user.displayName]
            .filter(Boolean)
            .some(value => String(value).replace(/^@/, "").toLowerCase() === normalized)
    ) || null;
}

function resetUser(message, userId) {
    const data = load(message);
    if (!data || !userId) return null;
    const key = String(userId);
    const user = data.users[key];
    if (!user) return null;
    delete data.users[key];
    save(message, data);
    return normalizeUser(user, key);
}

function resetAll(message) {
    const data = load(message);
    if (!data) return null;
    const count = Object.keys(data.users).length;
    data.users = {};
    save(message, data);
    return count;
}

module.exports = {
    configure,
    findUser,
    load,
    ranking,
    record,
    resetAll,
    resetUser
};
