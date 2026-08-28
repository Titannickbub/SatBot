const fs = require("fs");
const path = require("path");
const axios = require("axios");

const STATE_PATH = process.env.WEATHER_MONITOR_PATH
    ? path.resolve(process.env.WEATHER_MONITOR_PATH)
    : path.join(__dirname, "..", "settings", "weather-monitor.json");

function createDefaultConfig() {
    return {
        enabled: false,
        platform: null,
        chatId: null,
        threadId: null,
        city: null,
        times: ["08:00"],
        scheduleIds: []
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
    if (!fs.existsSync(STATE_PATH)) fs.writeFileSync(STATE_PATH, JSON.stringify(createStore(), null, 2), "utf8");
}

function readStore() {
    ensureStateFile();
    try {
        const raw = fs.readFileSync(STATE_PATH, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return createStore();
        const config = parsed.config && typeof parsed.config === "object"
            ? { ...createDefaultConfig(), ...parsed.config }
            : createDefaultConfig();
        const configs = parsed.configs && typeof parsed.configs === "object" ? parsed.configs : {};
        return { config, configs };
    } catch (err) {
        return createStore();
    }
}

function writeStore(store) {
    ensureStateFile();
    fs.writeFileSync(STATE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function getConfigKey(target = {}) {
    const platform = target.platform || "";
    const chatId = target.chatId || "";
    const threadId = target.threadId || "";
    return [platform, chatId, threadId].filter(Boolean).join(":") || "default";
}

function loadMonitorConfig(target = null) {
    const store = readStore();
    if (!target || (!target.platform && !target.chatId)) return store.config;
    const key = getConfigKey(target);
    const scoped = store.configs?.[key];
    if (scoped && typeof scoped === "object") {
        return { ...createDefaultConfig(), ...scoped, platform: target.platform || scoped.platform || null, chatId: target.chatId || scoped.chatId || null, threadId: target.threadId || scoped.threadId || null };
    }
    return { ...createDefaultConfig(), ...store.config, platform: target.platform || store.config.platform || null, chatId: target.chatId || store.config.chatId || null, threadId: target.threadId || store.config.threadId || null };
}

function saveMonitorConfig(config, target = null) {
    const store = readStore();

    if (target && (target.platform || target.chatId)) {
        const key = getConfigKey(target);
        const existing = store.configs?.[key] && typeof store.configs[key] === 'object' ? store.configs[key] : {};
        const merged = { ...createDefaultConfig(), ...existing, ...config };
        store.configs = store.configs || {};
        store.configs[key] = { ...merged, platform: target.platform || merged.platform || null, chatId: target.chatId || merged.chatId || null, threadId: target.threadId || merged.threadId || null };
        writeStore(store);
        return store.configs[key];
    }

    const normalized = { ...createDefaultConfig(), ...store.config, ...config };
    store.config = normalized;
    writeStore(store);
    return store.config;
}

async function fetchWeatherForCity(city) {
    if (!city) throw new Error("Cidade inválida");
    const encoded = encodeURIComponent(city.trim());
    const url = `https://wttr.in/${encoded}?format=j1&lang=pt`;
    const res = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return res.data;
}

function buildTextFromData(data, cityNameOverride = null) {
    if (!data || !data.current_condition) return "❌ Não foi possível obter a previsão no momento.";
    const current = data.current_condition[0] || {};
    const nearest = data.nearest_area && data.nearest_area[0] ? data.nearest_area[0] : null;

    // Nome completo da cidade conforme retornado pela API
    let location = "Local";
    if (nearest) {
        const area = nearest.areaName?.[0]?.value || "";
        const region = nearest.region?.[0]?.value || "";
        const country = nearest.country?.[0]?.value || "";
        const parts = [area, region, country].filter(Boolean);
        location = parts.join(" - ");
    }
    // use API name when available; fall back to provided city query
    if (!nearest && cityNameOverride) location = cityNameOverride;

    // Mapa simples de traduções (comuns)
    const condicaoMap = {
        'Clear': 'Céu limpo',
        'Sunny': 'Ensolarado',
        'Partly cloudy': 'Parcialmente nublado',
        'Cloudy': 'Nublado',
        'Overcast': 'Encoberto',
        'Mist': 'Névoa',
        'Patchy rain possible': 'Possibilidade de chuva',
        'Patchy rain nearby': 'Possibilidade de chuva nas proximidades',
        'Patchy light rain': 'Chuva fraca localizada',
        'Light rain': 'Chuva leve',
        'Moderate rain': 'Chuva moderada',
        'Heavy rain': 'Chuva forte',
        'Thundery outbreak': 'Trovoadas',
        'Fog': 'Névoa',
        'Freezing fog': 'Nevoeiro congelante'
    };
    const condicaoMapLower = Object.fromEntries(Object.entries(condicaoMap).map(([k, v]) => [k.toLowerCase(), v]));

    const rawDesc = current.weatherDesc?.[0]?.value || current.lang_pt?.[0]?.value || "-";
    const desc = condicaoMap[rawDesc] || condicaoMapLower[rawDesc?.toLowerCase?.()?.trim?.() ?? ""] || rawDesc;
    const tempC = current.temp_C || "-";
    const feelsLikeC = current.FeelsLikeC || "-";
    const humidity = current.humidity || "-";
    const wind = current.windspeedKmph || "-";
    const precip = current.precipMM || "-";

    const lines = [];
    lines.push(`☁️ *PREVISÃO DO TEMPO — ${location}*`);
    lines.push("");
    lines.push(`• Condição: ${desc}`);
    lines.push(`• Temperatura: ${tempC}°C (sensação térmica: ${feelsLikeC}°C)`);
    lines.push(`• Umidade: ${humidity}%`);
    lines.push(`• Vento: ${wind} km/h`);
    lines.push(`• Precipitação (últ. hora): ${precip} mm`);

    if (Array.isArray(data.weather) && data.weather.length) {
        lines.push("");
        lines.push(`📅 Previsão:`);
        for (let i = 0; i < Math.min(3, data.weather.length); i++) {
            const day = data.weather[i];
            const rawDate = day.date || ""; // formato yyyy-mm-dd
            let formattedDate = rawDate;
            try {
                const d = new Date(rawDate + 'T00:00:00');
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                formattedDate = `${dd}/${mm}/${yyyy}`;
            } catch (e) {
                // fallback: usar rawDate
            }

            const maxtemp = day.maxtempC || "-";
            const mintemp = day.mintempC || "-";
            const hour = (day.hourly && day.hourly[0]) || {};
            const rawDayDesc = hour.weatherDesc?.[0]?.value || day.hourly?.[0]?.lang_pt?.[0]?.value || "-";
            const descDay = condicaoMap[rawDayDesc] || condicaoMapLower[rawDayDesc?.toLowerCase?.()?.trim?.() ?? ""] || rawDayDesc;
            lines.push(`• ${formattedDate} — ${descDay} · ${mintemp}°C — ${maxtemp}°C`);
        }
    }

    return lines.join("\n");
}

async function runWeatherReport(options = {}) {
    const config = options.config || loadMonitorConfig(options.target);
    const send = options.send !== false;
    const target = options.target || null;
    const city = (options.city || config.city || null);
    const isRetry = Boolean(options.isRetry);

    if (!city) {
        const text = "❌ Nenhuma cidade definida para o monitor de clima.";
        if (send && target && target.platform && target.chatId) {
            const adapter = options.adapter || (global.platformRegistry && global.platformRegistry[target.platform]);
            if (adapter) await adapter.sendText(target.chatId, target.threadId || null, text);
        }
        return { text };
    }

    try {
        const data = await fetchWeatherForCity(city);
        const text = buildTextFromData(data, city);
        if (send && target && target.platform && target.chatId) {
            const adapter = options.adapter || (global.platformRegistry && global.platformRegistry[target.platform]);
            if (adapter) await adapter.sendText(target.chatId, target.threadId || null, text);
        }
        return { text, data };
    } catch (err) {
        console.warn(`[WEATHER MONITOR] Erro ao consultar clima para ${city}:`, err.message || err);

        if (send && target && target.platform && target.chatId) {
            const adapter = options.adapter || (global.platformRegistry && global.platformRegistry[target.platform]);
            if (adapter) {
                if (!isRetry) {
                    const retryMsg = "⚠️ Não foi possível consultar o clima atual por instabilidade do provedor. Tentaremos novamente em 5 minutos...";
                    await adapter.sendText(target.chatId, target.threadId || null, retryMsg).catch(() => {});

                    setTimeout(() => {
                        runWeatherReport({
                            ...options,
                            isRetry: true
                        }).catch(() => {});
                    }, 5 * 60 * 1000);
                } else {
                    const failMsg = "❌ Não foi possível consultar o clima atual após nova tentativa devido a instabilidades no provedor.";
                    await adapter.sendText(target.chatId, target.threadId || null, failMsg).catch(() => {});
                }
            }
        }

        const friendlyMsg = "⚠️ O serviço de previsão do tempo está indisponível ou instável no momento. Tente novamente em alguns minutos.";
        return { text: friendlyMsg, error: err };
    }
}

async function syncMonitorSchedules(config, target = null) {
    try {
        const schedulerHelper = require("./schedulerHelper");
        const platform = target?.platform || config.platform || null;
        const chatId = target?.chatId || config.chatId || null;

        if (!platform || !chatId) return [];

        const existing = schedulerHelper.listSchedules(chatId, platform)
            .filter(schedule => schedule.meta?.kind === "weather-monitor");

        const times = Array.isArray(config.times) && config.times.length ? config.times : ["08:00"];

        const patch = {
            name: "Previsão do tempo",
            enabled: Boolean(config.enabled && times.length),
            platform,
            chatId,
            threadId: target?.threadId || config.threadId || null,
            chatName: target?.chatName || null,
            trigger: { type: "fixed", times, intervalMs: null },
            repeat: { mode: "daily", days: [], monthDay: null },
            message: { text: "", mode: "text", media: null },
            meta: { kind: "weather-monitor", city: config.city || null, config: { ...config } },
            state: { lastFiredAt: null, nextFireAt: null, firedCount: 0, done: false }
        };

        if (existing.length) {
            const base = existing[0];
            const updated = schedulerHelper.editSchedule(base.id, patch);
            return [updated];
        }

        const created = schedulerHelper.addSchedule({ name: patch.name, chatId, threadId: patch.threadId, platform, chatName: patch.chatName });
        const updated = schedulerHelper.editSchedule(created.id, patch);
        return [updated];
    } catch (error) {
        console.error("❌[WEATHER MONITOR] Falha ao sincronizar agendamentos:", error.message || error);
        return [];
    }
}

module.exports = {
    createDefaultConfig,
    loadMonitorConfig,
    saveMonitorConfig,
    runWeatherReport,
    syncMonitorSchedules
};
