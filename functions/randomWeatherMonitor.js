const fs = require("fs");
const path = require("path");
const weatherMonitor = require("./weatherMonitor");

const STATE_PATH = path.join(__dirname, "..", "settings", "random-weather-monitor.json");

function createDefaultConfig() {
    return {
        enabled: false,
        platform: null,
        chatId: null,
        threadId: null,
        cities: [],
        times: ["08:00"],
        scheduleIds: []
    };
}

function createStore() {
    return { config: createDefaultConfig(), configs: {} };
}

function ensureStateFile() {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STATE_PATH)) {
        fs.writeFileSync(STATE_PATH, JSON.stringify(createStore(), null, 2), "utf8");
    }
}

function readStore() {
    ensureStateFile();
    try {
        const parsed = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        if (!parsed || typeof parsed !== "object") return createStore();
        return {
            config: parsed.config && typeof parsed.config === "object"
                ? { ...createDefaultConfig(), ...parsed.config }
                : createDefaultConfig(),
            configs: parsed.configs && typeof parsed.configs === "object" ? parsed.configs : {}
        };
    } catch (error) {
        console.error("[RCLIMA] Falha ao ler configurações:", error.message || error);
        return createStore();
    }
}

function writeStore(store) {
    ensureStateFile();
    fs.writeFileSync(STATE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function getConfigKey(target = {}) {
    return [target.platform || "", target.chatId || "", target.threadId || ""]
        .filter(Boolean)
        .join(":") || "default";
}

function loadMonitorConfig(target = null) {
    const store = readStore();
    if (!target || (!target.platform && !target.chatId)) return store.config;

    const scoped = store.configs[getConfigKey(target)];
    const config = scoped && typeof scoped === "object"
        ? { ...createDefaultConfig(), ...scoped }
        : { ...createDefaultConfig(), ...store.config };

    return {
        ...config,
        cities: Array.isArray(config.cities) ? config.cities : [],
        platform: target.platform || config.platform || null,
        chatId: target.chatId || config.chatId || null,
        threadId: target.threadId || config.threadId || null
    };
}

function saveMonitorConfig(config, target = null) {
    const store = readStore();
    if (target && (target.platform || target.chatId)) {
        const key = getConfigKey(target);
        const existing = store.configs[key] && typeof store.configs[key] === "object"
            ? store.configs[key]
            : {};
        const merged = {
            ...createDefaultConfig(),
            ...existing,
            ...config,
            cities: Array.isArray(config.cities || existing.cities) ? (config.cities || existing.cities) : []
        };
        store.configs[key] = {
            ...merged,
            platform: target.platform || merged.platform || null,
            chatId: target.chatId || merged.chatId || null,
            threadId: target.threadId || merged.threadId || null
        };
        writeStore(store);
        return store.configs[key];
    }

    store.config = { ...createDefaultConfig(), ...store.config, ...config };
    writeStore(store);
    return store.config;
}

async function runRandomWeatherReport(options = {}) {
    const config = options.config || loadMonitorConfig(options.target);
    const cities = Array.isArray(config.cities) ? config.cities.filter(Boolean) : [];
    if (!cities.length) {
        const text = "❌ Nenhuma cidade definida para o monitor rclima.";
        if (options.send !== false && options.target?.platform && options.target?.chatId) {
            const adapter = options.adapter || global.platformRegistry?.[options.target.platform];
            if (adapter) await adapter.sendText(options.target.chatId, options.target.threadId || null, text);
        }
        return { text };
    }

    const city = cities[Math.floor(Math.random() * cities.length)];
    return weatherMonitor.runWeatherReport({
        ...options,
        config: { ...config, city },
        city
    });
}

async function syncMonitorSchedules(config, target = null) {
    const schedulerHelper = require("./schedulerHelper");
    const platform = target?.platform || config.platform || null;
    const chatId = target?.chatId || config.chatId || null;
    if (!platform || !chatId) return [];

    const existing = schedulerHelper.listSchedules(chatId, platform)
        .filter(schedule => schedule.meta?.kind === "random-weather-monitor");
    const times = Array.isArray(config.times) && config.times.length ? config.times : ["08:00"];
    const patch = {
        name: "Previsão aleatória do tempo",
        enabled: Boolean(config.enabled && config.cities?.length && times.length),
        platform,
        chatId,
        threadId: target?.threadId || config.threadId || null,
        chatName: target?.chatName || null,
        trigger: { type: "fixed", times, intervalMs: null },
        repeat: { mode: "daily", days: [], monthDay: null },
        message: { text: "", mode: "text", media: null },
        meta: { kind: "random-weather-monitor", config: { ...config } },
        state: { lastFiredAt: null, nextFireAt: null, firedCount: 0, done: false }
    };

    if (existing.length) return [schedulerHelper.editSchedule(existing[0].id, patch)];
    const created = schedulerHelper.addSchedule({
        name: patch.name, chatId, threadId: patch.threadId, platform, chatName: patch.chatName
    });
    return [schedulerHelper.editSchedule(created.id, patch)];
}

module.exports = {
    createDefaultConfig,
    loadMonitorConfig,
    saveMonitorConfig,
    runRandomWeatherReport,
    syncMonitorSchedules
};
