const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "settings", "chat-control.json");
const DAY_MINUTES = 7 * 24 * 60;
const MIN_PROGRAMMED_TRANSITION_MINUTES = 2 * 60;
const MIN_TEMPORARY_TRANSITION_MINUTES = 1;
const DAY_NAMES = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function ensureConfigFile() {
    const directory = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ chats: {} }, null, 2), "utf8");
    }
}

function readStore() {
    ensureConfigFile();
    try {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        return data && typeof data.chats === "object" && !Array.isArray(data.chats)
            ? data
            : { chats: {} };
    } catch (error) {
        console.error("[CHAT CONTROL] Falha ao ler as configurações:", error);
        throw error;
    }
}

function writeStore(store) {
    ensureConfigFile();
    const temporaryPath = `${CONFIG_PATH}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(temporaryPath, CONFIG_PATH);
}

function getTarget(messageOrTarget) {
    const target = {
        platform: messageOrTarget?.platform,
        chatId: String(messageOrTarget?.chatId || messageOrTarget?.groupId || ""),
        threadId: null
    };
    if (!["whatsapp", "telegram", "discord"].includes(target.platform) || !target.chatId) {
        throw new Error("Não foi possível identificar o chat atual.");
    }
    if (messageOrTarget?.isPrivate) {
        throw new Error("Este recurso não está disponível em conversas privadas.");
    }
    if (target.platform === "whatsapp" && messageOrTarget?.isCommunity) {
        throw new Error("O controle de abertura não está disponível em comunidades do WhatsApp.");
    }
    return target;
}

function getKey(target) {
    return `${target.platform}:${target.chatId}`;
}

function getConfig(target) {
    const normalizedTarget = getTarget(target);
    const store = readStore();
    return {
        enabled: false,
        profiles: [],
        scheduleIds: [],
        pendingScheduleIds: [],
        ...store.chats[getKey(normalizedTarget)]
    };
}

function saveConfig(target, config) {
    const normalizedTarget = getTarget(target);
    const store = readStore();
    store.chats[getKey(normalizedTarget)] = {
        enabled: false,
        profiles: [],
        scheduleIds: [],
        pendingScheduleIds: [],
        ...(store.chats[getKey(normalizedTarget)] || {}),
        ...config,
        platform: normalizedTarget.platform,
        chatId: normalizedTarget.chatId
    };
    writeStore(store);
    return store.chats[getKey(normalizedTarget)];
}

function parseTime(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function parseDay(value) {
    const normalized = String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .slice(0, 3);
    return DAY_NAMES.indexOf(normalized);
}

function parseIntervals(value) {
    const intervals = String(value || "").split(",").map((item) => {
        const [startText, endText, extra] = item.trim().split("-");
        const start = parseTime(startText);
        const end = parseTime(endText);
        if (start === null || end === null || extra !== undefined || start === end) {
            throw new Error(`Horário inválido: "${item}". Use, por exemplo, 12:00-18:00.`);
        }
        const endOffset = end <= start ? end + 1440 : end;
        const duration = endOffset - start;
        if (duration < MIN_PROGRAMMED_TRANSITION_MINUTES) {
            throw new Error("Cada período aberto ou fechado deve durar pelo menos 2 horas.");
        }
        return { start, end: endOffset, startText: formatTime(start), endText: formatTime(end) };
    });

    if (!intervals.length) throw new Error("Informe pelo menos um horário.");
    return intervals;
}

function validateProfiles(profiles) {
    const intervals = [];
    for (const profile of profiles) {
        for (const day of profile.days) {
            for (const interval of profile.intervals) {
                const start = day * 1440 + interval.start;
                intervals.push({ start, end: start + (interval.end - interval.start) });
            }
        }
    }

    if (!intervals.length) throw new Error("A programação não contém dias e horários válidos.");

    for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
            for (const shift of [-DAY_MINUTES, 0, DAY_MINUTES]) {
                const shiftedStart = intervals[j].start + shift;
                const shiftedEnd = intervals[j].end + shift;
                if (intervals[i].start < shiftedEnd && shiftedStart < intervals[i].end) {
                    throw new Error("Existem períodos abertos sobrepostos. Divida os horários em sequência.");
                }
            }
        }
    }

    const transitions = [];
    for (const interval of intervals) {
        transitions.push({ time: interval.start % DAY_MINUTES, open: true });
        transitions.push({ time: interval.end % DAY_MINUTES, open: false });
    }
    transitions.sort((a, b) => a.time - b.time);

    for (let i = 0; i < transitions.length; i++) {
        const current = transitions[i];
        const next = transitions[(i + 1) % transitions.length];
        const gap = (next.time - current.time + DAY_MINUTES) % DAY_MINUTES;
        if (gap < MIN_PROGRAMMED_TRANSITION_MINUTES) {
            throw new Error("Deve haver pelo menos 2 horas entre cada abertura e fechamento.");
        }
        if (current.open === next.open) {
            throw new Error("Os horários se sobrepõem ou não alternam corretamente entre abrir e fechar.");
        }
    }
}

function parseDuration(value) {
    const match = String(value || "").trim().toLowerCase().match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/);
    if (!match || !match.slice(1).some(Boolean)) return null;
    const milliseconds =
        Number(match[1] || 0) * 86_400_000 +
        Number(match[2] || 0) * 3_600_000 +
        Number(match[3] || 0) * 60_000;
    return milliseconds > 0 ? milliseconds : null;
}

function getAdapter(platform) {
    const adapter = global.platformRegistry?.[platform];
    if (!adapter) throw new Error(`A plataforma ${platform} não está disponível.`);
    if (typeof adapter.setChatOpen !== "function") {
        throw new Error(`O controle de abertura ainda não está disponível no adaptador ${platform}.`);
    }
    return adapter;
}

async function assertSupported(target) {
    const normalizedTarget = getTarget(target);
    const adapter = getAdapter(normalizedTarget.platform);
    if (typeof adapter.checkChatControlSupport !== "function") {
        throw new Error(`O controle de abertura não está disponível no adaptador ${normalizedTarget.platform}.`);
    }
    const supported = await adapter.checkChatControlSupport(normalizedTarget.chatId);
    if (!supported) {
        throw new Error("Este tipo de chat não aceita abertura ou fechamento pelo bot.");
    }
}

async function applyChatState(target, isOpen) {
    const normalizedTarget = getTarget(target);
    const adapter = getAdapter(normalizedTarget.platform);
    await assertSupported(normalizedTarget);
    const changed = await adapter.setChatOpen(normalizedTarget.chatId, isOpen);
    return changed !== false;
}

function cancelSchedules(ids) {
    const scheduler = require("./schedulerHelper");
    for (const id of ids || []) scheduler.removeSchedule(id);
}

function createSchedule({ target, name, time, days, meta, once = false }) {
    const scheduler = require("./schedulerHelper");
    const schedule = scheduler.addSchedule({
        name,
        platform: target.platform,
        chatId: target.chatId,
        threadId: target.threadId || null,
        chatName: target.chatName || null
    });
    const updated = scheduler.editSchedule(schedule.id, {
        enabled: true,
        trigger: { type: "fixed", times: [time], intervalMs: null },
        repeat: { mode: once ? "once" : "weekly", days: once ? [] : days },
        message: { text: "", mode: "text", media: null },
        meta: { ...meta },
        state: { lastFiredAt: null, nextFireAt: null, firedCount: 0, done: false }
    });
    if (!updated) {
        scheduler.removeSchedule(schedule.id);
        throw new Error("Não foi possível ativar o agendamento de controle do chat.");
    }
    return updated.id;
}

async function setChatState(message, isOpen, durationOrTime = null) {
    const target = getTarget(message);
    await assertSupported(message);
    const config = getConfig(target);

    let restoreAt = null;
    if (durationOrTime) {
        const nowMs = Date.now();
        const duration = parseDuration(durationOrTime);
        if (duration) {
            restoreAt = nowMs + duration;
        } else {
            const minutes = parseTime(durationOrTime);
            if (minutes === null) throw new Error("Informe uma duração como 2h ou um horário no formato HH:MM.");
            const now = new Date(nowMs);
            restoreAt = new Date(now);
            restoreAt.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
            if (restoreAt.getTime() <= now.getTime()) restoreAt.setDate(restoreAt.getDate() + 1);
            restoreAt = restoreAt.getTime();
        }

        if (restoreAt - nowMs < MIN_TEMPORARY_TRANSITION_MINUTES * 60_000) {
            throw new Error("O intervalo temporário deve ter pelo menos 1 minuto.");
        }
        restoreAt = Math.ceil(restoreAt / 60_000) * 60_000;
    }

    cancelSchedules(config.pendingScheduleIds);

    let pendingScheduleIds = [];
    if (restoreAt) {
        const restoreDate = new Date(restoreAt);
        const restoreTime = `${String(restoreDate.getHours()).padStart(2, "0")}:${String(restoreDate.getMinutes()).padStart(2, "0")}`;
        pendingScheduleIds = [createSchedule({
            target,
            name: `Restaurar chat ${message.chatId}`,
            time: restoreTime,
            once: true,
            meta: { kind: "chat-control-temp", open: !isOpen, configKey: getKey(target) }
        })];
    }

    try {
        const changed = await applyChatState(target, isOpen);
        saveConfig(target, { ...config, pendingScheduleIds });
        return { changed, restoreAt };
    } catch (error) {
        cancelSchedules(pendingScheduleIds);
        throw error;
    }
}

function syncAutoSchedules(target, config) {
    cancelSchedules(config.scheduleIds);
    const scheduleIds = [];
    if (config.enabled) {
        for (const profile of config.profiles) {
            for (const day of profile.days) {
                for (const interval of profile.intervals) {
                    const openTime = interval.startText;
                    const closeTime = interval.endText;
                    const closeDay = (day + (interval.end >= 1440 ? 1 : 0)) % 7;
                    const profileId = profile.id;
                    scheduleIds.push(createSchedule({
                        target,
                        name: `Autoabrir ${profile.name} ${openTime}`,
                        time: openTime,
                        days: [day],
                        meta: { kind: "auto-chat-state", configKey: getKey(target), profileId, open: true }
                    }));
                    scheduleIds.push(createSchedule({
                        target,
                        name: `Auto fechar ${profile.name} ${closeTime}`,
                        time: closeTime,
                        days: [closeDay],
                        meta: { kind: "auto-chat-state", configKey: getKey(target), profileId, open: false }
                    }));
                }
            }
        }
    }
    return saveConfig(target, { ...config, scheduleIds });
}

async function fireSchedule(schedule) {
    const store = readStore();
    const config = store.chats[schedule.meta?.configKey];
    if (!config) return false;

    if (schedule.meta.kind === "auto-chat-state") {
        if (!config.enabled ||
            !(config.scheduleIds || []).includes(schedule.id) ||
            !(config.profiles || []).some(profile => profile.id === schedule.meta.profileId)) {
            return false;
        }
    } else if (schedule.meta.kind === "chat-control-temp") {
        if (!(config.pendingScheduleIds || []).includes(schedule.id)) return false;
    } else {
        return false;
    }

    let changed;
    try {
        changed = await applyChatState(
            { platform: schedule.platform, chatId: schedule.chatId },
            schedule.meta.open
        );
    } catch (error) {
        console.error(`[CHAT CONTROL] Falha ao aplicar ação agendada (${schedule.id}):`, error);
        if (schedule.meta.kind === "chat-control-temp") {
            config.pendingScheduleIds = config.pendingScheduleIds.filter(id => id !== schedule.id);
            store.chats[schedule.meta.configKey] = config;
            writeStore(store);
        }
        return false;
    }
    if (schedule.meta.kind === "chat-control-temp") {
        config.pendingScheduleIds = config.pendingScheduleIds.filter(id => id !== schedule.id);
        store.chats[schedule.meta.configKey] = config;
        writeStore(store);

        const adapter = global.platformRegistry?.[schedule.platform];
        if (typeof adapter?.sendText === "function") {
            const state = schedule.meta.open ? "reaberto" : "fechado";
            try {
                await adapter.sendText(
                    schedule.chatId,
                    schedule.threadId || null,
                    `⏰ O prazo temporário terminou. O chat foi ${state} automaticamente.`
                );
            } catch (error) {
                console.error(`[CHAT CONTROL] Falha ao avisar sobre a reversão temporária (${schedule.id}):`, error);
            }
        } else {
            console.error(`[CHAT CONTROL] Não foi possível avisar sobre a reversão temporária (${schedule.id}): adaptador sem suporte a envio de texto.`);
        }
    }
    return changed;
}

function addProfile(target, name, intervalText, dayValues) {
    const normalizedTarget = getTarget(target);
    const nameKey = String(name || "").toLowerCase();
    if (!["semana", "fds"].includes(nameKey)) {
        throw new Error("Use `semana` para dias úteis/programados ou `fds` para a programação de fim de semana.");
    }

    let days = dayValues.flatMap(value => String(value).split(",")).map(parseDay);
    if (!dayValues.length && nameKey === "fds") days = [0, 6];
    if (!days.length || days.some(day => day < 0) || new Set(days).size !== days.length) {
        throw new Error("Informe dias válidos e sem repetição: seg ter qua qui sex sab dom.");
    }
    if (nameKey === "semana" && days.some(day => day === 0 || day === 6)) {
        throw new Error("A programação `semana` aceita apenas de segunda a sexta.");
    }
    if (nameKey === "fds" && days.some(day => day !== 0 && day !== 6)) {
        throw new Error("A programação `fds` aceita apenas sábado e domingo.");
    }

    const config = getConfig(normalizedTarget);
    const profile = {
        id: nameKey,
        name: nameKey,
        days,
        intervals: parseIntervals(intervalText)
    };
    const profiles = [...config.profiles.filter(item => item.id !== nameKey), profile];
    validateProfiles(profiles);
    const updated = { ...config, profiles };
    return syncAutoSchedules(normalizedTarget, updated);
}

function removeProfile(target, name) {
    const normalizedTarget = getTarget(target);
    const config = getConfig(normalizedTarget);
    const profiles = config.profiles.filter(profile => profile.id !== String(name || "").toLowerCase());
    if (profiles.length === config.profiles.length) {
        throw new Error("Não encontrei uma programação com esse nome.");
    }
    return syncAutoSchedules(normalizedTarget, { ...config, profiles });
}

function setAutoEnabled(target, enabled) {
    const normalizedTarget = getTarget(target);
    const config = getConfig(normalizedTarget);
    return syncAutoSchedules(normalizedTarget, { ...config, enabled });
}

function cancelPending(target) {
    const normalizedTarget = getTarget(target);
    const config = getConfig(normalizedTarget);
    cancelSchedules(config.pendingScheduleIds);
    return saveConfig(normalizedTarget, { ...config, pendingScheduleIds: [] });
}

module.exports = {
    getConfig,
    assertSupported,
    setChatState,
    applyChatState,
    fireSchedule,
    addProfile,
    removeProfile,
    setAutoEnabled,
    cancelPending,
    parseIntervals,
    validateProfiles,
    parseDuration,
    formatTime
};
