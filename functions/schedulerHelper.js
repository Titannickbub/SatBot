/**
 * schedulerHelper.js
 * Motor de agendamentos do bot.
 *
 * Fluxo:
 *  startScheduler() → setInterval(30s) → tick()
 *    → para cada schedule enabled/não-done com nextFireAt <= now:
 *       → dispara mensagem na plataforma
 *       → recalcula nextFireAt
 *       → se repeat.mode === "once" → done = true
 *    → salva JSON
 */

const fs   = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const SCHEDULES_PATH = path.join(__dirname, "..", "settings", "schedules.json");
const TICK_INTERVAL  = 30_000; // 30 segundos

// ─────────────────────────────────────────────────────────────
// I/O
// ─────────────────────────────────────────────────────────────

function loadSchedules() {
    if (!fs.existsSync(SCHEDULES_PATH)) {
        fs.writeFileSync(SCHEDULES_PATH, JSON.stringify({ schedules: [] }, null, 2), "utf8");
    }
    try {
        const raw = fs.readFileSync(SCHEDULES_PATH, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.schedules) ? parsed.schedules : [];
    } catch {
        return [];
    }
}

function saveSchedules(list) {
    fs.writeFileSync(
        SCHEDULES_PATH,
        JSON.stringify({ schedules: list }, null, 2),
        "utf8"
    );
}

// ─────────────────────────────────────────────────────────────
// Cálculo de próximo disparo
// ─────────────────────────────────────────────────────────────

/**
 * Calcula o próximo timestamp de disparo para um schedule.
 * @param {object} schedule
 * @param {number} [now=Date.now()]
 * @returns {number|null}
 */
function calcNextFire(schedule, now = Date.now()) {
    const { trigger, repeat } = schedule;

    if (!trigger) return null;

    // ── Intervalo ──────────────────────────────────────────────
    if (trigger.type === "interval") {
        const ms = trigger.intervalMs;
        if (!ms || ms <= 0) return null;
        const base = schedule.state?.lastFiredAt || now;
        // Se nunca disparou, agenda para daqui a intervalMs
        return base + ms;
    }

    // ── Horário fixo ───────────────────────────────────────────
    if (trigger.type === "fixed") {
        const times = Array.isArray(trigger.times) && trigger.times.length
            ? trigger.times
            : ["00:00"];

        // Converte cada HH:MM em timestamp absoluto (hoje ou amanhã)
        const candidates = [];
        const localNow = new Date(now);

        for (const hhmm of times) {
            const [hh, mm] = hhmm.split(":").map(Number);
            const candidate = new Date(localNow);
            candidate.setHours(hh, mm, 0, 0);
            let ts = candidate.getTime();
            // Se já passou hoje, move para amanhã
            if (ts <= now) ts += 86_400_000;
            candidates.push(ts);
        }

        // Aplica restrição de repeat
        if (repeat.mode === "weekly" && Array.isArray(repeat.days) && repeat.days.length) {
            // Filtra apenas timestamps cujo dia da semana está na lista
            const allowed = new Set(repeat.days.map(Number));
            let best = null;
            // Procura até 7 dias à frente
            for (let offset = 0; offset <= 7; offset++) {
                for (const ts of candidates) {
                    const d = new Date(ts + offset * 86_400_000);
                    if (allowed.has(d.getDay())) {
                        const candidate = ts + offset * 86_400_000;
                        if (candidate > now && (best === null || candidate < best)) {
                            best = candidate;
                        }
                    }
                }
            }
            return best;
        }

        if (repeat.mode === "monthly" && repeat.monthDay) {
            const targetDay = Number(repeat.monthDay);
            const sorted = [...candidates].sort((a, b) => a - b);
            for (const ts of sorted) {
                const d = new Date(ts);
                if (d.getDate() === targetDay && ts > now) return ts;
            }
            // Nenhum hoje — acha próximo mês
            const ref = new Date(now);
            let year = ref.getFullYear();
            let month = ref.getMonth();
            // Tenta o mês atual primeiro
            let candidate = new Date(year, month, targetDay);
            for (const [hh, mm] of times.map(t => t.split(":").map(Number))) {
                candidate = new Date(year, month, targetDay, hh, mm, 0, 0);
                if (candidate.getTime() > now) return candidate.getTime();
            }
            // Mês seguinte
            month += 1;
            if (month > 11) { month = 0; year += 1; }
            const [hh, mm] = times[0].split(":").map(Number);
            return new Date(year, month, targetDay, hh, mm, 0, 0).getTime();
        }

        // daily / once → próximo horário que ainda não passou
        return Math.min(...candidates);
    }

    return null;
}

// ─────────────────────────────────────────────────────────────
// Disparo
// ─────────────────────────────────────────────────────────────

