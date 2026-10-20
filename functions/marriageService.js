const crypto = require("crypto");
const { cleanJid } = require("./moderationHelper");
const { store: defaultStore } = require("./marriageStore");

const REQUEST_TTL_MS = 5 * 60 * 1000;

function getScope(message) {
    const platform = String(message?.platform || "").toLowerCase();
    const chatType = String(message?.chatType || "").toLowerCase();
    const raw = message?.raw || {};
    let id;

    if (message?.isPrivate || chatType === "private") return null;
    if (platform === "discord") {
        id = raw.guild?.id || raw.guildId || message.guildId;
        if (!id) return null;
    } else if (platform === "whatsapp") {
        if (chatType !== "group") return null;
        id = message.chatId;
        if (!String(id || "").endsWith("@g.us")) return null;
    } else if (platform === "telegram") {
        if (!["group", "supergroup"].includes(chatType)) return null;
        id = message.chatId;
    } else {
        return null;
    }

    return id ? { platform, id: String(id) } : null;
}

function normalizeUserId(platform, userId) {
    const value = String(userId || "").trim();
    return platform === "whatsapp" ? cleanJid(value) : value;
}

function createMarriageService({ store = defaultStore, now = () => Date.now() } = {}) {
    function readFresh(scope, data) {
        const timestamp = now();
        const pending = data.pending.filter(request => {
            const expiresAt = Date.parse(request.expiresAt);
            return Number.isFinite(expiresAt) && expiresAt > timestamp;
        });
        if (pending.length !== data.pending.length) {
            data.pending = pending;
            store.save(scope, data);
        }
        return data;
    }

    function getMarriage(message, userId = message?.userId) {
        return getMarriages(message, userId)[0] || null;
    }

    function getMarriages(message, userId = message?.userId) {
        const scope = getScope(message);
        if (!scope) return [];
        const targetId = normalizeUserId(scope.platform, userId);
        if (!targetId) return [];
        const data = store.load(scope);
        if (deduplicateMarriages(data, scope.platform)) store.save(scope, data);
        return data.marriages
            .filter(item => item && (
                normalizeUserId(scope.platform, item.firstId) === targetId ||
                normalizeUserId(scope.platform, item.secondId) === targetId
            ))
            .map(item => formatMarriageForUser(item, scope.platform, targetId));
    }

    function getMarriageWithPartner(message, partnerId, userId = message?.userId) {
        const scope = getScope(message);
        if (!scope) return null;
        const normalizedPartner = normalizeUserId(scope.platform, partnerId);
        if (!normalizedPartner) return null;
        return getMarriages(message, userId).find(item =>
            normalizeUserId(scope.platform, item.partnerId) === normalizedPartner
        ) || null;
    }

    function getPending(message, recipientId = message?.userId) {
        const scope = getScope(message);
        if (!scope) return [];
        const normalizedRecipient = normalizeUserId(scope.platform, recipientId);
        const data = readFresh(scope, store.load(scope));
        return data.pending
            .filter(item => normalizeUserId(scope.platform, item.recipientId) === normalizedRecipient)
            .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    }

    function request(message, recipient) {
        const scope = getScope(message);
        if (!scope) return { error: "O casamento só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord." };
        const requesterId = normalizeUserId(scope.platform, message.userId);
        const recipientId = normalizeUserId(scope.platform, recipient?.id);
        if (!requesterId || !recipientId) return { error: "Não consegui identificar quem vai receber o pedido." };

        const data = readFresh(scope, store.load(scope));
        if (deduplicateMarriages(data, scope.platform)) store.save(scope, data);
        if (hasMarriageBetween(data, scope.platform, requesterId, recipientId)) {
            return { error: "Vocês já estão casados neste grupo/servidor." };
        }

        const existing = data.pending.find(item =>
            normalizeUserId(scope.platform, item.requesterId) === requesterId &&
            normalizeUserId(scope.platform, item.recipientId) === recipientId
        );
        if (existing) return { request: existing, duplicate: true };
        const reverseExisting = data.pending.find(item =>
            normalizeUserId(scope.platform, item.requesterId) === recipientId &&
            normalizeUserId(scope.platform, item.recipientId) === requesterId
        );
        if (reverseExisting) return { error: "Já existe um pedido de casamento pendente entre vocês." };

        const createdAt = now();
        const pending = {
            id: crypto.randomUUID(),
            requesterId,
            requesterName: message.displayName || message.username || requesterId,
            recipientId,
            recipientName: recipient.name || recipientId,
            createdAt: new Date(createdAt).toISOString(),
            expiresAt: new Date(createdAt + REQUEST_TTL_MS).toISOString()
        };
        data.pending.push(pending);
        store.save(scope, data);
        return { request: pending, duplicate: false };
    }

    function accept(message, { requestId, requesterId } = {}) {
        const scope = getScope(message);
        if (!scope) return { error: "O casamento só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord." };
        const recipientId = normalizeUserId(scope.platform, message.userId);
        const data = readFresh(scope, store.load(scope));
        if (deduplicateMarriages(data, scope.platform)) store.save(scope, data);
        const incoming = data.pending.filter(item =>
            normalizeUserId(scope.platform, item.recipientId) === recipientId
        );
        if (!incoming.length) return { error: "Você não tem pedidos de casamento pendentes neste grupo/servidor." };

        let matches = incoming;
        if (requestId) matches = matches.filter(item => item.id === requestId);
        if (requesterId) {
            const normalizedRequester = normalizeUserId(scope.platform, requesterId);
            matches = matches.filter(item =>
                normalizeUserId(scope.platform, item.requesterId) === normalizedRequester
            );
        }
        if (!matches.length) return { error: "Não encontrei um pedido pendente correspondente. Talvez tenha expirado." };
        if (matches.length > 1) return { error: "Você recebeu vários pedidos. Responda à mensagem do pedido ou use `casar aceitar @pretendente`." };

        const selected = matches[0];
        const requesterIdNormalized = normalizeUserId(scope.platform, selected.requesterId);
        if (hasMarriageBetween(data, scope.platform, requesterIdNormalized, recipientId)) {
            data.pending = data.pending.filter(item =>
                !hasPendingPair(item, scope.platform, requesterIdNormalized, recipientId)
            );
            store.save(scope, data);
            return { error: "Vocês já estão casados neste grupo/servidor." };
        }

        const marriage = {
            id: selected.id,
            firstId: selected.requesterId,
            firstName: selected.requesterName,
            secondId: selected.recipientId,
            secondName: message.displayName || message.username || selected.recipientName,
            marriedAt: new Date(now()).toISOString()
        };
        data.pending = data.pending.filter(item =>
            !hasPendingPair(item, scope.platform, requesterIdNormalized, recipientId)
        );
        data.marriages.push(marriage);
        store.save(scope, data);
        return { marriage };
    }

    function reject(message, { requestId, requesterId } = {}) {
        const scope = getScope(message);
        if (!scope) return { error: "O casamento só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord." };
        const recipientId = normalizeUserId(scope.platform, message.userId);
        const data = readFresh(scope, store.load(scope));
        const incoming = data.pending.filter(item =>
            normalizeUserId(scope.platform, item.recipientId) === recipientId
        );
        let matches = incoming;
        if (requestId) matches = matches.filter(item => item.id === requestId);
        if (requesterId) {
            const normalizedRequester = normalizeUserId(scope.platform, requesterId);
            matches = matches.filter(item =>
                normalizeUserId(scope.platform, item.requesterId) === normalizedRequester
            );
        }
        if (!matches.length) return { error: "Não encontrei esse pedido pendente." };
        if (matches.length > 1) return { error: "Você recebeu vários pedidos. Responda à mensagem do pedido ou indique quem pediu." };
        const selected = matches[0];
        data.pending = data.pending.filter(item => item.id !== selected.id);
        store.save(scope, data);
        return { request: selected };
    }

    function divorce(message, userId = message?.userId) {
        const scope = getScope(message);
        if (!scope) return { error: "O casamento só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord." };
        const normalizedUser = normalizeUserId(scope.platform, userId);
        const data = store.load(scope);
        if (deduplicateMarriages(data, scope.platform)) store.save(scope, data);
        const marriages = data.marriages.filter(item =>
            normalizeUserId(scope.platform, item.firstId) === normalizedUser ||
            normalizeUserId(scope.platform, item.secondId) === normalizedUser
        );
        if (!marriages.length) return { error: "Essa pessoa não está casada neste grupo/servidor." };
        if (marriages.length > 1) {
            return { error: "Essa pessoa tem mais de um relacionamento. Informe o parceiro para escolher qual encerrar." };
        }
        const marriage = marriages[0];
        data.marriages = data.marriages.filter(item => item !== marriage);
        store.save(scope, data);
        return { marriage };
    }

    function divorceWithPartner(message, partnerId) {
        const scope = getScope(message);
        if (!scope) return { error: "O casamento só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord." };
        const requesterId = normalizeUserId(scope.platform, message.userId);
        const normalizedPartnerId = normalizeUserId(scope.platform, partnerId);
        if (!normalizedPartnerId) return { error: "Marque seu parceiro ou responda a uma mensagem dele para confirmar o divórcio." };

        const data = store.load(scope);
        if (deduplicateMarriages(data, scope.platform)) store.save(scope, data);
        const existing = data.marriages.find(item =>
            item && pairKey(scope.platform, item.firstId, item.secondId) ===
                pairKey(scope.platform, requesterId, normalizedPartnerId) &&
            (normalizeUserId(scope.platform, item.firstId) === requesterId ||
                normalizeUserId(scope.platform, item.secondId) === requesterId) &&
            (normalizeUserId(scope.platform, item.firstId) === normalizedPartnerId ||
                normalizeUserId(scope.platform, item.secondId) === normalizedPartnerId)
        );
        if (!existing) return { error: "Você não está casado(a) neste grupo/servidor." };
        data.marriages = data.marriages.filter(item => item !== existing);
        store.save(scope, data);
        return { marriage: existing };
    }

    return { getScope, getMarriage, getMarriages, getMarriageWithPartner, getPending, request, accept, reject, divorce, divorceWithPartner };
}

