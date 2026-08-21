const fs = require("fs");
const path = require("path");
const { getCotacaoMinasul } = require("./Minasul");
const { getCotacaoCoocafe } = require("./Coocafe");
const { getCotacaoCCCMG } = require("./CCCMG");

const STATE_PATH = process.env.CAFE_MONITOR_PATH
    ? path.resolve(process.env.CAFE_MONITOR_PATH)
    : path.join(__dirname, "..", "settings", "cafe-monitor.json");

function createEmptyState() {
    return {
        version: 1,
        lastUpdatedAt: null,
        lastSnapshot: null,
        history: [],
        weeklyStats: null,
        sources: {}
    };
}

function createDefaultConfig() {
    return {
        enabled: false,
        mode: "both",
        platform: null,
        chatId: null,
        threadId: null,
        sources: ["Minasul", "Coocafe", "CCCMG"],
        sendMode: "all",
        monitorIntervalMs: 60 * 60 * 1000,
        times: ["07:00", "13:00", "20:00"],
        scheduleIds: []
    };
}

function createStore() {
    return {
        config: createDefaultConfig(),
        configs: {},
        state: createEmptyState()
    };
}

function ensureStateFile() {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(STATE_PATH)) {
        fs.writeFileSync(STATE_PATH, JSON.stringify(createStore(), null, 2), "utf8");
    }
}

function readStore() {
    ensureStateFile();

    try {
        const raw = fs.readFileSync(STATE_PATH, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
            return createStore();
        }

        const config = parsed.config && typeof parsed.config === "object"
            ? { ...createDefaultConfig(), ...parsed.config }
            : createDefaultConfig();

        const configs = parsed.configs && typeof parsed.configs === "object"
            ? parsed.configs
            : {};

        const state = parsed.state && typeof parsed.state === "object"
            ? {
                ...createEmptyState(),
                ...parsed.state,
                history: Array.isArray(parsed.state.history) ? parsed.state.history : [],
                sources: parsed.state.sources && typeof parsed.state.sources === "object" ? parsed.state.sources : {}
            }
            : createEmptyState();

        return { config, configs, state };
    } catch (error) {
        return createStore();
    }
}