async function fireSchedule(schedule) {
    const { platform, chatId, threadId, message: msg } = schedule;

    if (schedule.meta?.kind === "cafe-monitor") {
        try {
            const cafeMonitor = require("./cafeMonitor");
            const config = cafeMonitor.loadMonitorConfig({
                platform,
                chatId,
                threadId: threadId || null
            });
            await cafeMonitor.runCafeMonitor({
                config,
                sources: schedule.meta?.sources || config.sources,
                send: true,
                target: {
                    platform,
                    chatId,
                    threadId: threadId || null
                },
                adapter: global.platformRegistry?.[platform]
            });
            return;
        } catch (error) {
            console.error("❌[SCHEDULER] Erro ao disparar monitor do café:", error.message || error);
            return;
        }
    }

    if (schedule.meta?.kind === "weather-monitor") {
        try {
            const weatherMonitor = require("./weatherMonitor");
            const config = weatherMonitor.loadMonitorConfig({
                platform,
                chatId,
                threadId: threadId || null
            });
            await weatherMonitor.runWeatherReport({
                config,
                send: true,
                target: {
                    platform,
                    chatId,
                    threadId: threadId || null
                },
                adapter: global.platformRegistry?.[platform]
            });
            return;
        } catch (error) {
            console.error("❌[SCHEDULER] Erro ao disparar monitor do clima:", error.message || error);
            return;
        }
    }

    if (!msg || !msg.text) return;

    // Busca a plataforma no registry global
    const registry = global.platformRegistry || {};
    const adapter  = registry[platform];

    if (!adapter) {
        console.warn(`⏰[SCHEDULER] Plataforma não encontrada: ${platform}`);
        return;
    }

    try {
        if (msg.mode === "media" && msg.media?.url) {
            const url  = msg.media.url;
            const type = msg.media.type || "photo";
            const caption = msg.text || "";

            if (type === "video") {
                await adapter.sendVideo(chatId, threadId || null, url, caption);
            } else if (type === "audio") {
                await adapter.sendAudio(chatId, threadId || null, url, caption);
            } else {
                await adapter.sendImg(chatId, threadId || null, url, caption);
            }
        } else {
            await adapter.sendText(chatId, threadId || null, msg.text);
        }

        console.log(`⏰[SCHEDULER] Agendamento disparado: "${schedule.name}" (${schedule.id})`);
    } catch (err) {
        console.error(`❌[SCHEDULER] Erro ao disparar agendamento "${schedule.name}":`, err.message || err);
    }
}

// ─────────────────────────────────────────────────────────────
// Tick principal
// ─────────────────────────────────────────────────────────────

async function tick() {
    const now       = Date.now();
    const schedules = loadSchedules();
    let changed     = false;

    for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        if (schedule.state?.done) continue;

        const nextFire = schedule.state?.nextFireAt;

        // Inicializa nextFireAt se ainda não calculado
        if (!nextFire) {
            schedule.state = schedule.state || {};
            schedule.state.nextFireAt = calcNextFire(schedule, now);
            changed = true;
            continue;
        }

        if (nextFire <= now) {
            // Dispara
            await fireSchedule(schedule);

            // Atualiza state
            schedule.state.lastFiredAt = now;
            schedule.state.firedCount  = (schedule.state.firedCount || 0) + 1;
            changed = true;

            if (schedule.repeat?.mode === "once") {
                schedule.state.done       = true;
                schedule.state.nextFireAt = null;
            } else {
                schedule.state.nextFireAt = calcNextFire(schedule, now);
            }
        }
    }

    if (changed) {
        saveSchedules(schedules);
    }
}

// ─────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Cria um novo agendamento com valores padrão.
 * @param {object} data - { name, chatId, threadId, platform, chatName }
 * @returns {object} Agendamento criado
 */
function addSchedule(data) {
    const schedules = loadSchedules();

    const schedule = {
        id:       randomUUID().slice(0, 8),
        name:     data.name     || "Novo Agendamento",
        chatId:   data.chatId,
        threadId: data.threadId || null,
        platform: data.platform,
        chatName: data.chatName || null,
        enabled:  false,

        trigger: {
            type:       "interval",
            intervalMs: 3_600_000,  // 1h padrão
            times:      []
        },

        repeat: {
            mode:     "daily",
            days:     [],
            monthDay: null
        },

        message: {
            text:  "",
            mode:  "text",
            media: null
        },

        state: {
            lastFiredAt: null,
            nextFireAt:  null,
            firedCount:  0,
            done:        false
        }
    };

    schedules.push(schedule);
    saveSchedules(schedules);
    return schedule;
}

/**
 * Aplica um patch (campos parciais) a um agendamento existente.
 * Recalcula nextFireAt automaticamente.
 * @param {string} id
 * @param {object} patch - objeto com os campos a atualizar (suporta deep merge em trigger/repeat/message/state)
 * @returns {object|null}
 */
