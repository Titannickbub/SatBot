const fs = require("fs");
const path = require("path");
const config = require("./config");

const DATA_FILE = path.join(__dirname, "..", "settings", "rental.json");
const PLATFORMS = new Set(["whatsapp", "telegram", "discord"]);
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PRESENCE_MS = DAY_MS;
const DEFAULT_NOTICE_DAYS = 3;
const DEFAULT_WELCOME_MESSAGE = "👋 Olá! Este grupo/servidor ainda não tem uma assinatura do bot.\n\n{plans}\n\nPara contratar, escolha um plano e use {prefix}alugar contratar <ID> neste grupo/servidor. A permanência inicial é de {presence}; sem um pedido de aluguel até o fim desse prazo, o bot sairá daqui. Para consultar os planos no privado ou falar com o dono, use {prefix}alugar ou {prefix}dono.";
const LEGACY_DEFAULT_WELCOME_MESSAGE = "👋 Olá! O aluguel do bot está disponível neste grupo/servidor.\n\n{plans}\n\nPara consultar os planos no privado, use {prefix}alugar. Para falar com o dono, use {prefix}dono.";
const MAX_DURATION_MS = 10 * 365 * DAY_MS;

function assertPlatform(platform) {
    const normalized = String(platform || "").toLowerCase();
    if (!PLATFORMS.has(normalized)) {
        throw new Error("Plataforma inválida.");
    }
    return normalized;
}

function emptyStore() {
    return { version: 1, platforms: {} };
}

function defaultPlatformData() {
    return {
        settings: {
            enabled: false,
            presenceDurationMs: DEFAULT_PRESENCE_MS,
            noticeDays: DEFAULT_NOTICE_DAYS,
            expiryAction: "block",
            welcomeMessage: DEFAULT_WELCOME_MESSAGE
        },
        nextIds: { plan: 1, order: 1, subscription: 1 },
        plans: [],
        orders: [],
        subscriptions: [],
        presence: []
    };
}

function normalizePlatformData(value) {
    const defaults = defaultPlatformData();
    const source = value && typeof value === "object" ? value : {};
    const settings = source.settings && typeof source.settings === "object" ? source.settings : {};
    const nextIds = source.nextIds && typeof source.nextIds === "object" ? source.nextIds : {};
    return {
        settings: {
            ...defaults.settings,
            ...settings,
            enabled: settings.enabled === true,
            presenceDurationMs: Number.isSafeInteger(settings.presenceDurationMs) && settings.presenceDurationMs >= 60_000
                ? settings.presenceDurationMs
                : defaults.settings.presenceDurationMs,
            noticeDays: Number.isSafeInteger(settings.noticeDays) && settings.noticeDays >= 0
                ? settings.noticeDays
                : defaults.settings.noticeDays,
            expiryAction: settings.expiryAction === "leave" ? "leave" : "block",
            welcomeMessage: typeof settings.welcomeMessage !== "string" ||
                settings.welcomeMessage === LEGACY_DEFAULT_WELCOME_MESSAGE
                ? defaults.settings.welcomeMessage
                : settings.welcomeMessage.slice(0, 4000)
        },
        nextIds: {
            plan: Number.isSafeInteger(nextIds.plan) && nextIds.plan > 0 ? nextIds.plan : 1,
            order: Number.isSafeInteger(nextIds.order) && nextIds.order > 0 ? nextIds.order : 1,
            subscription: Number.isSafeInteger(nextIds.subscription) && nextIds.subscription > 0 ? nextIds.subscription : 1
        },
        plans: Array.isArray(source.plans) ? source.plans : [],
        orders: Array.isArray(source.orders) ? source.orders : [],
        subscriptions: Array.isArray(source.subscriptions) ? source.subscriptions : [],
        presence: Array.isArray(source.presence) ? source.presence : []
    };
}

