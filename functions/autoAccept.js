const { loadSettings, saveSettings } = require("./groupSettings");

const queues = new Map();

function defaultConfig() {
    return {
        enabled: false,
        intervalSeconds: 10,
        blockedSymbols: [],
        blockedNames: [],
        schedules: []
    };
}

function getType(message) {
    if (message.platform === "telegram") {
        return message.raw?.chat?.type === "channel" ? "channel" : "group";
    }
    return "group";
}

function getConfig(target) {
    const data = loadSettings(target.platform, String(target.chatId), getType(target));
    return { ...defaultConfig(), ...(data.settings?.autoApprove || {}) };
}

function saveConfig(target, config) {
    const type = getType(target);
    const data = loadSettings(target.platform, String(target.chatId), type);
    data.settings = { ...(data.settings || {}), autoApprove: { ...defaultConfig(), ...config } };
    saveSettings(target.platform, String(target.chatId), type, data, {
        raw: target.raw,
        chatName: target.chatName
    });
    return data.settings.autoApprove;
}

function normalizeList(values) {
    return [...new Set((Array.isArray(values) ? values : [])
        .map(value => String(value).trim())
        .filter(Boolean))];
}

function parseTime(value) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value).trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isWithinSchedule(config, now = new Date()) {
    if (!config.schedules.length) return true;
    const current = now.getHours() * 60 + now.getMinutes();
    return config.schedules.some(schedule => {
        const start = parseTime(schedule.start);
        const end = parseTime(schedule.end);
        if (start === null || end === null) return false;
        return start <= end ? current >= start && current <= end : current >= start || current <= end;
    });
}

function isBlocked(config, candidate) {
    const name = String(candidate.name || candidate.username || candidate.id || "").toLowerCase();
    return config.blockedNames.some(value => name.includes(String(value).toLowerCase()))
        || config.blockedSymbols.some(value => name.includes(String(value).toLowerCase()));
}

function enqueue(key, task, delaySeconds) {
    const previous = queues.get(key) || Promise.resolve();
    const next = previous
        .catch(() => {})
        .then(async () => {
            await new Promise(resolve => setTimeout(resolve, Math.max(0, Number(delaySeconds) || 0) * 1000));
            return task();
        });
    queues.set(key, next.finally(() => {
        if (queues.get(key) === next) queues.delete(key);
    }));
    return next;
}

function shouldAccept(target, candidate) {
    const config = getConfig(target);
    return config.enabled && isWithinSchedule(config) && !isBlocked(config, candidate);
}

async function approveTelegram(ctx) {
    const request = ctx.chatJoinRequest;
    if (!request) return false;
    const target = { platform: "telegram", chatId: String(request.chat.id), raw: ctx };
    const candidate = {
        id: request.from?.id,
        username: request.from?.username,
        name: [request.from?.first_name, request.from?.last_name].filter(Boolean).join(" ")
    };
    if (!shouldAccept(target, candidate)) return false;
    const config = getConfig(target);
    await enqueue(`telegram:${target.chatId}`, () => ctx.approveChatJoinRequest(request.from.id), config.intervalSeconds);
    return true;
}

async function approveWhatsApp(sock, request) {
    if (!request?.id || !request?.participant) return false;
    const target = { platform: "whatsapp", chatId: String(request.id), raw: request };
    const candidate = {
        id: request.participant,
        username: request.authorUsername,
        name: request.authorUsername || request.participant
    };
    if (!shouldAccept(target, candidate)) return false;
    const config = getConfig(target);
    await enqueue(`whatsapp:${target.chatId}`, () =>
        sock.groupRequestParticipantsUpdate(target.chatId, [request.participant], "approve"),
    config.intervalSeconds);
    return true;
}

module.exports = {
    defaultConfig,
    getConfig,
    saveConfig,
    parseTime,
    isWithinSchedule,
    approveTelegram,
    approveWhatsApp
};
