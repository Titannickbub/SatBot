const { loadSettings, saveSettings } = require("./groupSettings");
const centralAccountsStore = require("./centralAccounts");
const nofapHelper = require("./nofapHelper");

function getChallengeState(platform, chatId) {
    if (!platform || !chatId) return { enabled: false, year: new Date().getFullYear(), participants: {} };
    const settings = loadSettings(platform, chatId, "group");
    const challenge = settings?.settings?.setembroNofap || { enabled: true, year: new Date().getFullYear(), participants: {} };
    settings.settings = settings.settings || {};
    settings.settings.setembroNofap = {
        enabled: challenge.enabled !== false,
        year: Number(challenge.year) || new Date().getFullYear(),
        participants: challenge.participants || {}
    };
    saveSettings(platform, chatId, "group", settings);
    return settings.settings.setembroNofap;
}

function ensureParticipant(platform, chatId, centralId, extra = {}) {
    if (!platform || !chatId || !centralId) return null;
    const challenge = getChallengeState(platform, chatId);
    const participant = challenge.participants[centralId] || {};
    const now = new Date().toISOString();
    const next = {
        centralId,
        name: extra.name || participant.name || "Desconhecido",
        platform: extra.platform || participant.platform || platform,
        platformId: extra.platformId || participant.platformId || null,
        joinedAt: participant.joinedAt || extra.joinedAt || now,
        startedAt: participant.startedAt || extra.startedAt || now,
        resetCount: Number(participant.resetCount || extra.resetCount || 0),
        lastResetAt: participant.lastResetAt || extra.lastResetAt || null,
        lastInteraction: participant.lastInteraction || extra.lastInteraction || now,
        active: participant.active !== false && extra.active !== false,
        ...extra
    };
    challenge.participants[centralId] = next;
    const settings = loadSettings(platform, chatId, "group");
    settings.settings = settings.settings || {};
    settings.settings.setembroNofap = challenge;
    saveSettings(platform, chatId, "group", settings);
    return next;
}

function updateParticipantInteraction(platform, chatId, centralId, { name, platformId } = {}) {
    if (!platform || !chatId || !centralId) return null;
    const participant = ensureParticipant(platform, chatId, centralId, {
        name: name || null,
        platformId: platformId || null,
        lastInteraction: new Date().toISOString(),
        active: true
    });
    if (participant && centralAccountsStore && typeof centralAccountsStore.setLastInteraction === "function") {
        centralAccountsStore.setLastInteraction(centralId, participant.lastInteraction);
    }
    return participant;
}

function leaveParticipant(platform, chatId, centralId) {
    if (!platform || !chatId || !centralId) return null;
    const challenge = getChallengeState(platform, chatId);
    const participant = challenge.participants[centralId];
    if (!participant) return false;

    participant.active = false;
    participant.lastInteraction = new Date().toISOString();
    const settings = loadSettings(platform, chatId, "group");
    settings.settings = settings.settings || {};
    settings.settings.setembroNofap = challenge;
    saveSettings(platform, chatId, "group", settings);
    return participant;
}

function getGroupRankings(platform, chatId) {
    if (!platform || !chatId) return [];
    const challenge = getChallengeState(platform, chatId);
    const entries = Object.values(challenge.participants || {}).filter(participant => participant.active !== false);

    return entries
        .map((participant) => {
            const central = centralAccountsStore && typeof centralAccountsStore.getCentralById === "function"
                ? centralAccountsStore.getCentralById(participant.centralId)
                : null;
            const status = central ? nofapHelper.getNofapStatus(central.id) : { active: false, currentDays: 0, recordDays: 0, title: "🌱 Iniciante" };
            const lastSeen = participant.lastInteraction || participant.startedAt || null;
            return {
                centralId: participant.centralId,
                name: participant.name || central?.name || "Desconhecido",
                platform: participant.platform || platform,
                platformId: participant.platformId || null,
                currentDays: status.currentDays || 0,
                recordDays: status.recordDays || 0,
                title: status.title || "🌱 Iniciante",
                lastInteraction: lastSeen,
                active: participant.active !== false,
                resetCount: Number(participant.resetCount || status.totalResets || 0)
            };
        })
        .sort((a, b) => {
            const diff = (b.currentDays || 0) - (a.currentDays || 0);
            if (diff !== 0) return diff;
            const timeA = a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0;
            const timeB = b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0;
            return timeB - timeA;
        })
        .map((member, index) => ({ position: index + 1, ...member }));
}

function getActiveCandidates(rankings) {
    const now = Date.now();
    return (rankings || []).filter((member) => {
        const seen = member.lastInteraction ? new Date(member.lastInteraction).getTime() : 0;
        return Number.isFinite(seen) && now - seen <= 24 * 60 * 60 * 1000;
    });
}

function buildRankingText(platform, chatId, groupName) {
    const rankings = getGroupRankings(platform, chatId);
    if (!rankings.length) {
        return `🏆 *Ranking ${groupName || "Setembro"}*\nNenhum participante entrou no desafio ainda.`;
    }

    const active = getActiveCandidates(rankings);
    const top = (active.length ? active : rankings).slice(0, 5);
    const lines = top.map((member, index) => {
        const lastSeen = member.lastInteraction ? new Date(member.lastInteraction).toLocaleString("pt-BR") : "Nunca";
        return `${index + 1}. ${member.name} — ${member.currentDays} dias • última atividade: ${lastSeen}`;
    });

    return [`🏆 *Ranking ${groupName || "Setembro"}*`, ...lines].join("\n");
}

module.exports = {
    getChallengeState,
    ensureParticipant,
    updateParticipantInteraction,
    leaveParticipant,
    getGroupRankings,
    getActiveCandidates,
    buildRankingText
};
