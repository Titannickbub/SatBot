const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const electionResults = require("./electionResults");
const { formatResults } = require("../commands/eleicao");

const STATE_PATH = process.env.ELECTION_MONITOR_PATH
    ? path.resolve(process.env.ELECTION_MONITOR_PATH)
    : path.join(__dirname, "..", "settings", "election-monitor.json");

function createDefaultConfig() {
    return {
        enabled: false,
        platform: null,
        chatId: null,
        threadId: null,
        jobs: []
    };
}

function createStore() {
    return {
        config: createDefaultConfig(),
        configs: {}
    };
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
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH, "utf8") || "{}");
    if (!parsed || typeof parsed !== "object") {
        throw new Error("O arquivo de configuração do monitor eleitoral está inválido.");
    }
    return {
        config: parsed.config && typeof parsed.config === "object"
            ? { ...createDefaultConfig(), ...parsed.config }
            : createDefaultConfig(),
        configs: parsed.configs && typeof parsed.configs === "object" ? parsed.configs : {}
    };
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
        jobs: Array.isArray(base.jobs) ? base.jobs : [],
        platform: target.platform || base.platform || null,
        chatId: target.chatId || base.chatId || null,
        threadId: target.threadId || base.threadId || null
    };
}

function saveMonitorConfig(patch, target = null) {
    const store = readStore();
    if (target && (target.platform || target.chatId)) {
        const key = getConfigKey(target);
        const current = store.configs[key] && typeof store.configs[key] === "object"
            ? store.configs[key]
            : createDefaultConfig();
        const updated = {
            ...createDefaultConfig(),
            ...current,
            ...patch,
            platform: target.platform || current.platform || null,
            chatId: target.chatId || current.chatId || null,
            threadId: target.threadId || current.threadId || null
        };
        store.configs[key] = updated;
        writeStore(store);
        return updated;
    }

    store.config = { ...createDefaultConfig(), ...store.config, ...patch };
    writeStore(store);
    return store.config;
}

function createJob(options) {
    const office = electionResults.OFFICES[options.office];
    if (!office) throw new Error("Cargo eleitoral inválido.");

    return {
        id: randomUUID().slice(0, 8),
        office: options.office,
        state: options.state || "",
        municipality: options.municipality || "",
        query: options.query || "",
        intervalMs: options.intervalMs,
        initialDelayMs: options.initialDelayMs
    };
}

function formatDuration(milliseconds) {
    if (milliseconds === 0) return "agora";
    const minutes = Math.floor(milliseconds / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours % 24) parts.push(`${hours % 24}h`);
    if (minutes % 60) parts.push(`${minutes % 60}min`);
    const seconds = Math.floor((milliseconds % 60_000) / 1000);
    if (seconds) parts.push(`${seconds}s`);
    return parts.join(" ") || "menos de 1s";
}

function getJobLabel(job) {
    const office = electionResults.OFFICES[job.office]?.label || job.office;
    const location = job.municipality
        ? `${job.municipality} - ${job.state}`
        : job.state || "Brasil";
    return `${office} — ${location}`;
}

function getDeliveryText(result, platform) {
    const formatted = formatResults(result, platform);
    if (platform === "discord") {
        return `${formatted.embed.title}\n\n${formatted.embed.description}\n\n${formatted.embed.footer.text}`;
    }
    if (platform === "telegram") {
        return formatted.text
            .replace(/<\/?b>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");
    }
    return formatted;
}

async function runElectionMonitor(options = {}) {
    const config = options.config || loadMonitorConfig(options.target);
    const job = (config.jobs || []).find(item => item.id === options.jobId);
    if (!job) throw new Error("Essa configuração do monitor eleitoral não existe mais.");

    const result = await electionResults.getResults({
        office: job.office,
        state: job.state,
        municipality: job.municipality,
        query: job.query,
        page: 1
    });
    const text = getDeliveryText(result, options.target?.platform);

    if (options.send !== false) {
        const target = options.target;
        const adapter = options.adapter || global.platformRegistry?.[target?.platform];
        if (!target?.platform || !target.chatId || !adapter?.sendText) {
            throw new Error("Não foi possível localizar a plataforma e o chat para enviar o resultado eleitoral.");
        }
        await adapter.sendText(target.chatId, target.threadId || null, text);
    }
    return { text, result };
}

async function syncMonitorSchedules(config, target = null) {
    const schedulerHelper = require("./schedulerHelper");
    const platform = target?.platform || config.platform || null;
    const chatId = target?.chatId || config.chatId || null;
    if (!platform || !chatId) return [];

    const threadId = target?.threadId || config.threadId || null;
    const existing = schedulerHelper.listSchedules(chatId, platform)
        .filter(schedule => schedule.meta?.kind === "election-monitor" && (schedule.threadId || null) === threadId);
    const existingByJob = new Map(existing.map(schedule => [schedule.meta.jobId, schedule]));
    const jobIds = new Set((config.jobs || []).map(job => job.id));

    for (const schedule of existing) {
        if (!jobIds.has(schedule.meta.jobId)) schedulerHelper.removeSchedule(schedule.id);
    }

    const updatedSchedules = [];
    for (const job of config.jobs || []) {
        const current = existingByJob.get(job.id);
        const timingChanged = current && (
            current.trigger?.intervalMs !== job.intervalMs ||
            current.trigger?.initialDelayMs !== job.initialDelayMs
        );
        const wasJustEnabled = current && !current.enabled && Boolean(config.enabled);
        const patch = {
            name: `Apuração eleitoral: ${getJobLabel(job)}`,
            enabled: Boolean(config.enabled),
            platform,
            chatId,
            threadId,
            chatName: target?.chatName || null,
            trigger: {
                type: "interval",
                intervalMs: job.intervalMs,
                initialDelayMs: job.initialDelayMs,
                times: []
            },
            repeat: { mode: "daily", days: [], monthDay: null },
            message: { text: "", mode: "text", media: null },
            meta: { kind: "election-monitor", jobId: job.id },
            state: {
                lastFiredAt: current && !timingChanged && !wasJustEnabled
                    ? current.state?.lastFiredAt || null
                    : null,
                firedCount: current?.state?.firedCount || 0,
                done: false
            }
        };

        if (current) {
            updatedSchedules.push(schedulerHelper.editSchedule(current.id, patch));
        } else {
            const created = schedulerHelper.addSchedule({
                name: patch.name,
                chatId,
                threadId,
                platform,
                chatName: patch.chatName
            });
            updatedSchedules.push(schedulerHelper.editSchedule(created.id, patch));
        }
    }
    return updatedSchedules;
}

module.exports = {
    createDefaultConfig,
    createJob,
    formatDuration,
    getJobLabel,
    loadMonitorConfig,
    runElectionMonitor,
    saveMonitorConfig,
    syncMonitorSchedules
};