function formatMarriageForUser(marriage, platform, userId) {
    const isFirst = normalizeUserId(platform, marriage.firstId) === userId;
    return {
        id: marriage.id,
        userName: isFirst ? marriage.firstName : marriage.secondName,
        partnerId: isFirst ? marriage.secondId : marriage.firstId,
        partnerName: isFirst ? marriage.secondName : marriage.firstName,
        marriedAt: marriage.marriedAt,
        selfMarriage: normalizeUserId(platform, marriage.firstId) === normalizeUserId(platform, marriage.secondId)
    };
}

function pairKey(platform, firstId, secondId) {
    const first = normalizeUserId(platform, firstId);
    const second = normalizeUserId(platform, secondId);
    if (!first || !second) return null;
    return [first, second].sort().join("\u0000");
}

function hasMarriageBetween(data, platform, firstId, secondId) {
    const key = pairKey(platform, firstId, secondId);
    return Boolean(key && data.marriages.some(item =>
        item && pairKey(platform, item.firstId, item.secondId) === key
    ));
}

function hasPendingPair(item, platform, firstId, secondId) {
    return item && pairKey(platform, item.requesterId, item.recipientId) === pairKey(platform, firstId, secondId);
}

function deduplicateMarriages(data, platform) {
    const seen = new Set();
    const marriages = data.marriages.filter(item => {
        const key = item && pairKey(platform, item.firstId, item.secondId);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const changed = marriages.length !== data.marriages.length;
    data.marriages = marriages;
    return changed;
}

function formatDuration(startedAt, currentTime = Date.now()) {
    const start = Date.parse(startedAt);
    if (!Number.isFinite(start)) return "tempo indisponível";
    let days = Math.max(0, Math.floor((currentTime - start) / 86400000));
    const years = Math.floor(days / 365);
    days %= 365;
    const months = Math.floor(days / 30);
    days %= 30;
    const parts = [];
    if (years) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
    if (months) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
    if (days || !parts.length) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
    return parts.join(", ");
}

module.exports = {
    REQUEST_TTL_MS,
    createMarriageService,
    getScope,
    formatDuration,
    ...createMarriageService()
};