function editSchedule(id, patch) {
    const schedules = loadSchedules();
    const idx = schedules.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const target = schedules[idx];

    // Deep merge apenas em subobjects conhecidos
    for (const [key, val] of Object.entries(patch)) {
        if (
            val !== null &&
            typeof val === "object" &&
            !Array.isArray(val) &&
            typeof target[key] === "object" &&
            target[key] !== null
        ) {
            target[key] = { ...target[key], ...val };
        } else {
            target[key] = val;
        }
    }

    // Recalcula próximo disparo, resetando done se necessário
    if (target.state.done) {
        target.state.done = false;
    }
    target.state.nextFireAt = calcNextFire(target, Date.now());

    schedules[idx] = target;
    saveSchedules(schedules);
    return target;
}

/**
 * Remove um agendamento pelo ID.
 * @param {string} id
 * @returns {boolean}
 */
function removeSchedule(id) {
    const schedules = loadSchedules();
    const filtered  = schedules.filter(s => s.id !== id);
    if (filtered.length === schedules.length) return false;
    saveSchedules(filtered);
    return true;
}

/**
 * Lista agendamentos de um chat/plataforma específico.
 * @param {string} chatId
 * @param {string} platform
 * @returns {object[]}
 */
function listSchedules(chatId, platform) {
    return loadSchedules().filter(
        s => s.chatId === chatId && s.platform === platform
    );
}

/**
 * Busca um agendamento por ID.
 * @param {string} id
 * @returns {object|null}
 */
function getSchedule(id) {
    return loadSchedules().find(s => s.id === id) || null;
}

// ─────────────────────────────────────────────────────────────
// Parsing utilitário
// ─────────────────────────────────────────────────────────────

/**
 * Converte string de intervalo humana para ms.
 * Aceita: "30m", "1h", "2h30m", "90m", "1d"
 * @param {string} str
 * @returns {number|null}
 */
function parseIntervalToMs(str) {
    if (!str) return null;
    const s = str.toLowerCase().trim();
    let ms = 0;
    const dayMatch  = s.match(/(\d+)\s*d/);
    const hourMatch = s.match(/(\d+)\s*h/);
    const minMatch  = s.match(/(\d+)\s*m(?!s)/);
    const secMatch  = s.match(/(\d+)\s*s/);

    if (dayMatch)  ms += Number(dayMatch[1])  * 86_400_000;
    if (hourMatch) ms += Number(hourMatch[1]) * 3_600_000;
    if (minMatch)  ms += Number(minMatch[1])  * 60_000;
    if (secMatch)  ms += Number(secMatch[1])  * 1_000;

    return ms > 0 ? ms : null;
}

/**
 * Converte número/nome de dia da semana para índice 0-6.
 * Aceita: "0"-"6", "seg","ter","qua","qui","sex","sab","dom"
 * @param {string|number} val
 * @returns {number|null}
 */
function parseDayOfWeek(val) {
    const map = {
        dom: 0, sun: 0, "0": 0,
        seg: 1, mon: 1, "1": 1,
        ter: 2, tue: 2, "2": 2,
        qua: 3, wed: 3, "3": 3,
        qui: 4, thu: 4, "4": 4,
        sex: 5, fri: 5, "5": 5,
        sab: 6, sat: 6, "6": 6
    };
    return map[String(val).toLowerCase()] ?? null;
}

/**
 * Formata ms de intervalo em string legível.
 */
function formatMs(ms) {
    if (!ms) return "—";
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000)  / 60_000);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.join("") || "< 1m";
}

/**
 * Formata timestamp em string legível pt-BR.
 */
function formatTs(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("pt-BR");
}

// ─────────────────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────────────────

let _tickerRef = null;

function startScheduler() {
    if (_tickerRef) return; // já iniciado
    console.log("⏰[SCHEDULER] Motor de agendamentos iniciado (tick a cada 30s).");
    tick().catch(console.error);
    _tickerRef = setInterval(() => tick().catch(console.error), TICK_INTERVAL);
}

// ─────────────────────────────────────────────────────────────
// storeMedia — reutiliza o padrão de welcomeHelper
// ─────────────────────────────────────────────────────────────

async function storeMedia(platform, message, buffer, fileName = "schedule_media", mimeType = "image/png") {
    const { storeMedia: wmStore } = require("./welcomeHelper");
    return wmStore(platform, message, buffer, fileName, mimeType);
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
    startScheduler,
    loadSchedules,
    saveSchedules,
    calcNextFire,
    addSchedule,
    editSchedule,
    removeSchedule,
    listSchedules,
    getSchedule,
    parseIntervalToMs,
    parseDayOfWeek,
    formatMs,
    formatTs,
    storeMedia,
    fireSchedule
};
