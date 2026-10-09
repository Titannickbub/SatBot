const fs = require("fs");
const path = require("path");
const {
    getMarketIndexes,
    formatNumber,
    formatChange,
    formatCurrency
} = require("./mercado");

const STATE_PATH = process.env.STOCK_MONITOR_PATH
    ? path.resolve(process.env.STOCK_MONITOR_PATH)
    : path.join(__dirname, "..", "settings", "stock-monitor.json");

function createDefaultConfig() {
    return {
        enabled: false,
        platform: null,
        chatId: null,
        threadId: null,
        symbols: [],
        times: ["09:00"],
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
        return {
            config: { ...createDefaultConfig(), ...(parsed?.config || {}) },
            configs: parsed?.configs && typeof parsed.configs === "object" ? parsed.configs : {}
        };
    } catch (error) {
        console.error("[STOCK MONITOR] Falha ao ler configuração:", error.message || error);
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
    const base = scoped && typeof scoped === "object" ? scoped : store.config;
    return {
        ...createDefaultConfig(),
        ...base,
        platform: target.platform || base.platform || null,
        chatId: target.chatId || base.chatId || null,
        threadId: target.threadId || base.threadId || null
    };
}

function saveMonitorConfig(config, target = null) {
    const store = readStore();
    if (target && (target.platform || target.chatId)) {
        const key = getConfigKey(target);
        const current = store.configs[key] || {};
        store.configs[key] = {
            ...createDefaultConfig(),
            ...current,
            ...config,
            platform: target.platform || current.platform || null,
            chatId: target.chatId || current.chatId || null,
            threadId: target.threadId || current.threadId || null
        };
        writeStore(store);
        return store.configs[key];
    }

    store.config = { ...createDefaultConfig(), ...store.config, ...config };
    writeStore(store);
    return store.config;
}

function buildStockMessage(indexes) {
    const lines = ["📈 *MONITOR DA BOLSA*", ""];
    for (const index of indexes) {
        if (Number.isFinite(Number(index.bid)) && Number.isFinite(Number(index.ask))) {
            lines.push(`*${index.label}*`);
            lines.push(`Compra: *${formatCurrency(index.bid)}*`);
            lines.push(`Venda: *${formatCurrency(index.ask)}*`);
        } else {
            lines.push(`*${index.label}*: ${formatNumber(index.value)} ${index.unit || "pontos"}`);
        }
        lines.push(`Variação: *${formatChange(index.change)}*`);
        if (index.market) lines.push(`${index.marketLabel || "Bolsa"}: ${index.market}`);
        if (index.updatedAt) lines.push(`Atualizado em: ${index.updatedAt}`);
        lines.push("");
    }
    const sources = [...new Set(indexes.map((index) => index.source).filter(Boolean))];
    if (sources.length) {
        lines.push(`🌐 Fonte: ${sources.join(" e ")}`);
    }
    return lines.join("\n");
}

async function runStockReport(options = {}) {
    const config = options.config || loadMonitorConfig(options.target);
    const send = options.send !== false;
    const target = options.target || null;
    const indexes = await getMarketIndexes(options.symbols || config.symbols);
    const text = buildStockMessage(indexes);

    if (send && target?.platform && target.chatId) {
        const adapter = options.adapter || global.platformRegistry?.[target.platform];
        if (!adapter || typeof adapter.sendText !== "function") {
            throw new Error(`Adapter não disponível para ${target.platform}.`);
        }
        await adapter.sendText(target.chatId, target.threadId || null, text);
    }

    return { text, indexes };
}

async function syncMonitorSchedules(config, target = null) {
    try {
        const schedulerHelper = require("./schedulerHelper");
        const platform = target?.platform || config.platform;
        const chatId = target?.chatId || config.chatId;
        if (!platform || !chatId) return [];

        const existing = schedulerHelper.listSchedules(chatId, platform)
            .filter((schedule) => schedule.meta?.kind === "stock-monitor");
        const times = Array.isArray(config.times) && config.times.length ? config.times : ["09:00"];
        const patch = {
            name: "Cotações da bolsa",
            enabled: Boolean(config.enabled && times.length),
            platform,
            chatId,
            threadId: target?.threadId || config.threadId || null,
            chatName: target?.chatName || null,
            trigger: { type: "fixed", times, intervalMs: null },
            repeat: { mode: "daily", days: [], monthDay: null },
            message: { text: "", mode: "text", media: null },
            meta: { kind: "stock-monitor", symbols: [...(config.symbols || [])], config: { ...config } },
            state: { lastFiredAt: null, nextFireAt: null, firedCount: 0, done: false }
        };

        if (existing.length) return [schedulerHelper.editSchedule(existing[0].id, patch)];
        const created = schedulerHelper.addSchedule({
            name: patch.name, chatId, threadId: patch.threadId, platform, chatName: patch.chatName
        });
        return [schedulerHelper.editSchedule(created.id, patch)];
    } catch (error) {
        console.error("[STOCK MONITOR] Falha ao sincronizar agendamentos:", error.message || error);
        return [];
    }
}

module.exports = {
    createDefaultConfig,
    loadMonitorConfig,
    saveMonitorConfig,
    runStockReport,
    syncMonitorSchedules,
    buildStockMessage
};
