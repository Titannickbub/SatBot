const fs = require("fs");
const path = require("path");
const economy = require("./economy");

const dataDir = path.join(__dirname, "..", "settings", "xp");

function scopeId(message) {
    const scope = economy.getScope(message);
    if (!scope) return null;
    return `${scope.platform}_${scope.id}`;
}

function filePath(message) {
    const id = scopeId(message);
    return id ? path.join(dataDir, `${id.replace(/[\\/:*?"<>|]/g, "_")}.json`) : null;
}

function defaultData(message) {
    const scope = economy.getScope(message);
    return {
        platform: scope.platform,
        chatId: String(scope.id),
        enabled: false,
        levelUp: {
            muted: false,
            chatId: null,
            threadId: null
        },
        users: {}
    };
}

function load(message) {
    const target = filePath(message);
    if (!target) return null;
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(target)) return defaultData(message);

    try {
        const data = JSON.parse(fs.readFileSync(target, "utf8"));
        return {
            ...defaultData(message),
            ...data,
            levelUp: { ...defaultData(message).levelUp, ...(data.levelUp || {}) },
            users: data.users && typeof data.users === "object" ? data.users : {}
        };
    } catch (error) {
        console.error("[xp] Erro ao carregar dados:", error);
        return defaultData(message);
    }
}

function save(message, data) {
    const target = filePath(message);
    if (!target) return false;
    fs.mkdirSync(dataDir, { recursive: true });
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    fs.renameSync(temporary, target);
    return true;
}

function levelForXp(xp) {
    let level = 1;
    let spent = 0;
    while (xp >= spent + level * 100) {
        spent += level * 100;
        level += 1;
    }
    return { level, currentLevelXp: spent, nextLevelXp: spent + level * 100 };
}

function getUser(data, message) {
    const id = String(message.userId || "");
    if (!id) return null;
    if (!data.users[id]) {
        data.users[id] = {
            userId: id,
            xp: 0,
            username: message.username || null,
            displayName: message.displayName || message.name || null
        };
    }
    const user = data.users[id];
    user.username = message.username || user.username;
    user.displayName = message.displayName || message.name || user.displayName;
    return user;
}

function ranking(message) {
    const data = load(message);
    if (!data) return [];
    return Object.values(data.users)
        .sort((a, b) => b.xp - a.xp || String(a.userId).localeCompare(String(b.userId)));
}

function position(message, userId) {
    const index = ranking(message).findIndex(user => String(user.userId) === String(userId));
    return index === -1 ? null : index + 1;
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

function getUserById(message, userId) {
    const data = load(message);
    if (!data || userId === null || userId === undefined) return null;
    const user = data.users[String(userId)];
    return user && typeof user === "object" ? user : null;
}

function adjustXp(message, target, amount, operation) {
    const data = load(message);
    if (!data || !target) return null;
    const user = data.users[String(target.userId)];
    if (!user || typeof user !== "object") return null;

    const previousXp = Math.max(0, Number(user.xp) || 0);
    if (operation === "set") {
        user.xp = amount;
    } else if (operation === "add") {
        user.xp = previousXp + amount;
    } else {
        user.xp = Math.max(0, previousXp - amount);
    }
    save(message, data);
    return {
        previousXp,
        xp: user.xp,
        user
    };
}

function addMessageXp(message) {
    const data = load(message);
    if (!data || !data.enabled || !message.userId) return null;
    const user = getUser(data, message);
    const before = levelForXp(user.xp);
    user.xp += 1;
    const after = levelForXp(user.xp);
    save(message, data);
    const reward = after.level > before.level
        ? require("./economy").rewardLevelUp(message, after.level)
        : null;
    return {
        user,
        levelUp: after.level > before.level,
        level: after.level,
        config: data.levelUp,
        reward
    };
}

async function addActivityXp(message, activity, result) {
    const economy = require("./economy");
    if (!economy.isEnabled(message)) return null;

    const data = load(message);
    if (!data || !data.enabled || !message.userId) return null;

    const amount = activityXp(activity, result);
    if (amount <= 0) return { amount: 0, levelUp: false };

    const user = getUser(data, message);
    const before = levelForXp(user.xp);
    user.xp += amount;
    const after = levelForXp(user.xp);
    save(message, data);
    const outcome = {
        amount,
        user,
        levelUp: after.level > before.level,
        level: after.level,
        reward: after.level > before.level
            ? economy.rewardLevelUp(message, after.level)
            : null
    };
    if (outcome.levelUp) await notifyLevelUp(message, outcome.level, data.levelUp, outcome.reward);
    return outcome;
}

async function notifyLevelUp(message, level, config, reward = null) {
    if (config.muted) return;
    const send = require("./send");
    const chatId = config.chatId || message.chatId;
    const threadId = config.chatId ? config.threadId : message.threadId;
    const name = message.displayName || message.username || message.name || message.userId;
    const rewardText = reward ? `\n💷 Recompensa: ${formatMoney(reward.amount)}` : "";
    const text = `🎉 ${name} alcançou o nível ${level} no rank XP!${rewardText}`;
    try {
        await send.text(message.platform, chatId, threadId, text);
    } catch (error) {
        console.error("[xp] Não foi possível enviar aviso de level-up:", error);
    }

    function formatMoney(amount) {
        return `${(Number(amount) / 100).toFixed(2)}💷`;
    }
}

function activityXp(activity, result) {
    if (!result) return 0;

    if (activity === "work") {
        if (!result.worked) return 0;
        if (result.outcome === "bonus") return 10;
        if (result.outcome === "bad") return 2;
        return 5;
    }

    if (activity === "fishing" || activity === "mining") {
        const completed = activity === "fishing" ? result.fished : result.mined;
        if (!completed) return 0;
        if (result.type === "good") return 10;
        if (result.type === "bad" || result.type === "trash") return 2;
        return 5;
    }

    if (activity === "robbery") {
        if (!["partial", "total", "failed", "caught", "lawsuit", "shield"].includes(result.outcome)) {
            return 0;
        }
        if (result.outcome === "total") return 10;
        if (result.outcome === "partial") return 5;
        return 2;
    }

    return 0;
}

function configure(message, changes) {
    const data = load(message);
    if (!data) return null;
    if (Object.prototype.hasOwnProperty.call(changes, "enabled")) data.enabled = changes.enabled;
    if (Object.prototype.hasOwnProperty.call(changes, "muted")) data.levelUp.muted = changes.muted;
    if (Object.prototype.hasOwnProperty.call(changes, "chatId")) {
        data.levelUp.chatId = changes.chatId;
        data.levelUp.threadId = changes.threadId || null;
    }
    save(message, data);
    return data;
}

module.exports = {
    load,
    save,
    ranking,
    position,
    findUser,
    getUserById,
    adjustXp,
    levelForXp,
    addMessageXp,
    addActivityXp,
    activityXp,
    notifyLevelUp,
    configure,
    getUser,
    scopeId
};