function loadStore() {
    if (!fs.existsSync(DATA_FILE)) return emptyStore();
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (error) {
        throw new Error(`Não foi possível ler settings/rental.json: ${error.message || error}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("O arquivo settings/rental.json possui um formato inválido.");
    }
    return {
        version: 1,
        platforms: parsed.platforms && typeof parsed.platforms === "object" ? parsed.platforms : {}
    };
}

function saveStore(store) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(temporaryFile, DATA_FILE);
}

function readPlatform(platform) {
    const normalized = assertPlatform(platform);
    const store = loadStore();
    return normalizePlatformData(store.platforms[normalized]);
}

function updatePlatform(platform, callback) {
    const normalized = assertPlatform(platform);
    const store = loadStore();
    const data = normalizePlatformData(store.platforms[normalized]);
    const result = callback(data);
    store.platforms[normalized] = data;
    saveStore(store);
    return result;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function getSettings(platform) {
    return clone(readPlatform(platform).settings);
}

function setSettings(platform, updates = {}) {
    const allowedKeys = new Set(["enabled", "presenceDurationMs", "noticeDays", "expiryAction", "welcomeMessage"]);
    return updatePlatform(platform, data => {
        const wasEnabled = data.settings.enabled;
        for (const [key, value] of Object.entries(updates)) {
            if (!allowedKeys.has(key)) continue;
            if (key === "enabled") {
                if (typeof value !== "boolean") throw new Error("O estado do modo aluguel deve ser ligado ou desligado.");
                data.settings.enabled = value;
            } else if (key === "presenceDurationMs") {
                const duration = Number(value);
                if (!Number.isSafeInteger(duration) || duration < 60_000 || duration > MAX_DURATION_MS) {
                    throw new Error("O tempo de permanência deve estar entre 1 minuto e 10 anos.");
                }
                data.settings.presenceDurationMs = duration;
            } else if (key === "noticeDays") {
                const days = Number(value);
                if (!Number.isSafeInteger(days) || days < 0 || days > 365) {
                    throw new Error("A antecedência de aviso deve estar entre 0 e 365 dias.");
                }
                data.settings.noticeDays = days;
            } else if (key === "expiryAction") {
                if (value !== "block" && value !== "leave") {
                    throw new Error("A ação após a permanência deve ser bloquear ou sair.");
                }
                data.settings.expiryAction = value;
            } else if (key === "welcomeMessage") {
                if (typeof value !== "string" || !value.trim() || value.length > 4000) {
                    throw new Error("A mensagem de apresentação deve conter de 1 a 4.000 caracteres.");
                }
                data.settings.welcomeMessage = value.trim();
            }
        }
        if (!wasEnabled && data.settings.enabled) {
            const now = Date.now();
            for (const subscription of data.subscriptions) {
                if (!subscription.permanent && Number(subscription.expiresAt) <= now && subscription.status !== "deleted") {
                    subscription.graceStartedAt = now;
                    subscription.graceEndsAt = now + data.settings.presenceDurationMs;
                    subscription.lastExpiredNoticeDate = null;
                    subscription.onlyChatsNoticeSentAt = null;
                    subscription.status = "expired";
                }
            }
        }
        return clone(data.settings);
    });
}

function displayId(id, legacyPrefix) {
    const value = String(id);
    const legacy = legacyPrefix ? value.match(new RegExp(`^${legacyPrefix}-(\\d+)$`, "i")) : null;
    return legacy ? legacy[1] : value;
}

function findById(records, id, legacyPrefix) {
    const query = String(id || "").trim();
    return records.find(record => String(record.id) === query) ||
        records.find(record => displayId(record.id, legacyPrefix) === query);
}

function nextId(data, type, prefix, width) {
    const records = type === "plan" ? data.plans
        : type === "order" ? data.orders
            : data.subscriptions;
    const legacyPrefix = type === "plan" ? "PL" : type === "order" ? "AL" : prefix;
    let id;
    do {
        const number = data.nextIds[type]++;
        id = prefix
            ? `${prefix}-${String(number).padStart(width, "0")}`
            : String(number).padStart(width, "0");
    } while (records.some(record =>
        String(record.id) === id || displayId(record.id, legacyPrefix) === id
    ));
    return id;
}

function normalizePriceCents(value) {
    const cents = Number(value);
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100_000_000_000) {
        throw new Error("Informe um valor válido, maior ou igual a zero.");
    }
    return cents;
}

function normalizeDuration(value) {
    const duration = Number(value);
    if (!Number.isSafeInteger(duration) || duration < 60_000 || duration > MAX_DURATION_MS) {
        throw new Error("A duração deve estar entre 1 minuto e 10 anos.");
    }
    return duration;
}

function normalizePlanInput(input, previous = {}) {
    const name = input.name === undefined ? previous.name : String(input.name).trim();
    if (typeof name !== "string" || !name || name.length > 80) {
        throw new Error("O nome do plano deve conter de 1 a 80 caracteres.");
    }
    const priceCents = input.priceCents === undefined
        ? previous.priceCents
        : normalizePriceCents(input.priceCents);
    if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
        throw new Error("Informe o valor do plano em centavos.");
    }
    const durationMs = input.durationMs === undefined
        ? previous.durationMs
        : normalizeDuration(input.durationMs);
    if (!Number.isSafeInteger(durationMs) || durationMs < 60_000 || durationMs > MAX_DURATION_MS) {
        throw new Error("Informe uma duração válida para o plano.");
    }
    return {
        name,
        priceCents,
        durationMs
    };
}

function getPlans(platform) {
    return clone(readPlatform(platform).plans);
}

function createPlan(platform, input = {}) {
    return updatePlatform(platform, data => {
        const values = normalizePlanInput(input);
        if (data.plans.some(plan => String(plan.name).toLowerCase() === values.name.toLowerCase())) {
            throw new Error("Já existe um plano com esse nome nesta plataforma.");
        }
        const plan = {
            id: nextId(data, "plan", "", 4),
            ...values,
            active: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        data.plans.push(plan);
        return clone(plan);
    });
}

function editPlan(platform, planId, input = {}) {
    return updatePlatform(platform, data => {
        const plan = findById(data.plans, planId, "PL");
        if (!plan) throw new Error("Plano não encontrado.");
        const values = normalizePlanInput(input, plan);
        if (data.plans.some(item => item.id !== plan.id && String(item.name).toLowerCase() === values.name.toLowerCase())) {
            throw new Error("Já existe outro plano com esse nome nesta plataforma.");
        }
        Object.assign(plan, values, { updatedAt: Date.now() });
        return clone(plan);
    });
}

function deletePlan(platform, planId) {
    return updatePlatform(platform, data => {
        const index = data.plans.findIndex(item => item.id === findById(data.plans, planId, "PL")?.id);
        if (index < 0) throw new Error("Plano não encontrado.");
        data.plans.splice(index, 1);
        return true;
    });
}

function findPlan(data, planId) {
    const query = String(planId || "").trim().toLowerCase();
    return data.plans.find(plan => plan.active !== false &&
        (String(plan.id).toLowerCase() === query ||
            displayId(plan.id, "PL").toLowerCase() === query ||
            String(plan.name).toLowerCase() === query));
}

function getScopeId(message) {
    const raw = message?.raw || {};
    const id = message?.serverId || message?.guildId || message?.communityId ||
        raw.guild?.id || raw.communityId || message?.chatId || raw.chat?.id;
    return id ? String(id) : null;
}

function getChatId(message) {
    const id = message?.chatId || message?.target?.chatId || message?.raw?.channel?.id || message?.raw?.chat?.id;
    return id ? String(id) : null;
}

function formatPrice(priceCents) {
    const amount = Number(priceCents) / 100;
    return `R$ ${amount.toFixed(2).replace(".", ",")}`;
}

function formatDuration(durationMs) {
    const units = [
        ["ano(s)", 365 * DAY_MS],
        ["mês(es)", 30 * DAY_MS],
        ["dia(s)", DAY_MS],
        ["hora(s)", 60 * 60 * 1000],
        ["minuto(s)", 60 * 1000]
    ];
    let remaining = durationMs;
    const parts = [];
    for (const [label, unit] of units) {
        const count = Math.floor(remaining / unit);
        if (count > 0) {
            parts.push(`${count} ${label}`);
            remaining %= unit;
        }
        if (parts.length === 2) break;
    }
    return parts.join(" e ") || "menos de 1 minuto";
}

function formatPlanList(platform) {
    const plans = getPlans(platform).filter(plan => plan.active !== false);
    if (!plans.length) return "Nenhum plano de aluguel está disponível no momento.";
    return plans.map(plan =>
        `• ${displayId(plan.id, "PL")} — ${plan.name}: ${formatPrice(plan.priceCents)} por ${formatDuration(plan.durationMs)}`
    ).join("\n");
}

function getPresence(data, scopeId) {
    return data.presence.find(item => item.scopeId === String(scopeId));
}

function setPresence(data, scopeId, updates) {
    let record = getPresence(data, scopeId);
    if (!record) {
        record = { scopeId: String(scopeId), joinedAt: Date.now(), state: "trial" };
        data.presence.push(record);
    }
    Object.assign(record, updates);
    return record;
}

function ensurePresence(platform, scopeId, chatId, threadId = null, now = Date.now()) {
    if (!scopeId) throw new Error("Não foi possível identificar o grupo ou servidor.");
    const normalized = assertPlatform(platform);
    const state = readPlatform(normalized);
    if (!state.settings.enabled) return { state: "disabled" };

    const subscription = state.subscriptions.find(item => item.scopeId === String(scopeId));
    if (subscription && (subscription.permanent || subscription.expiresAt > now)) {
        return { state: "active", subscription: clone(subscription) };
    }
    const presence = getPresence(state, scopeId);
    if (presence && presence.state !== "left") return clone(presence);

    return updatePlatform(normalized, data => {
        const record = setPresence(data, scopeId, {
            chatId: chatId ? String(chatId) : String(scopeId),
            threadId: threadId ? String(threadId) : null,
            joinedAt: now,
            deadlineAt: now + data.settings.presenceDurationMs,
            state: "trial",
            pendingOrderId: null,
            leftAt: null,
            welcomeSentAt: null,
            leaveNoticeSentAt: null,
            onlyChatsNoticeSentAt: null
        });
        return clone(record);
    });
}

function interpolateWelcomeMessage(template, platform) {
    const plans = formatPlanList(platform);
    const prefix = config.getPrefix();
    return String(template || DEFAULT_WELCOME_MESSAGE)
        .replace(/\{plans\}/g, plans)
        .replace(/\{prefix\}/g, prefix)
        .replace(/\{presence\}/g, formatDuration(getSettings(platform).presenceDurationMs))
        .replace(/\{bot\}/g, config.getBotName());
}

async function sendPlatformText(platform, chatId, text, options, threadId = null) {
    const adapter = global.platformRegistry?.[platform];
    if (!adapter || typeof adapter.sendText !== "function") {
        throw new Error(`A plataforma ${platform} não está disponível para envio.`);
    }
    return adapter.sendText(String(chatId), threadId, text, options);
}

async function getWhatsAppAdminMentions(chatId) {
    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function") {
        throw new Error("WhatsApp indisponível para consultar os administradores do grupo.");
    }
    const metadata = await sock.groupMetadata(String(chatId));
    return (metadata.participants || [])
        .filter(participant => participant.admin || participant.isAdmin || participant.isSuperAdmin)
        .map(participant => participant.id || participant.jid)
        .filter(Boolean)
        .map(String);
}

async function sendGroupNotice(platform, chatId, text, threadId = null) {
    if (platform !== "whatsapp") return sendPlatformText(platform, chatId, text, undefined, threadId);
    const mentions = await getWhatsAppAdminMentions(chatId);
    const tags = mentions.map(id => `@${id.split("@")[0]}`).join(" ");
    const formatted = tags ? `${tags}\n${text}` : text;
    const adapter = global.platformRegistry?.whatsapp;
    if (!adapter || typeof adapter.sendText !== "function") {
        throw new Error("WhatsApp indisponível para enviar o aviso do aluguel.");
    }
    return adapter.sendText(String(chatId), threadId, formatted, mentions);
}

async function notifySubscription(platform, subscription, text, includeCreator = true) {
    const failures = [];
    if (includeCreator && subscription.creatorId) {
        try {
            await sendPlatformText(platform, subscription.creatorId, text);
        } catch (error) {
            failures.push(`PV do criador: ${error.message || error}`);
        }
    }
    const destination = subscription.originChatId || subscription.createdInChatId;
    if (destination) {
        try {
            await sendGroupNotice(platform, destination, text, subscription.originThreadId || null);
        } catch (error) {
            failures.push(`chat da assinatura: ${error.message || error}`);
        }
    }
    if (failures.length) {
        console.warn(`[ALUGUEL] Falha ao entregar aviso (${platform}/${subscription.scopeId}): ${failures.join(" | ")}`);
    }
    return failures;
}

async function handleBotAdded(platform, scopeId, chatId, displayName = "", threadId = null, categoryId = null) {
    const normalized = assertPlatform(platform);
    const settings = getSettings(normalized);
    if (!settings.enabled) return false;
    const context = {
        platform: normalized,
        chatId: String(chatId || scopeId),
        serverId: normalized === "discord" ? String(scopeId) : undefined,
        categoryId: categoryId ? String(categoryId) : undefined,
        isPrivate: false
    };
    if (config.isOnlyChatsContextWhitelisted(context)) return false;
    const subscription = readPlatform(normalized).subscriptions.find(item =>
        item.scopeId === String(scopeId)
    );
    if (subscription && !subscription.permanent && Number(subscription.expiresAt) <= Date.now()) {
        updatePlatform(normalized, data => {
            const current = data.subscriptions.find(item => item.id === subscription.id);
            if (current) {
                current.leftAt = null;
                current.leaveNoticeSentAt = null;
                current.chatId = String(scopeId);
                current.originChatId = String(chatId || scopeId);
                current.originThreadId = threadId ? String(threadId) : null;
            }
        });
        return false;
    }
    const state = ensurePresence(normalized, scopeId, chatId, threadId);
    if (state.state === "active") {
        updatePlatform(normalized, data => {
            const subscription = data.subscriptions.find(item => item.scopeId === String(scopeId));
            if (subscription) {
                subscription.leftAt = null;
                subscription.leaveNoticeSentAt = null;
                subscription.chatId = String(scopeId);
                subscription.originChatId = String(chatId || scopeId);
                subscription.originThreadId = threadId ? String(threadId) : null;
            }
        });
        return false;
    }
    if (state.state !== "trial" || state.welcomeSentAt) return false;
    const greeting = interpolateWelcomeMessage(settings.welcomeMessage, normalized);
    const text = `${displayName ? `Bem-vindos a ${displayName}!\n\n` : ""}${greeting}`;
    try {
        await sendGroupNotice(normalized, chatId || scopeId, text, threadId);
    } catch (error) {
        console.error(`[ALUGUEL] Não foi possível enviar a apresentação em ${normalized}/${scopeId}:`, error.message || error);
        return false;
    }
    updatePlatform(normalized, data => {
        const presence = getPresence(data, scopeId);
        if (presence) {
            presence.welcomeSentAt = Date.now();
            presence.chatId = String(chatId || scopeId);
            presence.threadId = threadId ? String(threadId) : null;
        }
    });
    return true;
}

function createOrder(platform, { scopeId, chatId, threadId, categoryId, creatorId, creatorName, planId, type = "initial" } = {}) {
    const normalized = assertPlatform(platform);
    const now = Date.now();
    if (!scopeId || !creatorId) throw new Error("Não foi possível identificar o grupo/servidor e quem está criando o pedido.");
    return updatePlatform(normalized, data => {
        if (!data.settings.enabled) throw new Error("O modo de aluguel está desativado.");
        const plan = findPlan(data, planId);
        if (!plan) throw new Error("Plano não encontrado ou indisponível.");
        const subscription = data.subscriptions.find(item =>
            item.scopeId === String(scopeId) && item.status !== "deleted"
        );
        const orderType = type === "renewal" ? "renewal" : "initial";
        if (orderType === "initial" && config.isOnlyChatsContextWhitelisted({
            platform: normalized,
            chatId: String(chatId || scopeId),
            serverId: normalized === "discord" ? String(scopeId) : undefined,
            categoryId: categoryId ? String(categoryId) : undefined,
            threadId: threadId ? String(threadId) : null,
            isPrivate: false
        })) {
            throw new Error("Este grupo/servidor já possui acesso permanente pelo OnlyChats.");
        }
        if (orderType === "renewal" && (!subscription || subscription.permanent || subscription.deletedAt)) {
            throw new Error("Não encontrei uma assinatura temporária para renovar neste grupo/servidor.");
        }
        if (orderType === "initial" && subscription && (subscription.permanent || subscription.expiresAt > now)) {
            throw new Error("Este grupo/servidor já possui acesso permanente ou uma assinatura ativa.");
        }
        if (data.orders.some(order =>
            order.scopeId === String(scopeId) && order.type === orderType && order.status === "pending"
        )) {
            throw new Error("Já existe um pedido pendente deste tipo neste grupo/servidor.");
        }

        let presence = getPresence(data, scopeId);
        if (orderType === "initial") {
            if (!presence) {
                presence = setPresence(data, scopeId, {
                    chatId: String(chatId || scopeId),
                    threadId: threadId ? String(threadId) : null,
                    joinedAt: now,
                    deadlineAt: now + data.settings.presenceDurationMs,
                    state: "trial",
                    pendingOrderId: null,
                    leftAt: null
                });
            }
            if (presence.state === "left") throw new Error("O bot já saiu deste grupo/servidor. Adicione-o novamente antes de pedir o aluguel.");
            if (presence.state !== "trial" && presence.state !== "pending") {
                throw new Error("Não é possível abrir um pedido inicial para este grupo/servidor.");
            }
            if (presence.deadlineAt && now > presence.deadlineAt && presence.state !== "pending") {
                throw new Error("O tempo inicial de permanência terminou. Adicione o bot novamente para abrir um pedido.");
            }
        }

        const order = {
            id: nextId(data, "order", "", 4),
            type: orderType,
            scopeId: String(scopeId),
            chatId: String(chatId || scopeId),
            threadId: threadId ? String(threadId) : null,
            creatorId: String(creatorId),
            creatorName: String(creatorName || creatorId).slice(0, 100),
            planId: plan.id,
            planName: plan.name,
            priceCents: plan.priceCents,
            durationMs: plan.durationMs,
            subscriptionId: subscription?.id || null,
            status: "pending",
            createdAt: now,
            decidedAt: null
        };
        data.orders.push(order);
        if (orderType === "initial") {
            setPresence(data, scopeId, {
                state: "pending",
                pendingOrderId: order.id,
                chatId: order.chatId,
                threadId: order.threadId
            });
        }
        return clone(order);
    });
}

function listOrders(platform, filter = "all") {
    const orders = readPlatform(platform).orders;
    return clone(orders
        .filter(order => filter === "all" || order.status === filter)
        .sort((a, b) => b.createdAt - a.createdAt));
}

function getOrder(platform, orderId) {
    return clone(findById(readPlatform(platform).orders, orderId, "AL") || null);
}

function editOrder(platform, orderId, planId) {
    return updatePlatform(platform, data => {
        const order = findById(data.orders, orderId, "AL");
        if (!order) throw new Error("Pedido não encontrado.");
        if (order.status !== "pending") throw new Error("Somente pedidos pendentes podem ser editados.");
        const plan = findPlan(data, planId);
        if (!plan) throw new Error("Plano não encontrado ou indisponível.");
        Object.assign(order, {
            planId: plan.id,
            planName: plan.name,
            priceCents: plan.priceCents,
            durationMs: plan.durationMs,
            updatedAt: Date.now()
        });
        return clone(order);
    });
}

function deleteOrder(platform, orderId) {
    return updatePlatform(platform, data => {
        const index = data.orders.findIndex(order => order.id === findById(data.orders, orderId, "AL")?.id);
        if (index < 0) throw new Error("Pedido não encontrado.");
        const [order] = data.orders.splice(index, 1);
        if (order.type === "initial") {
            const presence = getPresence(data, order.scopeId);
            if (presence?.pendingOrderId === order.id) {
                presence.state = "trial";
                presence.pendingOrderId = null;
            }
        }
        return clone(order);
    });
}

async function leaveChat(platform, scopeId) {
    const normalized = assertPlatform(platform);
    let result;
    if (normalized === "whatsapp") {
        if (!global.whatsappSock || typeof global.whatsappSock.groupLeave !== "function") {
            throw new Error("WhatsApp indisponível para sair do grupo.");
        }
        result = await global.whatsappSock.groupLeave(String(scopeId));
    } else if (normalized === "telegram") {
        if (!global.telegramBot?.telegram?.leaveChat) throw new Error("Telegram indisponível para sair do grupo.");
        result = await global.telegramBot.telegram.leaveChat(String(scopeId));
    } else {
        const client = global.discordClient;
        if (!client) throw new Error("Discord indisponível para sair do servidor.");
        const guild = await client.guilds.fetch(String(scopeId));
        result = await guild.leave();
    }
    const now = Date.now();
    updatePlatform(normalized, data => {
        const presence = getPresence(data, scopeId);
        if (presence) {
            presence.state = "left";
            presence.leftAt = now;
        }
        for (const subscription of data.subscriptions) {
            if (subscription.scopeId === String(scopeId)) subscription.leftAt = now;
        }
    });
    return result;
}

async function approveOrder(platform, orderId, actorId) {
    const normalized = assertPlatform(platform);
    const result = updatePlatform(normalized, data => {
        const order = findById(data.orders, orderId, "AL");
        if (!order) throw new Error("Pedido não encontrado.");
        if (order.status !== "pending") throw new Error("Este pedido já foi decidido.");
        const now = Date.now();
        let subscription = data.subscriptions.find(item => item.id === order.subscriptionId);
        if (order.type === "renewal") {
            if (!subscription || subscription.permanent || subscription.status === "deleted" || subscription.deletedAt) {
                throw new Error("A assinatura deste pedido não está disponível para renovação.");
            }
            const currentEnd = Number(subscription.expiresAt) > now ? Number(subscription.expiresAt) : now;
            subscription.expiresAt = currentEnd + order.durationMs;
            subscription.graceStartedAt = null;
            subscription.graceEndsAt = null;
            subscription.leftAt = null;
            subscription.leaveNoticeSentAt = null;
            subscription.onlyChatsNoticeSentAt = null;
            subscription.status = "active";
            subscription.updatedAt = now;
            subscription.planId = order.planId;
            subscription.planName = order.planName;
            subscription.priceCents = order.priceCents;
            delete subscription.deletedAt;
            delete subscription.deletedBy;
            subscription.chatId = order.scopeId;
            subscription.originChatId = order.chatId;
            subscription.originThreadId = order.threadId;
        } else {
            const existing = data.subscriptions.find(item =>
                item.scopeId === order.scopeId && item.status !== "deleted"
            );
            if (existing) {
                subscription = existing;
                subscription.expiresAt = now + order.durationMs;
                subscription.permanent = false;
                subscription.status = "active";
                subscription.graceStartedAt = null;
                subscription.graceEndsAt = null;
                subscription.leftAt = null;
                subscription.leaveNoticeSentAt = null;
                subscription.onlyChatsNoticeSentAt = null;
                subscription.updatedAt = now;
                subscription.planId = order.planId;
                subscription.planName = order.planName;
                subscription.priceCents = order.priceCents;
                delete subscription.deletedAt;
                delete subscription.deletedBy;
                subscription.chatId = order.scopeId;
                subscription.originChatId = order.chatId;
                subscription.originThreadId = order.threadId;
            } else {
                subscription = {
                    id: nextId(data, "subscription", "AS", 6),
                    scopeId: order.scopeId,
                    chatId: order.scopeId,
                    creatorId: order.creatorId,
                    creatorName: order.creatorName,
                    createdInChatId: order.chatId,
                    originChatId: order.chatId,
                    originThreadId: order.threadId,
                    planId: order.planId,
                    planName: order.planName,
                    priceCents: order.priceCents,
                    createdAt: now,
                    expiresAt: now + order.durationMs,
                    permanent: false,
                    status: "active",
                    graceStartedAt: null,
                    createdBy: String(actorId || "")
                };
                data.subscriptions.push(subscription);
            }
        }
        order.status = "approved";
        order.decidedAt = now;
        order.decidedBy = String(actorId || "");
        order.subscriptionId = subscription.id;
        const presence = getPresence(data, order.scopeId);
        if (presence) {
            presence.state = "active";
            presence.pendingOrderId = null;
            presence.leftAt = null;
        }
        return { order: clone(order), subscription: clone(subscription) };
    });

    const notificationFailures = await notifySubscription(normalized, result.subscription,
        `✅ O pedido ${result.order.id} foi aprovado. A assinatura está ativa até ${new Date(result.subscription.expiresAt).toLocaleString("pt-BR")}.`);
    return { ...result, warning: notificationFailures.join(" ") };
}

async function rejectOrder(platform, orderId, actorId) {
    const normalized = assertPlatform(platform);
    const order = updatePlatform(normalized, data => {
        const item = data.orders.find(entry => entry.id === String(orderId));
        if (!item) throw new Error("Pedido não encontrado.");
        if (item.status !== "pending") throw new Error("Este pedido já foi decidido.");
        item.status = "rejected";
        item.decidedAt = Date.now();
        item.decidedBy = String(actorId || "");
        if (item.type === "initial") {
            const presence = getPresence(data, item.scopeId);
            if (presence) {
                presence.state = "rejected";
                presence.leftAt = null;
            }
        }
        return clone(item);
    });
    let warning = "";
    if (order.type === "initial") {
        try {
            const presence = getPresence(readPlatform(normalized), order.scopeId);
            await performLeave(normalized, order.scopeId, presence || order,
                `❌ O pedido ${order.id} foi recusado. O bot vai sair deste grupo/servidor.`);
            updatePlatform(normalized, data => {
                const current = getPresence(data, order.scopeId);
                if (current) {
                    current.state = "left";
                    current.leftAt = Date.now();
                }
            });
        } catch (error) {
            console.error(`[ALUGUEL] Pedido ${order.id} recusado, mas falhou o aviso ou a saída:`, error.message || error);
            throw new Error(`Pedido recusado, mas não foi possível fazer o bot sair: ${error.message || error}`);
        }
    } else {
        try {
            await sendGroupNotice(normalized, order.chatId,
                `❌ O pedido de renovação ${order.id} foi recusado.`, order.threadId);
        } catch (error) {
            warning = `Não foi possível enviar o aviso: ${error.message || error}`;
            console.error(`[ALUGUEL] Pedido ${order.id} recusado, mas falhou o aviso no grupo:`, error.message || error);
        }
    }
    return { ...order, warning };
}

function listSubscriptions(platform, includeDeleted = false) {
    return clone(readPlatform(platform).subscriptions
        .filter(item => includeDeleted || item.status !== "deleted")
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
}

function createSubscription(platform, { scopeId, chatId, creatorId, creatorName, planId, durationMs, permanent = false, createdBy } = {}) {
    const normalized = assertPlatform(platform);
    if (!scopeId) throw new Error("Informe o ID do grupo ou servidor.");
    return updatePlatform(normalized, data => {
        const plan = planId ? findPlan(data, planId) : null;
        const duration = permanent ? null : normalizeDuration(durationMs === undefined ? plan?.durationMs : durationMs);
        const existing = data.subscriptions.find(item => item.scopeId === String(scopeId) && item.status !== "deleted");
        const now = Date.now();
        if (existing) {
            throw new Error("Já existe uma assinatura registrada para este grupo/servidor. Edite-a ou remova-a antes de conceder outra.");
        }
        const values = {
            scopeId: String(scopeId),
            chatId: String(chatId || scopeId),
            creatorId: creatorId ? String(creatorId) : null,
            creatorName: String(creatorName || creatorId || "Superusuário").slice(0, 100),
            originChatId: chatId ? String(chatId) : null,
            createdInChatId: chatId ? String(chatId) : null,
            planId: plan?.id || null,
            planName: plan?.name || "Assinatura manual",
            priceCents: plan?.priceCents || 0,
            permanent: Boolean(permanent),
            expiresAt: permanent ? null : now + duration,
            graceStartedAt: null,
            status: "active",
            updatedAt: now,
            createdBy: String(createdBy || "")
        };
        const subscription = {
            id: nextId(data, "subscription", "AS", 6),
            ...values,
            createdAt: now
        };
        data.subscriptions.push(subscription);
        return clone(subscription);
    });
}

function editSubscription(platform, subscriptionId, updates = {}) {
    return updatePlatform(platform, data => {
        const subscription = data.subscriptions.find(item =>
            item.id === String(subscriptionId) && item.status !== "deleted"
        );
        if (!subscription) throw new Error("Assinatura não encontrada.");
        if (updates.permanent !== undefined) {
            if (typeof updates.permanent !== "boolean") throw new Error("O estado permanente deve ser verdadeiro ou falso.");
            subscription.permanent = updates.permanent;
            subscription.expiresAt = updates.permanent
                ? null
                : normalizeDuration(updates.durationMs) + Date.now();
        } else if (updates.expiresAt !== undefined) {
            const expiresAt = Number(updates.expiresAt);
            if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) throw new Error("A data de vencimento é inválida.");
            subscription.expiresAt = expiresAt;
            subscription.permanent = false;
        } else if (updates.durationMs !== undefined) {
            subscription.expiresAt = Date.now() + normalizeDuration(updates.durationMs);
            subscription.permanent = false;
        }
        if (updates.creatorId !== undefined) subscription.creatorId = updates.creatorId ? String(updates.creatorId) : null;
        delete subscription.deletedAt;
        delete subscription.deletedBy;
        subscription.updatedAt = Date.now();
        subscription.status = subscription.permanent || subscription.expiresAt > Date.now() ? "active" : "expired";
        subscription.graceStartedAt = subscription.status === "expired" ? Date.now() : null;
        subscription.graceEndsAt = subscription.status === "expired"
            ? subscription.graceStartedAt + data.settings.presenceDurationMs
            : null;
        subscription.leftAt = null;
        subscription.leaveNoticeSentAt = null;
        subscription.onlyChatsNoticeSentAt = null;
        return clone(subscription);
    });
}

async function deleteSubscription(platform, subscriptionId, actorId) {
    const normalized = assertPlatform(platform);
    const subscription = updatePlatform(normalized, data => {
        const item = data.subscriptions.find(entry =>
            entry.id === String(subscriptionId) && entry.status !== "deleted" && !entry.deletedAt
        );
        if (!item) throw new Error("Assinatura não encontrada.");
        const now = Date.now();
        item.status = "expired";
        item.deletedAt = now;
        item.deletedBy = String(actorId || "");
        item.expiresAt = now;
        item.permanent = false;
        item.graceStartedAt = now;
        item.graceEndsAt = now + data.settings.presenceDurationMs;
        item.lastExpiredNoticeDate = null;
        item.onlyChatsNoticeSentAt = null;
        item.updatedAt = now;
        item.deletionNoticePending = !item.createdInChatId;
        return clone(item);
    });
    const text = `⚠️ A assinatura ${subscription.id} foi removida pelo superusuário. As funções do bot estão bloqueadas.`;
    const failures = await notifySubscription(normalized, subscription, text);
    const chatFailure = failures.some(failure => failure.startsWith("chat da assinatura:"));
    await updatePlatform(normalized, data => {
        const current = data.subscriptions.find(item => item.id === subscription.id);
        if (current) {
            current.deletionNoticePending = !current.createdInChatId || chatFailure;
            current.lastExpiredNoticeDate = getLocalDateKey(now);
            current.onlyChatsNoticeSentAt = current.createdInChatId && !chatFailure ? Date.now() : null;
        }
    });
    const warning = failures.join(" ");
    return { ...subscription, warning };
}

function getAccessDecision(message, now = Date.now()) {
    if (!message || message.isPrivate) return null;
    const platform = String(message.platform || "").toLowerCase();
    if (!PLATFORMS.has(platform)) return null;
    const scopeId = getScopeId(message);
    if (!scopeId) return null;
    const settings = getSettings(platform);
    const data = readPlatform(platform);
    let subscription = data.subscriptions.find(item => item.scopeId === scopeId);
    if (subscription?.leftAt) {
        subscription = updatePlatform(platform, mutable => {
            const current = mutable.subscriptions.find(item => item.id === subscription.id);
            if (current) {
                current.leftAt = null;
                current.leaveNoticeSentAt = null;
            }
            return clone(current || subscription);
        });
    }
    const presence = getPresence(data, scopeId);
    if (!settings.enabled) {
        return subscription || presence
            ? { allowed: true, state: "disabled", subscription, presence }
            : null;
    }

    if (subscription?.permanent) return { allowed: true, state: "permanent", subscription };
    if (subscription && Number(subscription.expiresAt) > now && subscription.status === "active") {
        return { allowed: true, state: "active", subscription };
    }
    if (subscription) {
        let current = subscription;
        if (!current.graceStartedAt) {
            current = updatePlatform(platform, mutable => {
                const saved = mutable.subscriptions.find(item => item.id === subscription.id);
                if (saved && !saved.graceStartedAt) {
                    saved.status = saved.status === "deleted" ? "deleted" : "expired";
                    saved.graceStartedAt = now;
                    saved.graceEndsAt = now + mutable.settings.presenceDurationMs;
                }
                return clone(saved || subscription);
            });
        }
        const graceEndsAt = Number(current.graceEndsAt || current.graceStartedAt + settings.presenceDurationMs);
        return {
            allowed: false,
            state: now < graceEndsAt ? "expired-grace" : "expired-blocked",
            subscription: current,
            graceEndsAt
        };
    }

    if (!presence || presence.state === "left") return null;
    if (presence.state === "pending" || presence.state === "rejected") {
        return { allowed: false, state: "pending", presence };
    }
    if (presence.state === "trial" && Number(presence.deadlineAt) > now) {
        return { allowed: true, state: "trial", presence };
    }
    return { allowed: false, state: "trial-expired", presence };
}

function isRentalManagementCommand(message) {
    const prefix = message?.prefix || config.getPrefix();
    const text = String(message?.text || "").trim();
    if (!text.startsWith(prefix)) return false;
    const commandName = text.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
    return commandName === "alugar" || commandName === "modoaluguel";
}

async function notifyBlockedAccessOnce(message, text) {
    const platform = String(message?.platform || "").toLowerCase();
    const scopeId = getScopeId(message);
    if (!PLATFORMS.has(platform) || !scopeId || !text) return false;
    const access = getAccessDecision(message);
    if (!access || access.allowed ||
        !["expired-grace", "expired-blocked", "trial-expired"].includes(access.state)) {
        return false;
    }
    const record = access.subscription || access.presence;
    if (record?.onlyChatsNoticeSentAt) return false;
    const chatId = getChatId(message);
    if (!chatId) return false;
    try {
        await sendGroupNotice(platform, chatId, text, message.threadId || message.topicId || null);
        updatePlatform(platform, data => {
            const current = access.subscription
                ? data.subscriptions.find(item => item.id === access.subscription.id)
                : getPresence(data, scopeId);
            if (current) current.onlyChatsNoticeSentAt = Date.now();
        });
        return true;
    } catch (error) {
        console.error(`[ALUGUEL] Não foi possível avisar sobre o bloqueio em ${platform}/${scopeId}:`, error.message || error);
        return false;
    }
}

async function performLeave(platform, scopeId, record, reason) {
    if (record.leftAt) return false;
    const noticeChatId = record.originChatId || record.createdInChatId || record.chatId;
    const threadId = record.originThreadId || record.threadId || null;
    if (noticeChatId && !record.leaveNoticeSentAt) {
        await sendGroupNotice(platform, noticeChatId, reason, threadId);
        updatePlatform(platform, data => {
            const current = record.id
                ? data.subscriptions.find(item => item.id === record.id)
                : getPresence(data, scopeId);
            if (current) current.leaveNoticeSentAt = Date.now();
        });
    }
    await leaveChat(platform, scopeId);
    return true;
}

function getLocalDateKey(now = Date.now()) {
    return new Date(now).toLocaleDateString("sv-SE", { timeZone: config.getTimezone() || "America/Sao_Paulo" });
}

async function processPendingDeletionNotices(platform, message) {
    const chatId = getChatId(message);
    if (!chatId) return;
    const pending = readPlatform(platform).subscriptions.filter(item => item.deletionNoticePending);
    for (const subscription of pending) {
        try {
            await sendGroupNotice(platform, chatId, `⚠️ A assinatura ${subscription.id} foi removida pelo superusuário. As funções do bot estão bloqueadas.`);
            await updatePlatform(platform, data => {
                const current = data.subscriptions.find(item => item.id === subscription.id);
                if (current) {
                    current.deletionNoticePending = false;
                    current.onlyChatsNoticeSentAt = Date.now();
                }
            });
        } catch (error) {
            console.error(`[ALUGUEL] Não foi possível entregar aviso de remoção ${subscription.id}:`, error.message || error);
        }
    }
}

async function runMaintenance(now = Date.now()) {
    const dateKey = getLocalDateKey(now);
    for (const platform of PLATFORMS) {
        const initial = readPlatform(platform);
        if (!initial.settings.enabled) continue;

        for (const presence of initial.presence) {
            const state = readPlatform(platform);
            const current = getPresence(state, presence.scopeId);
            if (current?.state === "rejected" && !current.leftAt) {
                try {
                    await performLeave(platform, current.scopeId, current,
                        "❌ O pedido de aluguel foi recusado. O bot vai sair deste grupo/servidor.");
                    updatePlatform(platform, data => {
                        const record = getPresence(data, current.scopeId);
                        if (record) {
                            record.state = "left";
                            record.leftAt = now;
                        }
                    });
                } catch (error) {
                    console.error(`[ALUGUEL] Falha ao sair de ${platform}/${current.scopeId} após recusa:`, error.message || error);
                }
                continue;
            }
            if (!current || current.state !== "trial" || !current.deadlineAt || current.deadlineAt > now) continue;
            const pendingOrder = state.orders.some(order =>
                order.scopeId === current.scopeId && order.type === "initial" && order.status === "pending"
            );
            if (pendingOrder) continue;
            try {
                await performLeave(platform, current.scopeId, current,
                    "⌛ O tempo inicial de permanência terminou sem um pedido de aluguel. O bot vai sair deste grupo/servidor.");
                updatePlatform(platform, data => {
                    const record = getPresence(data, current.scopeId);
                    if (record) {
                        record.state = "left";
                        record.leftAt = now;
                    }
                });
            } catch (error) {
                console.error(`[ALUGUEL] Falha ao sair de ${platform}/${current.scopeId} após o prazo inicial:`, error.message || error);
            }
        }

        const activeData = readPlatform(platform);
        for (const subscription of activeData.subscriptions) {
            if (subscription.permanent || !subscription.expiresAt || subscription.status === "deleted") continue;
            const settings = activeData.settings;
            const daysBefore = settings.noticeDays;
            const reminderStart = Number(subscription.expiresAt) - daysBefore * DAY_MS;
            const isInNoticeWindow = daysBefore > 0 && now >= reminderStart && now < subscription.expiresAt;
            const isExpired = now >= subscription.expiresAt;
            let current = subscription;

            if (isExpired && !current.graceStartedAt) {
                current = updatePlatform(platform, data => {
                    const saved = data.subscriptions.find(item => item.id === subscription.id);
                    if (saved && !saved.graceStartedAt) {
                        saved.graceStartedAt = now;
                        saved.graceEndsAt = now + data.settings.presenceDurationMs;
                        saved.status = "expired";
                    }
                    return clone(saved || subscription);
                });
            }

            if (isInNoticeWindow && subscription.lastNoticeDate !== dateKey &&
                subscription.lastExpiredNoticeDate !== dateKey) {
                const days = Math.max(0, Math.ceil((subscription.expiresAt - now) / DAY_MS));
                await notifySubscription(platform, subscription,
                    `⏳ A assinatura ${subscription.id} vence em ${days} dia(s). Para renovar, use ${config.getPrefix()}alugar renovar.`);
                updatePlatform(platform, data => {
                    const saved = data.subscriptions.find(item => item.id === subscription.id);
                    if (saved) saved.lastNoticeDate = dateKey;
                });
            }

            if (isExpired && current.lastExpiredNoticeDate !== dateKey &&
                current.lastNoticeDate !== dateKey &&
                now < Number(current.graceEndsAt || current.graceStartedAt + settings.presenceDurationMs)) {
                const graceEndsAt = Number(current.graceEndsAt || current.graceStartedAt + settings.presenceDurationMs);
                const days = Math.max(0, Math.ceil((graceEndsAt - now) / DAY_MS));
                await notifySubscription(platform, current,
                    `⚠️ A assinatura ${current.id} venceu. As funções básicas estão bloqueadas. Restam ${days} dia(s) do tempo de permanência para renovar.`);
                updatePlatform(platform, data => {
                    const saved = data.subscriptions.find(item => item.id === current.id);
                    if (saved) saved.lastExpiredNoticeDate = dateKey;
                });
            }

            const graceEndsAt = Number(current.graceEndsAt || current.graceStartedAt + settings.presenceDurationMs);
            if (isExpired && settings.expiryAction === "leave" && now >= graceEndsAt && !current.leftAt) {
                try {
                    await performLeave(platform, current.scopeId, current,
                        `⌛ O tempo de permanência após o vencimento da assinatura ${current.id} terminou. O bot vai sair.`);
                    updatePlatform(platform, data => {
                        const saved = data.subscriptions.find(item => item.id === current.id);
                        if (saved) saved.leftAt = now;
                    });
                } catch (error) {
                    console.error(`[ALUGUEL] Falha ao sair de ${platform}/${current.scopeId} após o vencimento:`, error.message || error);
                }
            }
        }
    }
}

let maintenanceTimer = null;

function startMaintenance(intervalMs = 60_000) {
    if (maintenanceTimer) return false;
    if (!Number.isSafeInteger(intervalMs) || intervalMs < 10_000) {
        throw new Error("O intervalo de verificação do aluguel deve ser de pelo menos 10 segundos.");
    }
    maintenanceTimer = setInterval(() => {
        runMaintenance().catch(error =>
            console.error("[ALUGUEL] Falha ao verificar vencimentos e permanências:", error.message || error)
        );
    }, intervalMs);
    if (typeof maintenanceTimer.unref === "function") maintenanceTimer.unref();
    runMaintenance().catch(error =>
        console.error("[ALUGUEL] Falha na verificação inicial de vencimentos:", error.message || error)
    );
    return true;
}

function stopMaintenance() {
    if (!maintenanceTimer) return false;
    clearInterval(maintenanceTimer);
    maintenanceTimer = null;
    return true;
}

function getDashboardData(platform) {
    const data = readPlatform(platform);
    return {
        settings: clone(data.settings),
        plans: clone(data.plans),
        orders: clone(data.orders.sort((a, b) => b.createdAt - a.createdAt)),
        subscriptions: clone(data.subscriptions.sort((a, b) => b.createdAt - a.createdAt)),
        presence: clone(data.presence)
    };
}

module.exports = {
    DAY_MS,
    assertPlatform,
    displayId,
    getSettings,
    setSettings,
    getPlans,
    createPlan,
    editPlan,
    deletePlan,
    formatPrice,
    formatDuration,
    parseDuration,
    formatPlanList,
    getScopeId,
    getChatId,
    ensurePresence,
    handleBotAdded,
    createOrder,
    listOrders,
    getOrder,
    editOrder,
    deleteOrder,
    approveOrder,
    rejectOrder,
    listSubscriptions,
    createSubscription,
    editSubscription,
    deleteSubscription,
    getAccessDecision,
    isRentalManagementCommand,
    notifyBlockedAccessOnce,
    sendGroupNotice,
    notifySubscription,
    processPendingDeletionNotices,
    leaveChat,
    runMaintenance,
    startMaintenance,
    stopMaintenance,
    getDashboardData
};

function parseDuration(input) {
    if (Number.isSafeInteger(input) && input >= 60_000) return normalizeDuration(input);
    const value = String(input || "").trim().toLowerCase();
    const match = value.match(/^(\d+)(m|min|h|d|w|mo|y)$/);
    if (!match) throw new Error("Duração inválida. Use um valor como 12h, 7d ou 1mo.");
    const count = Number(match[1]);
    const unitMs = {
        m: 60_000,
        min: 60_000,
        h: 60 * 60 * 1000,
        d: DAY_MS,
        w: 7 * DAY_MS,
        mo: 30 * DAY_MS,
        y: 365 * DAY_MS
    }[match[2]];
    return normalizeDuration(count * unitMs);
}
