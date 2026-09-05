const centralAccountsStore = require("./centralAccounts");

function getTitle(days) {
    if (days >= 30) return "⚡ Ascendido";
    if (days >= 21) return "👑 Rei do Setembro";
    if (days >= 14) return "🔥 Guerreiro";
    return "🌱 Iniciante";
}

function normalizeNofap(data) {
    const safe = data && typeof data === "object" ? data : {};
    return {
        startedAt: safe.startedAt || null,
        lastResetAt: safe.lastResetAt || null,
        totalResets: Number(safe.totalResets) || 0,
        recordDays: Number(safe.recordDays) || 0,
        currentDays: Number(safe.currentDays) || 0,
        title: safe.title || "🌱 Iniciante",
        lastUpdatedAt: safe.lastUpdatedAt || null
    };
}

function currentSequenceDays(startedAt) {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    if (Number.isNaN(start)) return 0;
    return Math.max(0, Math.floor((Date.now() - start) / 86400000));
}

function getNofapStatus(centralId) {
    const central = centralAccountsStore && typeof centralAccountsStore.getCentralById === "function"
        ? centralAccountsStore.getCentralById(centralId)
        : null;

    if (!central) {
        return {
            active: false,
            startedAt: null,
            currentDays: 0,
            recordDays: 0,
            totalResets: 0,
            lastResetAt: null,
            title: "🌱 Iniciante"
        };
    }

    const nofap = normalizeNofap(central.nofap);
    const currentDays = nofap.startedAt ? currentSequenceDays(nofap.startedAt) : 0;
    const nextRecord = Math.max(currentDays, Number(nofap.recordDays) || 0);
    const title = getTitle(nextRecord);

    const status = {
        active: !!nofap.startedAt,
        startedAt: nofap.startedAt,
        currentDays,
        recordDays: nextRecord,
        totalResets: Number(nofap.totalResets) || 0,
        lastResetAt: nofap.lastResetAt || null,
        title
    };

    central.nofap = {
        ...nofap,
        currentDays,
        recordDays: nextRecord,
        title,
        lastUpdatedAt: new Date().toISOString()
    };
    if (centralAccountsStore && typeof centralAccountsStore._markDirty === "function") {
        centralAccountsStore._markDirty();
    }

    return status;
}

function startNofap(centralId) {
    const central = centralAccountsStore && typeof centralAccountsStore.getCentralById === "function"
        ? centralAccountsStore.getCentralById(centralId)
        : null;
    if (!central) throw new Error("central not found");

    const nofap = normalizeNofap(central.nofap);
    if (!nofap.startedAt) {
        nofap.startedAt = new Date().toISOString();
        nofap.lastUpdatedAt = new Date().toISOString();
        central.nofap = nofap;
        if (centralAccountsStore && typeof centralAccountsStore._markDirty === "function") {
            centralAccountsStore._markDirty();
        }
    }

    return getNofapStatus(centralId);
}

function resetNofap(centralId) {
    const central = centralAccountsStore && typeof centralAccountsStore.getCentralById === "function"
        ? centralAccountsStore.getCentralById(centralId)
        : null;
    if (!central) throw new Error("central not found");

    const current = normalizeNofap(central.nofap);
    const previousRecord = Number(current.recordDays) || 0;
    const next = {
        startedAt: new Date().toISOString(),
        lastResetAt: new Date().toISOString(),
        totalResets: Number(current.totalResets) + 1,
        recordDays: previousRecord,
        currentDays: 0,
        title: getTitle(previousRecord),
        lastUpdatedAt: new Date().toISOString()
    };

    central.nofap = next;
    if (centralAccountsStore && typeof centralAccountsStore._markDirty === "function") {
        centralAccountsStore._markDirty();
    }

    return getNofapStatus(centralId);
}

function leaveNofap(centralId) {
    const central = centralAccountsStore && typeof centralAccountsStore.getCentralById === "function"
        ? centralAccountsStore.getCentralById(centralId)
        : null;
    if (!central) throw new Error("central not found");

    const current = normalizeNofap(central.nofap);
    central.nofap = {
        ...current,
        startedAt: null,
        currentDays: 0,
        title: getTitle(Number(current.recordDays) || 0),
        lastUpdatedAt: new Date().toISOString()
    };
    if (centralAccountsStore && typeof centralAccountsStore._markDirty === "function") {
        centralAccountsStore._markDirty();
    }

    return getNofapStatus(centralId);
}

function formatNofapStatus(status) {
    const safe = status || {};
    const startedAt = safe.startedAt ? new Date(safe.startedAt).toLocaleString("pt-BR") : "—";
    return [
        "🔥 *NoFap / Sequência*",
        `📅 *Iniciado em:* ${startedAt}`,
        `⏳ *Sequência atual:* ${safe.currentDays || 0} dias`,
        `🏆 *Recorde pessoal:* ${safe.recordDays || 0} dias`,
        `🔄 *Resets:* ${safe.totalResets || 0}`,
        `👑 *Título:* ${safe.title || "🌱 Iniciante"}`
    ].join("\n");
}

module.exports = {
    getTitle,
    normalizeNofap,
    currentSequenceDays,
    getNofapStatus,
    startNofap,
    resetNofap,
    leaveNofap,
    formatNofapStatus
};