function writeStore(store) {
    ensureStateFile();
    fs.writeFileSync(STATE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function getConfigKey(target = {}) {
    const platform = target.platform || target.platformName || "";
    const chatId = target.chatId || target.id || "";
    const threadId = target.threadId || "";
    return [platform, chatId, threadId].filter(Boolean).join(":") || "default";
}

function loadMonitorConfig(target = null) {
    const store = readStore();
    if (!target || (!target.platform && !target.chatId)) {
        return store.config;
    }

    const key = getConfigKey(target);
    const scoped = store.configs?.[key];
    if (scoped && typeof scoped === "object") {
        return { ...createDefaultConfig(), ...scoped, platform: target.platform || scoped.platform || null, chatId: target.chatId || scoped.chatId || null, threadId: target.threadId || scoped.threadId || null };
    }

    return { ...createDefaultConfig(), ...store.config, platform: target.platform || store.config.platform || null, chatId: target.chatId || store.config.chatId || null, threadId: target.threadId || store.config.threadId || null };
}

function saveMonitorConfig(config, target = null) {
    const store = readStore();
    const normalized = { ...createDefaultConfig(), ...(target ? {} : store.config), ...config };

    if (target && (target.platform || target.chatId)) {
        const key = getConfigKey(target);
        store.configs[key] = {
            ...createDefaultConfig(),
            ...normalized,
            platform: target.platform || config.platform || null,
            chatId: target.chatId || config.chatId || null,
            threadId: target.threadId || config.threadId || null
        };
        writeStore(store);
        return store.configs[key];
    }

    store.config = normalized;
    writeStore(store);
    return store.config;
}

function loadMonitorState() {
    return readStore().state;
}

function getSourceUpdateTime(sourceData) {
    if (!sourceData || typeof sourceData !== "object") return null;
    return sourceData.atualizadoEm || sourceData.data || null;
}

function findPreviousSnapshotForSource(state, sourceName, currentUpdateTime) {
    if (!state || !Array.isArray(state.history)) return null;

    for (let i = state.history.length - 1; i >= 0; i--) {
        const entry = state.history[i];
        const snapshot = entry?.snapshot;
        const source = snapshot?.sources?.[sourceName];
        if (!source) continue;

        const sourceTime = getSourceUpdateTime(source);
        if (!sourceTime || sourceTime !== currentUpdateTime) {
            return snapshot;
        }
    }

    return null;
}

function saveMonitorState(state) {
    const store = readStore();
    store.state = state;
    writeStore(store);
}

function normalizePrice(value) {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const text = String(value).trim();
    if (!text || text === "A Consultar" || text.toLowerCase() === "não divulgado") return null;

    const matches = text.match(/[\d.]+,\d{2}/g);
    if (!matches || matches.length === 0) {
        const fallback = Number.parseFloat(text.replace(/[^0-9,.-]/g, ""));
        return Number.isFinite(fallback) ? fallback : null;
    }

    const numbers = matches.map(entry => parseFloat(entry.replace(/\./g, "").replace(",", ".")));
    if (numbers.length === 1) return numbers[0];
    return (numbers[0] + numbers[1]) / 2;
}

function getMetricLabel(metricKey) {
    if (!metricKey || typeof metricKey !== "string") return "";
    if (metricKey.startsWith("cccmg-")) {
        const cleaned = metricKey.replace(/^cccmg-/, "").replace(/-/g, " ");
        return cleaned.replace(/\b\w/g, char => char.toUpperCase());
    }
    const spaced = metricKey.replace(/([a-z])([A-Z])/g, "$1 $2");
    return spaced.replace(/\b\w/g, char => char.toUpperCase());
}

function getSnapshotMetricValue(snapshot, sourceName, metricKey) {
    if (!snapshot || !snapshot.sources || !metricKey) return null;
    return normalizePrice(snapshot.sources?.[sourceName]?.metrics?.[metricKey]);
}

function getMetricChangeText(sourceName, metricKey, currentValue, previousSnapshot) {
    const currentNumeric = normalizePrice(currentValue);
    const previousNumeric = getSnapshotMetricValue(previousSnapshot, sourceName, metricKey);
    if (currentNumeric === null || previousNumeric === null) return "";

    const diff = currentNumeric - previousNumeric;
    if (diff === 0) return " _(➡️ est.)_";

    const pct = previousNumeric > 0 ? (diff / previousNumeric) * 100 : 0;
    const sinal = diff > 0 ? "+" : "-";
    const emoji = diff > 0 ? "📈" : "📉";

    return ` ${emoji} _(${sinal}${formatPrice(Math.abs(diff))} | ${sinal}${Math.abs(pct).toFixed(2)}%)_`;
}

function buildPayloadReportLines(sourceName, payload, state, bestMap) {
    const metrics = payload?.cotacoes || payload?.metrics || {};
    const entries = Object.entries(metrics).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (entries.length === 0) return [];

    const label = sourceName === "Coocafe" ? "Coocafé" : sourceName;
    const lines = [`• ${label}:`];

    for (const [metricKey, rawValue] of entries) {
        const value = typeof rawValue === "object"
            ? (rawValue.preco ?? rawValue.espiritoSanto ?? rawValue.minasGerais ?? null)
            : rawValue;
        if (value === null || value === undefined || value === "") continue;

        const changeText = getMetricChangeText(sourceName, metricKey, value, state?.lastSnapshot);
        const best = bestMap?.[`${sourceName}::${metricKey}`];
        const bestText = best ? ` 🏆 *Melhor da semana:* ${formatPrice(best.value)}` : "";
        lines.push(`  - ${getMetricLabel(metricKey)}: ${value}${changeText}${bestText}`);
    }

    return lines;
}

function getWeeklyBestMap(state, currentSnapshot = null) {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const snapshots = [];

    if (Array.isArray(state.history)) {
        for (const entry of state.history) {
            const timestamp = new Date(entry.timestamp || entry.snapshot?.capturedAt || 0).getTime();
            if (timestamp && timestamp >= cutoff && entry.snapshot) {
                snapshots.push(entry.snapshot);
            }
        }
    }

    if (currentSnapshot && currentSnapshot.sources) {
        snapshots.push(currentSnapshot);
    }

    const bestMap = {};
    for (const snapshot of snapshots) {
        for (const [sourceName, sourceData] of Object.entries(snapshot.sources || {})) {
            for (const [metricKey, rawValue] of Object.entries(sourceData.metrics || {})) {
                const numeric = normalizePrice(rawValue);
                if (numeric === null) continue;
                const mapKey = `${sourceName}::${metricKey}`;
                if (!bestMap[mapKey] || numeric > bestMap[mapKey].value) {
                    bestMap[mapKey] = {
                        sourceName,
                        metricKey,
                        value: numeric
                    };
                }
            }
        }
    }

    return bestMap;
}

function formatPrice(value) {
    if (value === null || value === undefined) return "—";
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
    const signal = value > 0 ? "+" : "";
    return `${signal}${value.toFixed(2)}%`;
}

function slugify(value) {
    return String(value)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function flattenSource(sourceName, payload) {
    const metrics = {};
    const base = {
        fonte: payload?.fonte || sourceName,
        atualizadoEm: payload?.atualizadoEm || payload?.data || null
    };

    if (payload?.cotacoes && typeof payload.cotacoes === "object") {
        for (const [key, value] of Object.entries(payload.cotacoes)) {
            if (value && typeof value === "object") {
                if ("espiritoSanto" in value || "minasGerais" in value) {
                    if (value.espiritoSanto !== undefined) {
                        metrics[`${key}EspiritoSanto`] = value.espiritoSanto;
                    }
                    if (value.minasGerais !== undefined) {
                        metrics[`${key}MinasGerais`] = value.minasGerais;
                    }
                } else {
                    metrics[key] = value.preco ?? value.espiritoSanto ?? value.minasGerais ?? null;
                }
            } else {
                metrics[key] = value;
            }
        }
    }

    if (Array.isArray(payload?.precos)) {
        payload.precos.forEach((item, index) => {
            const key = slugify(`${sourceName}-${item?.padrao || item?.nome || index}`);
            metrics[key] = item?.preco ?? null;
        });
    }

    return {
        ...base,
        metrics
    };
}

function buildSnapshot(sourcePayloads) {
    const sources = {};
    for (const [sourceName, payload] of Object.entries(sourcePayloads || {})) {
        if (!payload) continue;
        sources[sourceName] = flattenSource(sourceName, payload);
    }

    return {
        capturedAt: new Date().toISOString(),
        sources
    };
}

function compareSnapshots(previousSnapshot, currentSnapshot) {
    const changes = [];

    if (!previousSnapshot || !currentSnapshot) return changes;

    const sources = new Set([
        ...Object.keys(previousSnapshot.sources || {}),
        ...Object.keys(currentSnapshot.sources || {})
    ]);

    for (const sourceName of sources) {
        const prevSource = previousSnapshot.sources?.[sourceName] || { metrics: {} };
        const currSource = currentSnapshot.sources?.[sourceName] || { metrics: {} };

        const metricKeys = new Set([
            ...Object.keys(prevSource.metrics || {}),
            ...Object.keys(currSource.metrics || {})
        ]);

        for (const metricKey of metricKeys) {
            const previousValue = normalizePrice(prevSource.metrics?.[metricKey]);
            const currentValue = normalizePrice(currSource.metrics?.[metricKey]);

            if (previousValue === null || currentValue === null || previousValue === currentValue) {
                continue;
            }

            const delta = currentValue - previousValue;
            const percent = previousValue > 0 ? (delta / previousValue) * 100 : null;
            changes.push({
                source: sourceName,
                metric: metricKey,
                previousValue,
                currentValue,
                delta,
                percent
            });
        }
    }

    return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function buildWeeklyStats(history) {
    const window = history.filter(entry => {
        const timestamp = new Date(entry?.timestamp || entry?.snapshot?.capturedAt || 0).getTime();
        return timestamp && Date.now() - timestamp <= 7 * 24 * 60 * 60 * 1000;
    });

    const series = new Map();

    for (const entry of window) {
        const snapshot = entry?.snapshot || {};
        for (const [sourceName, sourceData] of Object.entries(snapshot.sources || {})) {
            for (const [metricKey, metricValue] of Object.entries(sourceData.metrics || {})) {
                const numericValue = normalizePrice(metricValue);
                if (numericValue === null) continue;

                const key = `${sourceName}::${metricKey}`;
                if (!series.has(key)) {
                    series.set(key, []);
                }
                series.get(key).push({
                    timestamp: new Date(entry.timestamp || snapshot.capturedAt || Date.now()).getTime(),
                    value: numericValue
                });
            }
        }
    }

    const points = Array.from(series.entries())
        .map(([key, values]) => ({
            key,
            values: values.sort((a, b) => a.timestamp - b.timestamp)
        }))
        .filter(item => item.values.length >= 2);

    let highestRise = null;
    let highestFall = null;

    for (const item of points) {
        const first = item.values[0].value;
        const last = item.values[item.values.length - 1].value;
        const delta = last - first;

        if (delta > 0 && (!highestRise || delta > highestRise.delta)) {
            highestRise = {
                source: item.key.split("::")[0],
                metric: item.key.split("::")[1],
                delta,
                from: first,
                to: last
            };
        }

        if (delta < 0 && (!highestFall || delta < highestFall.delta)) {
            highestFall = {
                source: item.key.split("::")[0],
                metric: item.key.split("::")[1],
                delta,
                from: first,
                to: last
            };
        }
    }

    return {
        windowDays: 7,
        highestRise,
        highestFall
    };
}

function updateMonitorState(sourcePayloads) {
    const state = loadMonitorState();
    const snapshot = buildSnapshot(sourcePayloads);
    const previousSnapshot = state.lastSnapshot;

    const changes = previousSnapshot ? compareSnapshots(previousSnapshot, snapshot) : [];
    const hasMeaningfulChange = changes.length > 0;

    if (!hasMeaningfulChange && previousSnapshot) {
        state.lastSnapshot = snapshot;
        state.lastUpdatedAt = snapshot.capturedAt;
        state.sources = snapshot.sources;
        saveMonitorState(state);
        return {
            state,
            snapshot,
            changes: []
        };
    }

    const historyEntry = {
        timestamp: snapshot.capturedAt,
        snapshot,
        changes
    };

    state.lastSnapshot = snapshot;
    state.lastUpdatedAt = snapshot.capturedAt;
    state.sources = snapshot.sources;
    state.history = [...state.history, historyEntry].slice(-200);
    state.weeklyStats = buildWeeklyStats(state.history);

    saveMonitorState(state);

    return {
        state,
        snapshot,
        previousSnapshot,
        changes
    };
}

function pickSourceList(configOrSources) {
    if (Array.isArray(configOrSources)) return configOrSources;
    if (!configOrSources) return ["Minasul", "Coocafe", "CCCMG"];
    if (configOrSources === "all") return ["Minasul", "Coocafe", "CCCMG"];
    if (typeof configOrSources === "string") {
        return configOrSources.split(",").map(item => item.trim()).filter(Boolean);
    }
    return ["Minasul", "Coocafe", "CCCMG"];
}

async function collectCurrentPayloads(sources = null) {
    const requested = pickSourceList(sources);
    const payloads = {};

    if (requested.includes("Minasul") || requested.includes("all")) {
        try {
            payloads.Minasul = await getCotacaoMinasul();
        } catch (error) {
            payloads.Minasul = null;
        }
    }

    if (requested.includes("Coocafe") || requested.includes("all")) {
        try {
            payloads.Coocafe = await getCotacaoCoocafe();
        } catch (error) {
            payloads.Coocafe = null;
        }
    }

    if (requested.includes("CCCMG") || requested.includes("all")) {
        try {
            payloads.CCCMG = await getCotacaoCCCMG();
        } catch (error) {
            payloads.CCCMG = null;
        }
    }

    return payloads;
}

function normalizeSourceName(name) {
    const lookup = {
        minasul: "Minasul",
        coocafe: "Coocafe",
        cccmg: "CCCMG"
    };
    return lookup[String(name || "").toLowerCase()] || name;
}

async function syncMonitorSchedules(config, target = null) {
    try {
        const schedulerHelper = require("./schedulerHelper");
        const platform = target?.platform || config.platform || null;
        const chatId = target?.chatId || config.chatId || null;

        if (!platform || !chatId) {
            return [];
        }

        const existing = schedulerHelper.listSchedules(chatId, platform)
            .filter(schedule => schedule.meta?.kind === "cafe-monitor");

        const times = Array.isArray(config.times) && config.times.length
            ? config.times
            : ["07:00"];

        const isScheduledMode = config.mode === "scheduled" || config.mode === "loop" || config.mode === "both";
        const patch = {
            name: "Monitor do café",
            enabled: Boolean(config.enabled && isScheduledMode && times.length),
            platform,
            chatId,
            threadId: target?.threadId || config.threadId || null,
            chatName: target?.chatName || null,
            trigger: {
                type: "fixed",
                times,
                intervalMs: null
            },
            repeat: {
                mode: "daily",
                days: [],
                monthDay: null
            },
            message: {
                text: "",
                mode: "text",
                media: null
            },
            meta: {
                kind: "cafe-monitor",
                sources: pickSourceList(config.sources),
                config: { ...config }
            },
            state: {
                lastFiredAt: null,
                nextFireAt: null,
                firedCount: 0,
                done: false
            }
        };

        if (existing.length) {
            const base = existing[0];
            const updated = schedulerHelper.editSchedule(base.id, patch);
            return [updated];
        }

        const created = schedulerHelper.addSchedule({
            name: patch.name,
            chatId,
            threadId: patch.threadId,
            platform,
            chatName: patch.chatName
        });

        const updated = schedulerHelper.editSchedule(created.id, patch);
        return [updated];
    } catch (error) {
        console.error("❌[CAFE MONITOR] Falha ao sincronizar agendamentos:", error.message || error);
        return [];
    }
}

let _monitorLoop = null;

function startMonitorLoop() {
    if (_monitorLoop) return;

    _monitorLoop = setInterval(async () => {
        try {
            const store = readStore();
            const activeTargets = Object.entries(store.configs || {})
                .map(([key, entry]) => ({ key, ...entry }))
                .filter(entry => entry && entry.enabled && (entry.mode === "monitor" || entry.mode === "both"))
                .map(entry => ({
                    platform: entry.platform,
                    chatId: entry.chatId,
                    threadId: entry.threadId || null,
                    chatName: entry.chatName || null,
                    config: entry
                }));

            const fallbackConfig = loadMonitorConfig();
            if (fallbackConfig.enabled && (fallbackConfig.mode === "monitor" || fallbackConfig.mode === "both")) {
                activeTargets.push({
                    platform: fallbackConfig.platform,
                    chatId: fallbackConfig.chatId,
                    threadId: fallbackConfig.threadId || null,
                    chatName: null,
                    config: fallbackConfig
                });
            }

            const uniqueTargets = [];
            const seen = new Set();
            for (const target of activeTargets) {
                const signature = `${target.platform || ""}:${target.chatId || ""}:${target.threadId || ""}`;
                if (!signature || seen.has(signature)) continue;
                seen.add(signature);
                uniqueTargets.push(target);
            }

            for (const target of uniqueTargets) {
                if (!target.platform || !target.chatId) {
                    continue;
                }

                await runCafeMonitor({
                    config: target.config,
                    sources: target.config.sources,
                    send: true,
                    onlyIfChanged: true,
                    target: {
                        platform: target.platform,
                        chatId: target.chatId,
                        threadId: target.threadId || null,
                        chatName: target.chatName || null
                    }
                });
            }
        } catch (error) {
            console.error("❌[CAFE MONITOR] Erro no loop de monitoramento:", error.message || error);
        }
    }, 60 * 60 * 1000);
}

function extractPayloadMetrics(sourceName, payload) {
    const items = [];

    if (payload?.cotacoes && typeof payload.cotacoes === "object") {
        for (const [metricKey, rawValue] of Object.entries(payload.cotacoes)) {
            if (rawValue === null || rawValue === undefined) continue;
            if (typeof rawValue === "object" && ("espiritoSanto" in rawValue || "minasGerais" in rawValue)) {
                if (rawValue.espiritoSanto !== undefined) {
                    items.push({
                        metricKey: `${metricKey}EspiritoSanto`,
                        label: `${getMetricLabel(metricKey)} ES`,
                        value: rawValue.espiritoSanto
                    });
                }
                if (rawValue.minasGerais !== undefined) {
                    items.push({
                        metricKey: `${metricKey}MinasGerais`,
                        label: `${getMetricLabel(metricKey)} MG`,
                        value: rawValue.minasGerais
                    });
                }
            } else {
                const value = typeof rawValue === "object" ? (rawValue.preco ?? rawValue.espiritoSanto ?? rawValue.minasGerais ?? null) : rawValue;
                items.push({ metricKey, label: getMetricLabel(metricKey), value });
            }
        }
    }

    if (Array.isArray(payload?.precos)) {
        payload.precos.forEach((item, index) => {
            const key = slugify(`${sourceName}-${item?.padrao || item?.nome || index}`);
            items.push({
                metricKey: key,
                label: item?.padrao || item?.nome || `Item ${index + 1}`,
                value: item?.preco ?? null
            });
        });
    }

    return items.filter(item => item.value !== null && item.value !== undefined && item.value !== "");
}

function buildPayloadReportLines(sourceName, payload, state, bestMap, previousSnapshot = null) {
    const label = sourceName === "Coocafe" ? "Coocafé" : sourceName;
    const lines = [`• ${label}:`];
    const metrics = extractPayloadMetrics(sourceName, payload);
    const currentUpdateTime = getSourceUpdateTime(payload);

    const prevSnapshot = previousSnapshot
        || findPreviousSnapshotForSource(state, sourceName, currentUpdateTime)
        || (state?.history && state.history.length >= 2 ? state.history[state.history.length - 2]?.snapshot : null);

    for (const metric of metrics) {
        const changeText = getMetricChangeText(sourceName, metric.metricKey, metric.value, prevSnapshot);
        const best = bestMap?.[`${sourceName}::${metric.metricKey}`];
        lines.push(`  - ${metric.label}: ${metric.value}${changeText}`);
        if (best) {
            lines.push(`    🏆 Melhor da semana: ${formatPrice(best.value)}`);
        }
    }

    return lines.length > 1 ? lines : [];
}

function buildSnapshotText(sourcePayloads, state, changes, previousSnapshot = null) {
    let resolvedState = state;
    let resolvedChanges = changes;
    let resolvedPayloads = sourcePayloads;

    if (arguments.length === 2 && sourcePayloads && typeof sourcePayloads === "object" && !Array.isArray(sourcePayloads) && !sourcePayloads.capturedAt && !sourcePayloads.sources) {
        resolvedState = sourcePayloads;
        resolvedChanges = state;
        resolvedPayloads = null;
    } else if (arguments.length === 2 && sourcePayloads && sourcePayloads.lastSnapshot) {
        resolvedState = sourcePayloads;
        resolvedChanges = state;
        resolvedPayloads = null;
    }

    const lines = ["☕ *RELATÓRIO DO MONITOR DO CAFÉ*", ""];
    const sources = Object.entries(resolvedPayloads || {}).filter(([, value]) => value);
    const historicalSources = resolvedState?.lastSnapshot?.sources
        ? Object.entries(resolvedState.lastSnapshot.sources).filter(([, value]) => value)
        : [];
    const renderSources = sources.length > 0 ? sources : historicalSources;

    if (renderSources.length === 0) {
        lines.push("❌ Não foi possível obter cotações neste momento.");
        return lines.join("\n");
    }

    lines.push("📌 Fontes verificadas:");
    for (const [sourceName, payload] of renderSources) {
        const label = sourceName === "Coocafe" ? "Coocafé" : sourceName;
        const updated = payload?.atualizadoEm || payload?.data || "sem data";
        lines.push(`• ${label}: ${updated}`);
    }

    lines.push("");
    lines.push("📊 Preços atuais:");

    const currentSnapshot = Object.keys(resolvedPayloads || {}).length > 0
        ? buildSnapshot(resolvedPayloads)
        : resolvedState?.lastSnapshot;
    const bestMap = getWeeklyBestMap(resolvedState, currentSnapshot);

    for (const [sourceName, payload] of renderSources) {
        const reportLines = buildPayloadReportLines(sourceName, payload, resolvedState, bestMap, previousSnapshot);
        if (reportLines.length) {
            lines.push(...reportLines);
        }
    }

    if (resolvedChanges && resolvedChanges.length > 0) {
        lines.push("");
        lines.push("📈 Variações detectadas:");
        resolvedChanges.slice(0, 6).forEach(change => {
            const direction = change.delta > 0 ? "subiu" : change.delta < 0 ? "caiu" : "manteve-se";
            const deltaAbs = Math.abs(change.delta || 0);
            const deltaText = `${direction} ${formatPrice(deltaAbs)}`;
            const percentText = formatPercent(change.percent);
            lines.push(`• ${change.source} · ${change.metric}: ${formatPrice(change.previousValue)} → ${formatPrice(change.currentValue)} (${deltaText} | ${percentText})`);
        });
    }

    if (resolvedState?.weeklyStats?.highestRise || resolvedState?.weeklyStats?.highestFall) {
        lines.push("");
        lines.push("📅 Semana:");
        if (resolvedState.weeklyStats.highestRise) {
            lines.push(`• Maior alta: ${resolvedState.weeklyStats.highestRise.source} · ${resolvedState.weeklyStats.highestRise.metric} (${formatPrice(resolvedState.weeklyStats.highestRise.delta)}).`);
        }
        if (resolvedState.weeklyStats.highestFall) {
            lines.push(`• Maior baixa: ${resolvedState.weeklyStats.highestFall.source} · ${resolvedState.weeklyStats.highestFall.metric} (${formatPrice(resolvedState.weeklyStats.highestFall.delta)}).`);
        }
    }

    return lines.join("\n");
}

async function runCafeMonitor(options = {}) {
    const config = options.config || loadMonitorConfig(options.target);
    const sources = options.sources || config.sources || ["Minasul", "Coocafe", "CCCMG"];
    const payloads = await collectCurrentPayloads(sources);
    const { state, previousSnapshot, changes } = updateMonitorState(payloads);

    const targetSources = pickSourceList(sources).map(s => s.toLowerCase());
    const relevantChanges = (changes || []).filter(c =>
        targetSources.includes("all") || targetSources.includes(String(c.source || "").toLowerCase())
    );

    const shouldSend = options.send !== false && options.target && (
        !options.onlyIfChanged || relevantChanges.length > 0
    );

    const text = buildSnapshotText(payloads, state, relevantChanges.length > 0 ? relevantChanges : changes, previousSnapshot);

    if (shouldSend) {
        const adapter = options.adapter || (global.platformRegistry && global.platformRegistry[options.target.platform]);
        if (adapter && options.target.platform && options.target.chatId) {
            await adapter.sendText(options.target.chatId, options.target.threadId || null, text);
        }
    }

    return {
        text,
        state,
        changes,
        relevantChanges,
        snapshot: state.lastSnapshot,
        payloads,
        sent: Boolean(shouldSend)
    };
}

module.exports = {
    createEmptyState,
    createDefaultConfig,
    loadMonitorConfig,
    saveMonitorConfig,
    loadMonitorState,
    saveMonitorState,
    updateMonitorState,
    buildMonitorText: buildSnapshotText,
    normalizePrice,
    formatPrice,
    buildSnapshot,
    compareSnapshots,
    buildWeeklyStats,
    collectCurrentPayloads,
    runCafeMonitor,
    pickSourceList,
    normalizeSourceName,
    syncMonitorSchedules,
    startMonitorLoop,
    getSourceUpdateTime,
    findPreviousSnapshotForSource,
    getMetricLabel,
    getMetricChangeText,
    getWeeklyBestMap,
    buildPayloadReportLines,
    slugify
};
