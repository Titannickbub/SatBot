const fs = require("fs");
const path = require("path");
const centralAccounts = require("./centralAccounts");
const itemRarity = require("./itemRarity");
const profileCosmetics = require("./profileCosmetics");
const auditLogs = require("./auditLogs");

function recordAuditLog(message, category, detail) {
    auditLogs.log(message, category, detail).catch(error => {
        console.error(`[AUDIT_LOG] Falha ao registrar ${category}:`, error.message || error);
    });
}

function formatAuditValue(value) {
    if (value === null) return "infinito/nenhum";
    if (typeof value === "number") return value;
    if (typeof value === "string") return value;
    return JSON.stringify(value);
}

const economyDir = path.join(__dirname, "..", "settings", "economy");
const DAILY_REWARD = 2000;
const SATCOIN_SYMBOL = "💷";
const MAX_WORKS_PER_DAY = 2;
const MAX_CASINO_PER_DAY = 5;
const CASINO_JACKPOT_PAYOUT_MULTIPLIER = 11;
const MAX_TRANSFERS_PER_DAY = 3;
const MAX_ROBBERIES_PER_DAY = 3;
const MIN_TRANSFER_AMOUNT = 1000;
const MIN_VAULT_DEPOSIT = 50000;
const VAULT_TAX_INTERVAL_MS = 60 * 60 * 1000;
const VAULT_MODES = Object.freeze(["secure", "tax", "robbery"]);
const MIN_ROBBABLE_BALANCE = 2000;
const STORE_ROBBERY_PRICE = 20000;
const MIN_SHIELD_BALANCE = 50000;
const STORE_SHIELD_PRICE = 20000;
const SHIELD_DURABILITY = 5;
const LEVEL_UP_REWARD_BASE = 1500;
const COMMUNITY_STORE_DEFAULT_TITLE = "🛍️ LOJA LOCAL";
const COMMUNITY_STORE_DEFAULT_NOTICE = "Itens especiais disponíveis neste grupo/servidor.";
const COMMUNITY_STORE_FIRST_ITEM_ID = 1001;
const SIGNAL_SEARCH_LEVELS = Object.freeze({
    recruta: Object.freeze({
        label: "Recruta",
        price: 10000,
        cashMin: 500,
        cashMax: 3000,
        weights: Object.freeze({ money: 70, reset: 30 })
    }),
    especializada: Object.freeze({
        label: "Especializada",
        price: 50000,
        cashMin: 2000,
        cashMax: 10000,
        weights: Object.freeze({ money: 55, reset: 20, cosmetic: 25 })
    })
});
const LOCAL_SIGNAL_RARITIES = Object.freeze([
    itemRarity.COMMON,
    itemRarity.UNCOMMON,
    itemRarity.RARE,
    itemRarity.EPIC,
    itemRarity.LEGENDARY
]);
const STORE_ITEMS = [
    { key: "work", name: "resetar trabalho", aliases: ["trabalho", "work"], price: 10000, rarity: itemRarity.COMMON, date: "workDate", count: "workCount", max: MAX_WORKS_PER_DAY },
    { key: "fishing", name: "resetar pesca", aliases: ["pesca", "pescar", "fishing"], price: 8000, rarity: itemRarity.COMMON, date: "fishingDate", count: "fishingCount", max: MAX_WORKS_PER_DAY },
    { key: "mining", name: "resetar mineração", aliases: ["mineracao", "mineração", "minerar", "mining"], price: 9000, rarity: itemRarity.COMMON, date: "miningDate", count: "miningCount", max: MAX_WORKS_PER_DAY },
    { key: "casino", name: "resetar cassino", aliases: ["cassino", "casino"], price: 5000, rarity: itemRarity.COMMON, date: "casinoDate", count: "casinoCount", max: MAX_CASINO_PER_DAY },
    { key: "transfer", name: "resetar transferência", aliases: ["transferencia", "transferência", "transferir", "transfer"], price: 10000, rarity: itemRarity.COMMON, date: "transferDate", count: "transferCount", max: MAX_TRANSFERS_PER_DAY },
    { key: "robbery", name: "resetar roubo", aliases: ["roubo", "roubar", "robbery"], price: STORE_ROBBERY_PRICE, rarity: itemRarity.COMMON, date: "robberyDate", count: "robberyCount", max: MAX_ROBBERIES_PER_DAY },
    { key: "all", name: "resetar todos", aliases: ["todos", "all"], price: 62000, rarity: itemRarity.EPIC },
    { key: "shield", name: "escudo anti-roubo", aliases: ["escudo", "shield"], price: STORE_SHIELD_PRICE, rarity: itemRarity.RARE, product: true }
];
const DAILY_PROFIT_KEYS = [
    "resgate",
    "trabalho",
    "pesca",
    "mineracao",
    "cassino",
    "transferenciaEnviada",
    "transferenciaRecebida",
    "roubo",
    "rouboSofrido",
    "loja",
    "busca",
    "impostoCofre"
];

const scopeCache = new Map();

function sanitizeFilename(value) {
    return String(value).replace(/[\\/:*?"<>|]/g, "_");
}

function getScopeFile(scope) {
    const filename = `${sanitizeFilename(scope.platform)}_${sanitizeFilename(scope.id)}.json`;
    return path.join(economyDir, filename);
}

function createCommunityStore() {
    return {
        title: COMMUNITY_STORE_DEFAULT_TITLE,
        notice: COMMUNITY_STORE_DEFAULT_NOTICE,
        nextItemId: COMMUNITY_STORE_FIRST_ITEM_ID,
        nextOrderId: 1,
        items: [],
        orders: [],
        localSignalSearch: createLocalSignalSearch()
    };
}

function createVaultConfig() {
    return {
        mode: "secure",
        minimumMovement: MIN_VAULT_DEPOSIT,
        taxType: "percent",
        taxRateBasisPoints: 100,
        taxFixedAmount: 100,
        robberyVaultChance: 40
    };
}

function normalizeVaultConfig(value) {
    const defaults = createVaultConfig();
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
    return {
        mode: VAULT_MODES.includes(value.mode) ? value.mode : defaults.mode,
        minimumMovement: Number.isSafeInteger(value.minimumMovement) && value.minimumMovement >= 0
            ? value.minimumMovement : defaults.minimumMovement,
        taxType: ["percent", "fixed"].includes(value.taxType) ? value.taxType : defaults.taxType,
        taxRateBasisPoints: Number.isSafeInteger(value.taxRateBasisPoints) &&
            value.taxRateBasisPoints >= 0 && value.taxRateBasisPoints <= 10000
            ? value.taxRateBasisPoints : defaults.taxRateBasisPoints,
        taxFixedAmount: Number.isSafeInteger(value.taxFixedAmount) && value.taxFixedAmount >= 0
            ? value.taxFixedAmount : defaults.taxFixedAmount,
        robberyVaultChance: Number.isSafeInteger(value.robberyVaultChance) &&
            value.robberyVaultChance >= 0 && value.robberyVaultChance <= 100
            ? value.robberyVaultChance : defaults.robberyVaultChance
    };
}

function createLocalSignalSearch() {
    return {
        enabled: false,
        price: 10000,
        tiers: Object.fromEntries(LOCAL_SIGNAL_RARITIES.map(rarity => [rarity, {
            chance: 0,
            guaranteeAfter: null,
            cashMin: null,
            cashMax: null,
            botItems: [],
            marketItems: [],
            backgrounds: [],
            outlines: []
        }])),
        featured: []
    };
}

function normalizeLocalSignalSearch(value) {
    const defaults = createLocalSignalSearch();
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
    const tiers = {};
    for (const rarity of LOCAL_SIGNAL_RARITIES) {
        const tier = value.tiers?.[rarity];
        const defaultTier = defaults.tiers[rarity];
        tiers[rarity] = {
            chance: Number.isSafeInteger(tier?.chance) && tier.chance >= 0 && tier.chance <= 100
                ? tier.chance : defaultTier.chance,
            guaranteeAfter: Number.isSafeInteger(tier?.guaranteeAfter) && tier.guaranteeAfter >= 1 && tier.guaranteeAfter <= 10000
                ? tier.guaranteeAfter : null,
            cashMin: Number.isSafeInteger(tier?.cashMin) && tier.cashMin >= 0 ? tier.cashMin : null,
            cashMax: Number.isSafeInteger(tier?.cashMax) && tier.cashMax >= 0 ? tier.cashMax : null,
            botItems: Array.isArray(tier?.botItems)
                ? [...new Set(tier.botItems.filter(key => STORE_ITEMS.some(item => item.key === key)))]
                : [],
            marketItems: Array.isArray(tier?.marketItems)
                ? [...new Set(tier.marketItems.filter(id => Number.isSafeInteger(id) && id >= COMMUNITY_STORE_FIRST_ITEM_ID))]
                : [],
            backgrounds: Array.isArray(tier?.backgrounds)
                ? [...new Set(tier.backgrounds.map(profileCosmetics.normalizeProfileBackground).filter(Boolean))]
                : [],
            outlines: Array.isArray(tier?.outlines)
                ? [...new Set(tier.outlines.map(profileCosmetics.normalizeProfileOutline).filter(Boolean))]
                : []
        };
        if (tiers[rarity].cashMin === null || tiers[rarity].cashMax === null ||
            tiers[rarity].cashMax < tiers[rarity].cashMin) {
            tiers[rarity].cashMin = null;
            tiers[rarity].cashMax = null;
        }
    }
    const featured = Array.isArray(value.featured)
        ? value.featured.slice(0, 2).filter(item =>
            item && typeof item === "object" &&
            (item.type === "bot" && STORE_ITEMS.some(candidate => candidate.key === item.key) ||
                item.type === "market" && Number.isSafeInteger(item.id) && item.id >= COMMUNITY_STORE_FIRST_ITEM_ID ||
                item.type === "background" && Boolean(profileCosmetics.normalizeProfileBackground(item.key)) ||
                item.type === "outline" && Boolean(profileCosmetics.normalizeProfileOutline(item.key)))
        ).map(item => item.type === "bot"
            ? { type: "bot", key: item.key }
            : item.type === "market"
                ? { type: "market", id: item.id }
                : { type: item.type, key: item.key })
        : [];
    return {
        enabled: value.enabled === true,
        price: Number.isSafeInteger(value.price) && value.price > 0 ? value.price : defaults.price,
        tiers,
        featured
    };
}

function normalizeItemRarity(value) {
    const rarity = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return Object.values(itemRarity).includes(rarity) ? rarity : null;
}

function normalizeCommunityStore(value) {
    const defaults = createCommunityStore();
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;

    const items = Array.isArray(value.items)
        ? value.items.filter(item =>
            item && typeof item === "object" &&
            Number.isSafeInteger(Number(item.id)) &&
            Number(item.id) >= COMMUNITY_STORE_FIRST_ITEM_ID &&
            typeof item.name === "string" &&
            typeof item.category === "string" &&
            Number.isSafeInteger(Number(item.price)) &&
            Number(item.price) >= 0 &&
            (item.quantity === null || (Number.isSafeInteger(Number(item.quantity)) && Number(item.quantity) >= 0))
        ).map(item => ({
            id: Number(item.id),
            name: item.name,
            category: item.category,
            price: Number(item.price),
            quantity: item.quantity === null ? null : Number(item.quantity),
            rarity: normalizeItemRarity(item.rarity)
        }))
        : [];
    const orders = Array.isArray(value.orders)
        ? value.orders.filter(order =>
            order && typeof order === "object" &&
            Number.isSafeInteger(Number(order.id)) &&
            ["pending", "delivered", "cancelled"].includes(order.status)
        )
        : [];
    const nextItemId = Number(value.nextItemId);
    const nextOrderId = Number(value.nextOrderId);

    return {
        title: typeof value.title === "string" && value.title.trim()
            ? value.title.trim()
            : defaults.title,
        notice: typeof value.notice === "string" ? value.notice : defaults.notice,
        nextItemId: Number.isSafeInteger(nextItemId)
            ? Math.max(COMMUNITY_STORE_FIRST_ITEM_ID, nextItemId, ...items.map(item => item.id + 1))
            : Math.max(COMMUNITY_STORE_FIRST_ITEM_ID, ...items.map(item => item.id + 1)),
        nextOrderId: Number.isSafeInteger(nextOrderId)
            ? Math.max(1, nextOrderId, ...orders.map(order => Number(order.id) + 1))
            : Math.max(1, ...orders.map(order => Number(order.id) + 1)),
        items,
        orders,
        localSignalSearch: normalizeLocalSignalSearch(value.localSignalSearch)
    };
}

function loadScope(scope) {
    if (scopeCache.has(scope.key)) return scopeCache.get(scope.key);

    const dataFile = getScopeFile(scope);
    let data = {
        platform: scope.platform,
        scopeId: scope.id,
        scopeName: scope.name,
        enabled: false,
        includeVaultInRanking: false,
        vaultConfig: createVaultConfig(),
        accounts: {},
        communityStore: createCommunityStore()
    };

    if (fs.existsSync(dataFile)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                data = {
                    platform: parsed.platform || scope.platform,
                    scopeId: parsed.scopeId || scope.id,
                    scopeName: parsed.scopeName || scope.name,
                    enabled: parsed.enabled === true,
                    includeVaultInRanking: parsed.includeVaultInRanking === true,
                    vaultConfig: normalizeVaultConfig(parsed.vaultConfig),
                    accounts: parsed.accounts && typeof parsed.accounts === "object" && !Array.isArray(parsed.accounts)
                        ? parsed.accounts
                        : {},
                    communityStore: normalizeCommunityStore(parsed.communityStore)
                };
            }
        } catch (err) {
            console.error(`[ECONOMY] Falha ao carregar ${dataFile}:`, err);
            throw new Error("Não foi possível carregar os dados da economia deste grupo.");
        }
    }

    scopeCache.set(scope.key, data);
    return data;
}

function saveScope(scope, data) {
    fs.mkdirSync(economyDir, { recursive: true });
    const dataFile = getScopeFile(scope);
    const temporaryFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;

    try {
        fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), "utf8");
        if (fs.existsSync(dataFile)) {
            fs.rmSync(dataFile, { force: true });
        }
        fs.renameSync(temporaryFile, dataFile);
    } catch (err) {
        if (fs.existsSync(temporaryFile)) {
            fs.rmSync(temporaryFile, { force: true });
        }
        throw err;
    }
}

function getScope(message) {
    const platform = String(message?.platform || "unknown");
    const raw = message?.raw || {};

    if (message?.isPrivate || message?.chatType === "private" || (platform === "discord" && !raw.guild && !raw.guildId && !message?.guildId)) {
        return null;
    }

    let id;
    let name;
    let type = "grupo";

    if (platform === "discord") {
        id = raw.guild?.id || raw.guildId || message?.guildId;
        name = raw.guild?.name || null;
        type = "servidor";
    } else {
        id = message?.chatId;
        name = message?.groupName || message?.chatName || raw.chat?.title || raw.chat?.name || raw.metadata?.subject || null;
    }

    if (!id) return null;

    return {
        platform,
        id: String(id),
        name: name || `${type} ${id}`,
        type,
        key: `${platform}:${String(id)}`
    };
}

function invalidateScope(platform, id) {
    scopeCache.delete(`${String(platform || "unknown")}:${String(id || "")}`);
}

function isEnabled(message) {
    const scope = getScope(message);
    if (!scope) return false;
    return loadScope(scope).enabled === true;
}

function setEnabled(message, enabled) {
    const scope = getScope(message);
    if (!scope) return null;
    const data = loadScope(scope);
    data.enabled = Boolean(enabled);
    saveScope(scope, data);
    return data.enabled;
}

function getIncludeVaultInRanking(message) {
    const scope = getScope(message);
    return scope ? loadScope(scope).includeVaultInRanking === true : false;
}

function setIncludeVaultInRanking(message, enabled) {
    const scope = getScope(message);
    if (!scope) return false;
    const data = loadScope(scope);
    data.includeVaultInRanking = Boolean(enabled);
    saveScope(scope, data);
    return data.includeVaultInRanking;
}

function getVaultConfig(message) {
    const scope = getScope(message);
    return scope ? normalizeVaultConfig(loadScope(scope).vaultConfig) : null;
}

function getVaultTaxPreview(message) {
    const scope = getScope(message);
    if (!scope) return null;
    const store = loadScope(scope);
    const account = store.accounts[String(message.userId)];
    const config = normalizeVaultConfig(store.vaultConfig);
    if (!account || typeof account !== "object") {
        return { amount: 0, periods: 0, mode: config.mode };
    }
    const tax = config.mode === "tax"
        ? calculateVaultTax(
            Math.max(0, Number(account.vaultBalance) || 0),
            account.vaultLastOperationAt,
            config,
            Date.now()
        )
        : { amount: 0, periods: 0 };
    return { ...tax, mode: config.mode };
}

function updateVaultConfig(message, updates) {
    const scope = getScope(message);
    if (!scope || !updates || typeof updates !== "object" || Array.isArray(updates)) return null;
    const store = loadScope(scope);
    const config = normalizeVaultConfig({ ...store.vaultConfig, ...updates });
    const valid =
        (!Object.prototype.hasOwnProperty.call(updates, "mode") || VAULT_MODES.includes(updates.mode)) &&
        (!Object.prototype.hasOwnProperty.call(updates, "minimumMovement") ||
            Number.isSafeInteger(updates.minimumMovement) && updates.minimumMovement >= 0) &&
        (!Object.prototype.hasOwnProperty.call(updates, "taxType") || ["percent", "fixed"].includes(updates.taxType)) &&
        (!Object.prototype.hasOwnProperty.call(updates, "taxRateBasisPoints") ||
            Number.isSafeInteger(updates.taxRateBasisPoints) &&
            updates.taxRateBasisPoints >= 0 && updates.taxRateBasisPoints <= 10000) &&
        (!Object.prototype.hasOwnProperty.call(updates, "taxFixedAmount") ||
            Number.isSafeInteger(updates.taxFixedAmount) && updates.taxFixedAmount >= 0) &&
        (!Object.prototype.hasOwnProperty.call(updates, "robberyVaultChance") ||
            Number.isSafeInteger(updates.robberyVaultChance) &&
            updates.robberyVaultChance >= 0 && updates.robberyVaultChance <= 100);
    if (!valid) return null;
    store.vaultConfig = config;
    saveScope(scope, store);
    return { ...config };
}

function rewardLevelUp(message, level) {
    if (!isEnabled(message)) return null;
    const normalizedLevel = Number(level);
    if (!Number.isSafeInteger(normalizedLevel) || normalizedLevel < 1) return null;

    const { account, scope } = getAccount(message);
    const amount = LEVEL_UP_REWARD_BASE * normalizedLevel;
    account.balance += amount;
    saveScope(scope, loadScope(scope));
    return {
        amount,
        balance: account.balance,
        scope
    };
}

function getAccount(message) {
    const scope = getScope(message);
    if (!scope) {
        throw new Error("A economia não está disponível em conversas privadas.");
    }
    const store = loadScope(scope);
    const accountKey = String(message.userId);

    if (!store.accounts[accountKey]) {
        store.accounts[accountKey] = {
            platform: scope.platform,
            scopeId: scope.id,
            userId: String(message.userId),
            displayName: message.displayName || null,
            username: message.username || null,
            balance: 0,
            vaultBalance: 0,
            lastClaimDate: null,
            workDate: null,
            workCount: 0,
            lastJob: null,
            fishingDate: null,
            fishingCount: 0,
            casinoDate: null,
            casinoCount: 0,
            miningDate: null,
            miningCount: 0,
            transferDate: null,
            transferCount: 0,
            robberyDate: null,
            robberyCount: 0,
            robbedUserIds: [],
            vaultDepositDate: null,
            vaultWithdrawDate: null,
            vaultLastOperationAt: null,
            shieldCharges: 0,
            dailyProfitDate: null,
            dailyProfits: createDailyProfits()
        };
        saveScope(scope, store);
    }

    const currentDisplayName = message.displayName || null;
    const currentUsername = message.username || null;
    let profileChanged = false;
    if (currentDisplayName && store.accounts[accountKey].displayName !== currentDisplayName) {
        store.accounts[accountKey].displayName = currentDisplayName;
        profileChanged = true;
    }
    if (currentUsername && store.accounts[accountKey].username !== currentUsername) {
        store.accounts[accountKey].username = currentUsername;
        profileChanged = true;
    }
    if (profileChanged) {
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "workDate")) {
        store.accounts[accountKey].workDate = null;
        store.accounts[accountKey].workCount = 0;
        store.accounts[accountKey].lastJob = null;
        store.accounts[accountKey].fishingDate = null;
        store.accounts[accountKey].fishingCount = 0;
        store.accounts[accountKey].casinoDate = null;
        store.accounts[accountKey].casinoCount = 0;
        store.accounts[accountKey].miningDate = null;
        store.accounts[accountKey].miningCount = 0;
        store.accounts[accountKey].transferDate = null;
        store.accounts[accountKey].transferCount = 0;
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "fishingDate")) {
        store.accounts[accountKey].fishingDate = null;
        store.accounts[accountKey].fishingCount = 0;
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "casinoDate")) {
        store.accounts[accountKey].casinoDate = null;
        store.accounts[accountKey].casinoCount = 0;
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "miningDate")) {
        store.accounts[accountKey].miningDate = null;
        store.accounts[accountKey].miningCount = 0;
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "transferDate")) {
        store.accounts[accountKey].transferDate = null;
        store.accounts[accountKey].transferCount = 0;
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "robberyDate")) {
        store.accounts[accountKey].robberyDate = null;
        store.accounts[accountKey].robberyCount = 0;
        store.accounts[accountKey].robbedUserIds = [];
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "shieldCharges")) {
        store.accounts[accountKey].shieldCharges = 0;
        saveScope(scope, store);
    }

    if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], "vaultBalance")) {
        store.accounts[accountKey].vaultBalance = 0;
        saveScope(scope, store);
    } else {
        const vaultBalance = Number(store.accounts[accountKey].vaultBalance);
        if (!Number.isSafeInteger(vaultBalance) || vaultBalance < 0) {
            throw new Error("O saldo do cofre desta conta está inválido.");
        }
        store.accounts[accountKey].vaultBalance = vaultBalance;
    }

    for (const field of ["vaultDepositDate", "vaultWithdrawDate", "vaultLastOperationAt"]) {
        if (!Object.prototype.hasOwnProperty.call(store.accounts[accountKey], field)) {
            store.accounts[accountKey][field] = null;
            saveScope(scope, store);
        }
    }

    ensureDailyProfitData(store.accounts[accountKey]);

    return {
        account: store.accounts[accountKey],
        scope
    };
}

function getBalance(message) {
    return getAccount(message).account.balance;
}

function getTotalBalance(account) {
    return (Number(account?.balance) || 0) + (Number(account?.vaultBalance) || 0);
}

function moveToVault(message, amount, operation) {
    const { account, scope } = getAccount(message);
    const store = loadScope(scope);
    const config = normalizeVaultConfig(store.vaultConfig);
    const today = getLocalDate();
    const dateField = operation === "deposit" ? "vaultDepositDate" : "vaultWithdrawDate";
    const result = {
        moved: false,
        reason: null,
        amount: 0,
        requestedAmount: amount,
        taxPaid: 0,
        taxPeriods: 0,
        mode: config.mode,
        minimumMovement: config.minimumMovement,
        balance: account.balance,
        vaultBalance: account.vaultBalance,
        totalBalance: getTotalBalance(account),
        scope
    };

    if (!Number.isSafeInteger(amount) || amount <= 0 || amount < config.minimumMovement) {
        result.reason = "invalid_amount";
        return result;
    }
    if (account[dateField] === today) {
        result.reason = "daily_limit";
        return result;
    }

    const balance = Number(account.balance) || 0;
    const vaultBalance = Number(account.vaultBalance) || 0;
    if (operation === "deposit" && balance < amount) {
        result.reason = "insufficient_balance";
        return result;
    }
    if (operation === "withdraw" && vaultBalance <= 0) {
        result.reason = "insufficient_vault";
        return result;
    }

    const now = Date.now();
    const tax = config.mode === "tax"
        ? calculateVaultTax(vaultBalance, account.vaultLastOperationAt, config, now)
        : { amount: 0, periods: 0 };
    const availableVault = vaultBalance - tax.amount;

    if (operation === "deposit") {
        if (!Number.isSafeInteger(availableVault + amount)) {
            result.reason = "invalid_amount";
            return result;
        }
        account.balance = balance - amount;
        account.vaultBalance = availableVault + amount;
        result.amount = amount;
    } else {
        const withdrawn = Math.min(amount, availableVault);
        if (!Number.isSafeInteger(balance + withdrawn)) {
            result.reason = "invalid_amount";
            return result;
        }
        account.vaultBalance = availableVault - withdrawn;
        account.balance = balance + withdrawn;
        result.amount = withdrawn;
        result.shortfall = amount - withdrawn;
    }

    account[dateField] = today;
    account.vaultLastOperationAt = now;
    if (tax.amount > 0) recordDailyProfit(account, "impostoCofre", -tax.amount);
    saveScope(scope, loadScope(scope));
    recordAuditLog(
        message,
        "vault",
        `${auditLogs.formatMember(message, message.userId, message.displayName || message.username)} ` +
            `${operation === "deposit" ? "depositou" : "sacou"} ${formatMoney(result.amount)}. ` +
            `Carteira: ${formatMoney(account.balance)} · Cofre: ${formatMoney(account.vaultBalance)}` +
            (tax.amount > 0 ? ` · Imposto: ${formatMoney(tax.amount)}` : "")
    );
    return {
        ...result,
        moved: true,
        taxPaid: tax.amount,
        taxPeriods: tax.periods,
        balance: account.balance,
        vaultBalance: account.vaultBalance,
        totalBalance: getTotalBalance(account)
    };
}

function calculateVaultTax(balance, lastOperationAt, config, now) {
    const lastOperation = Number(lastOperationAt);
    if (!Number.isFinite(lastOperation) || lastOperation <= 0 || balance <= 0 ||
        now - lastOperation <= VAULT_TAX_INTERVAL_MS) {
        return { amount: 0, periods: 0 };
    }
    const periods = Math.floor((now - lastOperation - VAULT_TAX_INTERVAL_MS) / VAULT_TAX_INTERVAL_MS);
    if (periods <= 0) return { amount: 0, periods: 0 };

    let remaining = balance;
    if (config.taxType === "fixed") {
        const total = BigInt(config.taxFixedAmount) * BigInt(periods) / 24n;
        remaining = Math.max(0, balance - Number(total > BigInt(balance) ? BigInt(balance) : total));
    } else {
        const denominator = 10000n;
        const retainedRate = BigInt(10000 - config.taxRateBasisPoints);
        const fullDays = Math.floor(periods / 24);
        const partialDayHours = periods % 24;
        for (let period = 0; period < fullDays && remaining > 0; period++) {
            const next = Number((BigInt(remaining) * retainedRate) / denominator);
            if (next === remaining) break;
            remaining = next;
        }
        if (partialDayHours > 0 && remaining > 0) {
            const partialTax = BigInt(remaining) * BigInt(config.taxRateBasisPoints) *
                BigInt(partialDayHours) / (denominator * 24n);
            remaining -= Number(partialTax);
        }
    }
    return { amount: balance - remaining, periods };
}

function depositToVault(message, amount) {
    return moveToVault(message, amount, "deposit");
}

function withdrawFromVault(message, amount) {
    return moveToVault(message, amount, "withdraw");
}

function getAccountByUser(message, userId) {
    const scope = getScope(message);
    if (!scope || userId === null || userId === undefined) return null;
    const store = loadScope(scope);
    const account = store.accounts[String(userId)];
    return account && typeof account === "object" ? account : null;
}

function getProfileCosmetics(message, userId = message?.userId) {
    const scope = getScope(message);
    if (!scope || userId === null || userId === undefined) {
        return { background: null, ownedBackgrounds: [], outline: null, ownedOutlines: [] };
    }
    const account = loadScope(scope).accounts[String(userId)];
    const cosmetics = account?.cosmetics;
    const ownedBackgrounds = Array.isArray(cosmetics?.backgrounds)
        ? [...new Set(cosmetics.backgrounds.map(profileCosmetics.normalizeProfileBackground).filter(Boolean))]
        : [];
    const selected = profileCosmetics.normalizeProfileBackground(cosmetics?.background);
    const ownedOutlines = Array.isArray(cosmetics?.outlines)
        ? [...new Set(cosmetics.outlines.map(profileCosmetics.normalizeProfileOutline).filter(Boolean))]
        : [];
    const selectedOutline = profileCosmetics.normalizeProfileOutline(cosmetics?.outline);
    return {
        background: selected && ownedBackgrounds.includes(selected) ? selected : null,
        ownedBackgrounds,
        outline: selectedOutline && ownedOutlines.includes(selectedOutline) ? selectedOutline : null,
        ownedOutlines
    };
}

function setProfileBackground(message, background) {
    const backgroundKey = profileCosmetics.normalizeProfileBackground(background);
    if (!backgroundKey) return { purchased: false, reason: "invalid-background" };
    const { account, scope } = getAccount(message);
    const cosmetics = account.cosmetics && typeof account.cosmetics === "object"
        ? account.cosmetics
        : { backgrounds: [], background: null };
    const ownedBackgrounds = Array.isArray(cosmetics.backgrounds)
        ? cosmetics.backgrounds.map(profileCosmetics.normalizeProfileBackground).filter(Boolean)
        : [];
    const alreadyOwned = ownedBackgrounds.includes(backgroundKey);
    const price = profileCosmetics.getProfileBackgroundPrice(backgroundKey);
    if (!alreadyOwned && account.balance < price) {
        return {
            purchased: false,
            reason: "insufficient-balance",
            price,
            balance: account.balance
        };
    }
    if (!alreadyOwned) {
        account.balance -= price;
        ownedBackgrounds.push(backgroundKey);
    }
    account.cosmetics = {
        ...cosmetics,
        backgrounds: [...new Set(ownedBackgrounds)],
        background: backgroundKey
    };
    saveScope(scope, loadScope(scope));
    return {
        purchased: true,
        boughtNow: !alreadyOwned,
        background: backgroundKey,
        price,
        balance: account.balance
    };
}

function setProfileOutline(message, outline) {
    const outlineKey = profileCosmetics.normalizeProfileOutline(outline);
    if (!outlineKey) return { purchased: false, reason: "invalid-outline" };
    const { account, scope } = getAccount(message);
    const cosmetics = account.cosmetics && typeof account.cosmetics === "object"
        ? account.cosmetics
        : { outlines: [], outline: null };
    const ownedOutlines = Array.isArray(cosmetics.outlines)
        ? cosmetics.outlines.map(profileCosmetics.normalizeProfileOutline).filter(Boolean)
        : [];
    const alreadyOwned = ownedOutlines.includes(outlineKey);
    const price = profileCosmetics.getProfileOutlinePrice(outlineKey);
    if (!alreadyOwned && account.balance < price) {
        return {
            purchased: false,
            reason: "insufficient-balance",
            price,
            balance: account.balance
        };
    }
    if (!alreadyOwned) {
        account.balance -= price;
        ownedOutlines.push(outlineKey);
    }
    account.cosmetics = {
        ...cosmetics,
        outlines: [...new Set(ownedOutlines)],
        outline: outlineKey
    };
    saveScope(scope, loadScope(scope));
    return {
        purchased: true,
        boughtNow: !alreadyOwned,
        outline: outlineKey,
        price,
        balance: account.balance
    };
}

function buyProfileCosmetic(message, selection) {
    const value = String(selection || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const outlinePrefix = /^(?:linha|linhas|outline|contorno|contornos)\s+/.test(value);
    const backgroundPrefix = /^(?:fundo|fundos|background|backgrounds)\s+/.test(value);
    const numericId = /^\d+$/.test(value) ? Number(value) : null;
    const isCosmeticId = Number.isSafeInteger(numericId) && numericId >= 2000;
    if (!outlinePrefix && !backgroundPrefix && !isCosmeticId) return { matched: false };

    const type = outlinePrefix || (numericId !== null && numericId >= 3000) ? "outline" : "background";
    const item = type === "outline"
        ? profileCosmetics.resolveProfileOutline(value)
        : profileCosmetics.resolveProfileBackground(value);
    if (!item) {
        return { matched: true, type, purchased: false, reason: "invalid-cosmetic" };
    }

    return {
        matched: true,
        type,
        ...(type === "outline"
            ? setProfileOutline(message, item.key)
            : setProfileBackground(message, item.key)),
        item,
        price: type === "outline"
            ? profileCosmetics.getProfileOutlinePrice(item.key)
            : profileCosmetics.getProfileBackgroundPrice(item.key)
    };
}

function buyProfileBackground(message, selection) {
    return buyProfileCosmetic(message, selection);
}

function resetProfileBackground(message) {
    const { account, scope } = getAccount(message);
    const cosmetics = account.cosmetics;
    if (!cosmetics || typeof cosmetics !== "object") {
        return { changed: false };
    }
    const changed = Boolean(cosmetics.background);
    cosmetics.background = null;
    saveScope(scope, loadScope(scope));
    return { changed };
}

function resetProfileOutline(message) {
    const { account, scope } = getAccount(message);
    const cosmetics = account.cosmetics;
    if (!cosmetics || typeof cosmetics !== "object") {
        return { changed: false };
    }
    const changed = Boolean(cosmetics.outline);
    cosmetics.outline = null;
    saveScope(scope, loadScope(scope));
    return { changed };
}

function listAccounts(message) {
    const scope = getScope(message);
    if (!scope) return [];
    return Object.values(loadScope(scope).accounts)
        .filter(account => account && typeof account === "object")
        .sort((left, right) =>
            getTotalBalance(right) - getTotalBalance(left) ||
            String(left.displayName || left.username || left.userId).localeCompare(
                String(right.displayName || right.username || right.userId),
                "pt-BR"
            )
        );
}

function refreshNames(message) {
    const scope = getScope(message);
    if (!scope) return false;
    const dataFile = getScopeFile(scope);
    if (!fs.existsSync(dataFile)) return false;
    try {
        JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch (error) {
        console.error(`[ECONOMY] Não foi possível atualizar nomes em ${dataFile}:`, error);
        return false;
    }
    const data = loadScope(scope);
    let changed = false;
    if (scope.name && data.scopeName !== scope.name) {
        data.scopeName = scope.name;
        changed = true;
    }
    const account = data.accounts[String(message.userId)];
    if (account) {
        if (message.displayName && account.displayName !== message.displayName) {
            account.displayName = message.displayName;
            changed = true;
        }
        if (message.username && account.username !== message.username) {
            account.username = message.username;
            changed = true;
        }
    }
    if (changed) saveScope(scope, data);
    return changed;
}

function resetBalance(message, userId) {
    const scope = getScope(message);
    if (!scope || userId === null || userId === undefined) return null;
    const store = loadScope(scope);
    const account = store.accounts[String(userId)];
    if (!account || typeof account !== "object") return null;
    const previousBalance = Math.max(0, Number(account.balance) || 0);
    const previousVaultBalance = Math.max(0, Number(account.vaultBalance) || 0);
    account.balance = 0;
    account.vaultBalance = 0;
    saveScope(scope, store);
    recordAuditLog(message, "balance",
        `👤 ${auditLogs.describeActor(message)}\n` +
        `👥 Membro: ${auditLogs.formatMember(message, userId, account.displayName || account.username)}\n` +
        `💳 Carteira: ${formatMoney(previousBalance)} → ${formatMoney(0)}\n` +
        `🔒 Cofre: ${formatMoney(previousVaultBalance)} → ${formatMoney(0)}`);
    return { ...account, previousBalance, previousVaultBalance };
}

function resetAllBalances(message) {
    const scope = getScope(message);
    if (!scope) return null;
    const store = loadScope(scope);
    const accounts = Object.values(store.accounts)
        .filter(account => account && typeof account === "object");
    for (const account of accounts) {
        account.balance = 0;
        account.vaultBalance = 0;
    }
    saveScope(scope, store);
    recordAuditLog(message, "balance",
        `${auditLogs.describeActor(message)} zerou os saldos de todos os membros (${accounts.length} contas).`);
    return accounts.length;
}

function getBalancePosition(message, userId) {
    const scope = getScope(message);
    if (!scope || userId === null || userId === undefined) return null;
    const store = loadScope(scope);
    const accounts = Object.values(store.accounts)
        .filter(account => account && typeof account === "object")
        .sort((a, b) => {
            const balance = account => store.includeVaultInRanking
                ? getTotalBalance(account)
                : Number(account.balance) || 0;
            return balance(b) - balance(a);
        });
    const index = accounts.findIndex(account => String(account.userId) === String(userId));
    return index === -1 ? null : index + 1;
}

function adjustBalance(message, target, amount, operation) {
    const scope = getScope(message);
    if (!scope) {
        throw new Error("A economia não está disponível em conversas privadas.");
    }
    if (!target || !target.userId) {
        return null;
    }

    const store = loadScope(scope);
    const account = store.accounts[String(target.userId)];
    if (!account || typeof account !== "object") {
        return null;
    }

    const previousBalance = Number(account.balance) || 0;

    if (operation === "set") {
        account.balance = amount;
    } else if (operation === "add") {
        account.balance = previousBalance + amount;
    } else {
        account.balance = previousBalance - amount;
    }

    saveScope(scope, store);
    const change = account.balance - previousBalance;
    recordAuditLog(message, "balance",
        `👤 Responsável: ${auditLogs.describeActor(message)}\n` +
        `👥 Membro: ${auditLogs.formatMember(message, target.userId, target.displayName || target.username || account.displayName || account.username)}\n` +
        `💰 Ação: ${operation === "set" ? "saldo definido" : operation === "add" ? "saldo adicionado" : "saldo removido"}\n` +
        `📊 Saldo: ${formatMoney(previousBalance)} → ${formatMoney(account.balance)}\n` +
        `↕️ Variação: ${change >= 0 ? "+" : ""}${formatMoney(change)}`);
    return {
        previousBalance,
        balance: account.balance,
        account,
        scope
    };
}

function createDailyProfits() {
    return DAILY_PROFIT_KEYS.reduce((profits, key) => {
        profits[key] = 0;
        return profits;
    }, {});
}

function ensureDailyProfitData(account) {
    if (!account.dailyProfitDate) account.dailyProfitDate = null;
    if (!account.dailyProfits || typeof account.dailyProfits !== "object" || Array.isArray(account.dailyProfits)) {
        account.dailyProfits = createDailyProfits();
    }
    for (const key of DAILY_PROFIT_KEYS) {
        if (!Number.isFinite(Number(account.dailyProfits[key]))) {
            account.dailyProfits[key] = 0;
        }
    }
}

function recordDailyProfit(account, key, amount) {
    ensureDailyProfitData(account);
    const today = getLocalDate();
    if (account.dailyProfitDate !== today) {
        account.dailyProfitDate = today;
        account.dailyProfits = createDailyProfits();
    }
    if (Object.prototype.hasOwnProperty.call(account.dailyProfits, key)) {
        account.dailyProfits[key] += Number(amount) || 0;
    }
}

function getDailyProfits(message) {
    const { account } = getAccount(message);
    ensureDailyProfitData(account);
    if (account.dailyProfitDate !== getLocalDate()) {
        return {
            date: getLocalDate(),
            profits: createDailyProfits(),
            total: 0
        };
    }
    const profits = { ...createDailyProfits(), ...account.dailyProfits };
    return {
        date: account.dailyProfitDate,
        profits,
        total: Object.values(profits).reduce((total, amount) => total + Number(amount || 0), 0)
    };
}

function findAccount(message, identifier) {
    const scope = getScope(message);
    if (!scope || identifier === null || identifier === undefined) {
        return null;
    }

    const normalized = String(identifier).trim().replace(/^@/, "").toLowerCase();
    if (!normalized) return null;

    const store = loadScope(scope);
    const account = Object.values(store.accounts).find(item => {
        if (!item || typeof item !== "object") return false;
        const matches = [item.userId, item.username, item.displayName]
            .filter(Boolean)
            .some(value => String(value).replace(/^@/, "").toLowerCase() === normalized);
        if (matches) return true;

        if (scope.platform === "whatsapp") {
            const identifierDigits = normalized.replace(/\D/g, "");
            return identifierDigits.length > 0 &&
                String(item.userId).replace(/\D/g, "") === identifierDigits;
        }

        return false;
    });

    return account || null;
}

function getRanking(message, order = "rich", limit = 5) {
    const scope = getScope(message);
    if (!scope) {
        throw new Error("A economia não está disponível em conversas privadas.");
    }

    const store = loadScope(scope);
    return Object.values(store.accounts)
        .filter(account => account && typeof account === "object")
        .sort((a, b) => {
            const getRankBalance = account => store.includeVaultInRanking
                ? getTotalBalance(account)
                : Number(account.balance) || 0;
            const difference = getRankBalance(b) - getRankBalance(a);
            return order === "poor" ? -difference : difference;
        })
        .slice(0, limit)
        .map(account => {
            const central = typeof centralAccounts.findByPlatform === "function"
                ? centralAccounts.findByPlatform(scope.platform, String(account.userId))
                : null;
            const platformAccount = central?.platformAccounts?.find(item =>
                item.platform === scope.platform && String(item.platformId) === String(account.userId)
            );

            return {
                userId: String(account.userId),
                username: account.username || platformAccount?.username || null,
                name: account.displayName || account.username || platformAccount?.displayName || platformAccount?.username || central?.name || "Usuário",
                balance: store.includeVaultInRanking
                    ? getTotalBalance(account)
                    : Number(account.balance) || 0,
                walletBalance: Number(account.balance) || 0,
                vaultBalance: Number(account.vaultBalance) || 0,
                includesVault: store.includeVaultInRanking
            };
        });
}

function canClaimDaily(message) {
    return getAccount(message).account.lastClaimDate !== getLocalDate();
}

function claimDaily(message) {
    const { account, scope } = getAccount(message);
    const today = getLocalDate();

    if (account.lastClaimDate === today) {
        return {
            claimed: false,
            amount: 0,
            balance: account.balance,
            scope
        };
    }

    account.balance += DAILY_REWARD;
    recordDailyProfit(account, "resgate", DAILY_REWARD);
    account.lastClaimDate = today;
    saveScope(scope, loadScope(scope));

    return {
        claimed: true,
        amount: DAILY_REWARD,
        balance: account.balance,
        scope
    };
}

function work(message, jobs, events) {
    const { account, scope } = getAccount(message);
    const today = getLocalDate();

    if (account.workDate !== today) {
        account.workDate = today;
        account.workCount = 0;
    }

    if (account.workCount >= MAX_WORKS_PER_DAY) {
        return {
            worked: false,
            remaining: 0,
            balance: account.balance,
            scope
        };
    }

    const availableJobs = jobs.filter(job => job.name !== account.lastJob);
    const job = pickRandom(availableJobs.length ? availableJobs : jobs);
    const roll = Math.random();
    let event = null;
    let outcome = "normal";
    let amount;

    if (roll < 0.20) {
        outcome = "bad";
        event = pickRandom(events.bad);
        amount = -randomInteger(2000, 8000);
    } else if (roll < 0.25) {
        outcome = "bonus";
        event = pickRandom(events.good);
        amount = randomInteger(10000, 20000);
    } else {
        amount = randomInteger(2000, 8000);
    }

    account.balance += amount;
    recordDailyProfit(account, "trabalho", amount);
    account.workCount += 1;
    account.lastJob = job.name;
    saveScope(scope, loadScope(scope));

    return {
        worked: true,
        job: job.name,
        description: job.description,
        event,
        outcome,
        amount,
        remaining: MAX_WORKS_PER_DAY - account.workCount,
        balance: account.balance,
        scope
    };
}

function canWork(message) {
    const { account } = getAccount(message);
    return account.workDate !== getLocalDate() || account.workCount < MAX_WORKS_PER_DAY;
}

function fish(message, events) {
    const { account, scope } = getAccount(message);
    const today = getLocalDate();

    if (account.fishingDate !== today) {
        account.fishingDate = today;
        account.fishingCount = 0;
    }

    if (account.fishingCount >= MAX_WORKS_PER_DAY) {
        return {
            fished: false,
            remaining: 0,
            balance: account.balance,
            scope
        };
    }

    const roll = Math.random();
    let type;
    let event;
    let amount;

    if (roll < 0.50) {
        type = Math.random() < 0.80 ? "normal" : "rare";
        amount = type === "rare" ? randomInteger(10000, 15000) : randomInteger(2000, 6000);
        event = pickRandom(events[type]);
    } else if (roll < 0.70) {
        type = "trash";
        amount = 0;
        event = pickRandom(events.trash);
    } else if (roll < 0.85) {
        type = "bad";
        amount = -randomInteger(2000, 6000);
        event = pickRandom(events.bad);
    } else {
        type = "good";
        amount = randomInteger(16000, 22000);
        event = pickRandom(events.good);
    }

    account.balance += amount;
    recordDailyProfit(account, "pesca", amount);
    account.fishingCount += 1;
    saveScope(scope, loadScope(scope));

    return {
        fished: true,
        type,
        event,
        amount,
        remaining: MAX_WORKS_PER_DAY - account.fishingCount,
        balance: account.balance,
        scope
    };
}

function canFish(message) {
    const { account } = getAccount(message);
    return account.fishingDate !== getLocalDate() || account.fishingCount < MAX_WORKS_PER_DAY;
}

function mine(message, events) {
    const { account, scope } = getAccount(message);
    const today = getLocalDate();

    if (account.miningDate !== today) {
        account.miningDate = today;
        account.miningCount = 0;
    }

    if (account.miningCount >= MAX_WORKS_PER_DAY) {
        return {
            mined: false,
            remaining: 0,
            balance: account.balance,
            scope
        };
    }

    const roll = Math.random();
    let type;
    let event;
    let amount;
    let mineral;

    if (roll < 0.50) {
        type = "common";
        amount = randomInteger(2000, 7000);
        mineral = pickRandom(events.minerals.common);
        event = pickRandom(events.common).replace("{mineral}", mineral);
    } else if (roll < 0.60) {
        type = "rare";
        amount = randomInteger(8000, 16000);
        mineral = pickRandom(events.minerals.rare);
        event = pickRandom(events.rare).replace("{mineral}", mineral);
    } else if (roll < 0.70) {
        type = "good";
        amount = randomInteger(9000, 18000);
        mineral = pickRandom(events.minerals.good);
        event = pickRandom(events.good).replace("{mineral}", mineral);
    } else {
        type = "bad";
        amount = -randomInteger(2000, 7000);
        event = pickRandom(events.bad);
    }

    account.balance += amount;
    recordDailyProfit(account, "mineracao", amount);
    account.miningCount += 1;
    saveScope(scope, loadScope(scope));

    return {
        mined: true,
        type,
        mineral,
        event,
        amount,
        remaining: MAX_WORKS_PER_DAY - account.miningCount,
        balance: account.balance,
        scope
    };
}

function canMine(message) {
    const { account } = getAccount(message);
    return account.miningDate !== getLocalDate() || account.miningCount < MAX_WORKS_PER_DAY;
}

function transfer(message, recipientId, amount) {
    const senderData = getAccount(message);
    const { scope, account: sender } = senderData;
    const today = getLocalDate();

    if (sender.transferDate !== today) {
        sender.transferDate = today;
        sender.transferCount = 0;
    }

    const result = {
        transferred: false,
        reason: null,
        amount,
        balance: sender.balance,
        remaining: Math.max(0, MAX_TRANSFERS_PER_DAY - sender.transferCount),
        scope
    };

    if (!Number.isInteger(amount) || amount < MIN_TRANSFER_AMOUNT) {
        result.reason = "invalid_amount";
        return result;
    }

    if (sender.transferCount >= MAX_TRANSFERS_PER_DAY) {
        result.reason = "limit";
        return result;
    }

    if (String(sender.userId) === String(recipientId)) {
        result.reason = "self";
        return result;
    }

    if (sender.balance < amount) {
        result.reason = "insufficient_balance";
        return result;
    }

    const store = loadScope(scope);
    const recipient = store.accounts[String(recipientId)];
    if (!recipient || typeof recipient !== "object") {
        result.reason = "recipient_not_found";
        return result;
    }

    sender.balance -= amount;
    recordDailyProfit(sender, "transferenciaEnviada", -amount);
    recipient.balance = Number(recipient.balance) || 0;
    recipient.balance += amount;
    recordDailyProfit(recipient, "transferenciaRecebida", amount);
    sender.transferCount += 1;
    saveScope(scope, store);

    return {
        ...result,
        transferred: true,
        balance: sender.balance,
        recipientBalance: recipient.balance,
        remaining: MAX_TRANSFERS_PER_DAY - sender.transferCount
    };
}

function canTransfer(message) {
    const { account } = getAccount(message);
    return account.transferDate !== getLocalDate() || account.transferCount < MAX_TRANSFERS_PER_DAY;
}

function rob(message, victimId) {
    const { account: thief, scope } = getAccount(message);
    const today = getLocalDate();
    const result = {
        robbed: false,
        outcome: null,
        amount: 0,
        balance: thief.balance,
        remaining: MAX_ROBBERIES_PER_DAY,
        scope
    };

    if (thief.robberyDate !== today) {
        thief.robberyDate = today;
        thief.robberyCount = 0;
        thief.robbedUserIds = [];
    }
    if (!Array.isArray(thief.robbedUserIds)) thief.robbedUserIds = [];
    result.remaining = Math.max(0, MAX_ROBBERIES_PER_DAY - thief.robberyCount);

    if (String(thief.userId) === String(victimId)) {
        result.outcome = "self";
        return result;
    }
    if (thief.robberyCount >= MAX_ROBBERIES_PER_DAY) {
        result.outcome = "limit";
        return result;
    }
    if (thief.robbedUserIds.includes(String(victimId))) {
        result.outcome = "already_targeted";
        return result;
    }

    const store = loadScope(scope);
    const victim = store.accounts[String(victimId)];
    if (!victim || typeof victim !== "object") {
        result.outcome = "victim_not_found";
        return result;
    }

    thief.robberyCount += 1;
    thief.robbedUserIds.push(String(victimId));
    result.remaining = MAX_ROBBERIES_PER_DAY - thief.robberyCount;

    if (Number(victim.shieldCharges) > 0) {
        victim.shieldCharges -= 1;
        result.outcome = "shield";
        result.shieldCharges = victim.shieldCharges;
        saveScope(scope, store);
        return result;
    }

    const vaultConfig = normalizeVaultConfig(store.vaultConfig);
    const targetsVault = vaultConfig.mode === "robbery" &&
        Math.random() * 100 < vaultConfig.robberyVaultChance;
    const targetBalanceField = targetsVault ? "vaultBalance" : "balance";
    victim[targetBalanceField] = Math.max(0, Number(victim[targetBalanceField]) || 0);
    result.source = targetsVault ? "vault" : "wallet";
    if (Number(victim[targetBalanceField]) < MIN_ROBBABLE_BALANCE) {
        result.outcome = "nothing";
        saveScope(scope, store);
        return result;
    }

    const wealthyVictim = Number(victim[targetBalanceField]) > 200000;
    const roll = Math.random() * 100;
    const partialChance = wealthyVictim ? 35 : 23.333333;
    const neutralChance = wealthyVictim ? 25 : 46.666667;
    const thiefLossChance = wealthyVictim ? 15 : 10;
    const totalChance = 10;
    let threshold = partialChance;

    if (roll < threshold) {
        const amount = randomInteger(MIN_ROBBABLE_BALANCE, Math.max(MIN_ROBBABLE_BALANCE, Math.floor(victim[targetBalanceField])));
        thief.balance += amount;
        victim[targetBalanceField] -= amount;
        recordDailyProfit(thief, "roubo", amount);
        recordDailyProfit(victim, "rouboSofrido", -amount);
        result.robbed = true;
        result.outcome = "partial";
        result.amount = amount;
    } else if (roll < (threshold += neutralChance)) {
        result.outcome = "failed";
    } else if (roll < (threshold += thiefLossChance)) {
        const amount = randomInteger(500, 1000);
        thief.balance -= amount;
        victim[targetBalanceField] += amount;
        recordDailyProfit(thief, "roubo", -amount);
        recordDailyProfit(victim, "rouboSofrido", amount);
        result.outcome = "caught";
        result.amount = amount;
    } else if (roll < (threshold += totalChance)) {
        const amount = Number(victim[targetBalanceField]);
        thief.balance += amount;
        victim[targetBalanceField] = 0;
        recordDailyProfit(thief, "roubo", amount);
        recordDailyProfit(victim, "rouboSofrido", -amount);
        result.robbed = true;
        result.outcome = "total";
        result.amount = amount;
    } else {
        const amount = randomInteger(5000, 15000);
        thief.balance -= amount;
        victim[targetBalanceField] += amount;
        recordDailyProfit(thief, "roubo", -amount);
        recordDailyProfit(victim, "rouboSofrido", amount);
        result.outcome = "lawsuit";
        result.amount = amount;
    }

    result.balance = thief.balance;
    saveScope(scope, store);
    return result;
}

function canRob(message) {
    const { account } = getAccount(message);
    return account.robberyDate !== getLocalDate() || account.robberyCount < MAX_ROBBERIES_PER_DAY;
}

function getStoreItems() {
    return STORE_ITEMS.map((item, index) => ({
        ...item,
        position: index + 1
    }));
}

function getCommunityStore(message) {
    const scope = getScope(message);
    if (!scope) return null;
    const store = loadScope(scope).communityStore;
    return {
        title: store.title,
        notice: store.notice,
        items: store.items.map(item => ({ ...item })),
        localSignalSearch: normalizeLocalSignalSearch(store.localSignalSearch)
    };
}

function getLocalSignalSearch(message) {
    const scope = getScope(message);
    if (!scope) return null;
    const store = loadScope(scope).communityStore;
    const config = normalizeLocalSignalSearch(store.localSignalSearch);
    const account = getAccountByUser(message);
    const progress = account ? getSignalSearchProgress(account, "local") : {
        pullsSinceRarity: {}
    };
    const marketItems = store.items.map(item => ({ ...item }));
    return {
        ...config,
        marketItems,
        botItems: getStoreItems().map(item => ({
            key: item.key,
            name: item.name,
            price: item.price,
            rarity: item.rarity,
            product: Boolean(item.product)
        })),
        backgrounds: Object.entries(profileCosmetics.PROFILE_BACKGROUNDS).map(([key, item]) => ({
            key,
            name: item.label,
            rarity: item.rarity,
            price: profileCosmetics.getProfileBackgroundPrice(key)
        })),
        outlines: Object.entries(profileCosmetics.PROFILE_OUTLINES).map(([key, item]) => ({
            key,
            name: item.label,
            rarity: item.rarity,
            price: profileCosmetics.getProfileOutlinePrice(key)
        })),
        pullsUntilGuarantee: Object.fromEntries(LOCAL_SIGNAL_RARITIES.map(rarity => {
            const guaranteeAfter = config.tiers[rarity].guaranteeAfter;
            const pullsSince = Number(progress.pullsSinceRarity?.[rarity]) || 0;
            return [rarity, guaranteeAfter ? Math.max(0, guaranteeAfter - pullsSince) : null];
        }))
    };
}

function updateLocalSignalSearch(message, updates) {
    const scope = getScope(message);
    if (!scope || !updates || typeof updates !== "object" || Array.isArray(updates)) return null;
    const store = loadScope(scope);
    const config = normalizeLocalSignalSearch(updates);
    if (!Number.isSafeInteger(updates.price) || updates.price <= 0 ||
        !updates.tiers || typeof updates.tiers !== "object" || Array.isArray(updates.tiers)) return null;
    const totalChance = LOCAL_SIGNAL_RARITIES.reduce((total, rarity) => {
        const tier = updates.tiers[rarity];
        if (!tier || !Number.isSafeInteger(tier.chance) || tier.chance < 0 || tier.chance > 100) return NaN;
        return total + tier.chance;
    }, 0);
    if (totalChance !== 100) return null;
    for (const rarity of LOCAL_SIGNAL_RARITIES) {
        const tier = config.tiers[rarity];
        const rawTier = updates.tiers[rarity];
        if (!Array.isArray(rawTier.botItems) || !Array.isArray(rawTier.marketItems) ||
            !Array.isArray(rawTier.backgrounds) || !Array.isArray(rawTier.outlines)) return null;
        if (tier.backgrounds.length !== rawTier.backgrounds.length ||
            tier.outlines.length !== rawTier.outlines.length) return null;
        if (rawTier.guaranteeAfter !== null && rawTier.guaranteeAfter !== undefined &&
            (!Number.isSafeInteger(rawTier.guaranteeAfter) || rawTier.guaranteeAfter < 1 || rawTier.guaranteeAfter > 10000)) return null;
        if (tier.chance === 0 && tier.guaranteeAfter !== null) return null;
        if ((tier.cashMin === null) !== (tier.cashMax === null)) return null;
        if (tier.cashMin !== null && (tier.cashMax < tier.cashMin || tier.cashMin < 0)) return null;
        if (tier.marketItems.some(id => !store.communityStore.items.some(item => item.id === id))) return null;
        if (tier.backgrounds.some(key => !profileCosmetics.PROFILE_BACKGROUNDS[key])) return null;
        if (tier.outlines.some(key => !profileCosmetics.PROFILE_OUTLINES[key])) return null;
        if (tier.chance > 0) {
            const hasCash = tier.cashMin !== null;
            const hasBotItem = tier.botItems.length > 0;
            const hasMarketItem = tier.marketItems.length > 0;
            const hasCosmetic = tier.backgrounds.length > 0 || tier.outlines.length > 0;
            if (!hasCash && !hasBotItem && !hasMarketItem && !hasCosmetic) return null;
        }
    }
    if (!Array.isArray(updates.featured) || updates.featured.length > 2) return null;
    const featuredKeys = new Set();
    for (const item of config.featured) {
        const key = item.type === "market" ? `market:${item.id}` : `${item.type}:${item.key}`;
        if (featuredKeys.has(key)) return null;
        featuredKeys.add(key);
        const exists = item.type === "bot"
            ? STORE_ITEMS.some(candidate => candidate.key === item.key)
            : item.type === "market"
                ? store.communityStore.items.some(candidate => candidate.id === item.id)
                : item.type === "background"
                    ? Boolean(profileCosmetics.normalizeProfileBackground(item.key))
                    : Boolean(profileCosmetics.normalizeProfileOutline(item.key));
        const configuredAsPrize = Object.values(config.tiers).some(tier => item.type === "bot"
            ? tier.botItems.includes(item.key)
            : item.type === "market"
                ? tier.marketItems.includes(item.id)
                : item.type === "background"
                    ? tier.backgrounds.includes(item.key)
                    : tier.outlines.includes(item.key));
        if (!exists || !configuredAsPrize) return null;
    }
    if (config.featured.length !== updates.featured.length) return null;
    config.enabled = updates.enabled === true;
    const previousConfig = normalizeLocalSignalSearch(store.communityStore.localSignalSearch);
    store.communityStore.localSignalSearch = config;
    saveScope(scope, loadScope(scope));
    recordAuditLog(message, "signals",
        `${auditLogs.describeActor(message)} atualizou a loja de sinais local. Alterações: ${describeSignalChanges(previousConfig, config)}.`);
    return getLocalSignalSearch(message);
}

function updateLocalSignalSearchDraft(message, updates) {
    const scope = getScope(message);
    if (!scope || !updates || typeof updates !== "object" || Array.isArray(updates)) return null;
    const store = loadScope(scope);
    if (!Number.isSafeInteger(updates.price) || updates.price <= 0 ||
        typeof updates.enabled !== "boolean" ||
        !updates.tiers || typeof updates.tiers !== "object" || Array.isArray(updates.tiers) ||
        !Array.isArray(updates.featured)) return null;

    const tierKeys = new Set(LOCAL_SIGNAL_RARITIES);
    if (Object.keys(updates.tiers).length !== tierKeys.size ||
        Object.keys(updates.tiers).some(rarity => !tierKeys.has(rarity))) return null;
    const validMarketIds = new Set(store.communityStore.items.map(item => item.id));
    for (const rarity of LOCAL_SIGNAL_RARITIES) {
        const tier = updates.tiers[rarity];
        if (!tier || typeof tier !== "object" || Array.isArray(tier) ||
            !Number.isSafeInteger(tier.chance) || tier.chance < 0 || tier.chance > 100 ||
            !(tier.guaranteeAfter === null || tier.guaranteeAfter === undefined ||
                Number.isSafeInteger(tier.guaranteeAfter) && tier.guaranteeAfter >= 1 && tier.guaranteeAfter <= 10000) ||
            ![tier.botItems, tier.marketItems, tier.backgrounds, tier.outlines].every(Array.isArray) ||
            ![tier.botItems, tier.marketItems, tier.backgrounds, tier.outlines].every(items => new Set(items).size === items.length) ||
            !(tier.cashMin === null && tier.cashMax === null ||
                Number.isSafeInteger(tier.cashMin) && tier.cashMin >= 0 &&
                Number.isSafeInteger(tier.cashMax) && tier.cashMax >= tier.cashMin) ||
            tier.botItems.some(key => !STORE_ITEMS.some(item => item.key === key)) ||
            tier.marketItems.some(id => !validMarketIds.has(id)) ||
            tier.backgrounds.some(key => !profileCosmetics.PROFILE_BACKGROUNDS[key]) ||
            tier.outlines.some(key => !profileCosmetics.PROFILE_OUTLINES[key]) ||
            tier.chance === 0 && tier.guaranteeAfter !== null && tier.guaranteeAfter !== undefined) return null;
    }

    if (updates.featured.length > 2) return null;
    const featuredKeys = new Set();
    for (const item of updates.featured) {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const key = item.type === "market" && Number.isSafeInteger(item.id)
            ? `market:${item.id}`
            : ["bot", "background", "outline"].includes(item.type) && typeof item.key === "string"
                ? `${item.type}:${item.key}`
                : null;
        if (!key || featuredKeys.has(key)) return null;
        featuredKeys.add(key);
        const exists = item.type === "bot"
            ? STORE_ITEMS.some(candidate => candidate.key === item.key)
            : item.type === "market"
                ? validMarketIds.has(item.id)
                : item.type === "background"
                    ? Boolean(profileCosmetics.normalizeProfileBackground(item.key))
                    : Boolean(profileCosmetics.normalizeProfileOutline(item.key));
        const configuredAsPrize = Object.values(updates.tiers).some(tier => item.type === "bot"
            ? tier.botItems.includes(item.key)
            : item.type === "market"
                ? tier.marketItems.includes(item.id)
                : item.type === "background"
                    ? tier.backgrounds.includes(item.key)
                    : tier.outlines.includes(item.key));
        if (!exists || !configuredAsPrize) return null;
    }

    const config = normalizeLocalSignalSearch(updates);
    config.enabled = updates.enabled === true;
    if (config.enabled) return updateLocalSignalSearch(message, config);
    const previousConfig = normalizeLocalSignalSearch(store.communityStore.localSignalSearch);
    store.communityStore.localSignalSearch = config;
    saveScope(scope, store);
    recordAuditLog(message, "signals",
        `${auditLogs.describeActor(message)} atualizou a loja de sinais local. Alterações: ${describeSignalChanges(previousConfig, config)}.`);
    return getLocalSignalSearch(message);
}

function describeSignalChanges(previous, current) {
    const changes = [];
    if (previous.enabled !== current.enabled) changes.push(`status: ${previous.enabled ? "ativado" : "desativado"} → ${current.enabled ? "ativado" : "desativado"}`);
    if (previous.price !== current.price) changes.push(`preço: ${formatMoney(previous.price)} → ${formatMoney(current.price)}`);
    for (const rarity of LOCAL_SIGNAL_RARITIES) {
        if (JSON.stringify(previous.tiers[rarity]) !== JSON.stringify(current.tiers[rarity])) {
            changes.push(`nível ${rarity}: ${JSON.stringify(previous.tiers[rarity])} → ${JSON.stringify(current.tiers[rarity])}`);
        }
    }
    if (JSON.stringify(previous.featured) !== JSON.stringify(current.featured)) {
        changes.push(`destaques: ${JSON.stringify(previous.featured)} → ${JSON.stringify(current.featured)}`);
    }
    return changes.length ? changes.join("; ").slice(0, 3000) : "configuração salva sem diferenças detectáveis";
}

function setCommunityStoreText(message, field, value) {
    if (!["title", "notice"].includes(field) || typeof value !== "string" || !value.trim()) {
        return false;
    }
    const scope = getScope(message);
    if (!scope) return false;
    const data = loadScope(scope);
    const previousValue = data.communityStore[field];
    data.communityStore[field] = value.trim();
    saveScope(scope, data);
    recordAuditLog(message, "store",
        `${auditLogs.describeActor(message)} editou ${field === "title" ? "o título" : "o aviso"} da loja local: ` +
        `${JSON.stringify(previousValue)} → ${JSON.stringify(data.communityStore[field])}.`);
    return true;
}

function updateCommunityStoreDetails(message, title, notice) {
    if (typeof title !== "string" || !title.trim() ||
        typeof notice !== "string" || !notice.trim()) return false;
    const scope = getScope(message);
    if (!scope) return false;
    const data = loadScope(scope);
    const previousTitle = data.communityStore.title;
    const previousNotice = data.communityStore.notice;
    data.communityStore.title = title.trim();
    data.communityStore.notice = notice.trim();
    saveScope(scope, data);
    recordAuditLog(message, "store",
        `${auditLogs.describeActor(message)} editou os detalhes da loja local: título ${JSON.stringify(previousTitle)} → ${JSON.stringify(data.communityStore.title)}; ` +
        `aviso ${JSON.stringify(previousNotice)} → ${JSON.stringify(data.communityStore.notice)}.`);
    return true;
}

function addCommunityStoreItem(message, item) {
    const scope = getScope(message);
    if (!scope || !item || typeof item.name !== "string" || !item.name.trim() ||
        typeof item.category !== "string" || !item.category.trim() ||
        !Number.isSafeInteger(item.price) || item.price < 0 ||
        !(item.quantity === null || (Number.isSafeInteger(item.quantity) && item.quantity >= 0))) {
        return null;
    }
    if (item.rarity !== undefined && item.rarity !== null &&
        normalizeItemRarity(item.rarity) !== item.rarity) return null;
    const data = loadScope(scope);
    const store = data.communityStore;
    const newItem = {
        id: store.nextItemId++,
        name: item.name.trim(),
        category: item.category.trim(),
        price: item.price,
        quantity: item.quantity,
        rarity: normalizeItemRarity(item.rarity)
    };
    store.items.push(newItem);
    saveScope(scope, data);
    recordAuditLog(message, "store",
        `${auditLogs.describeActor(message)} criou o item #${newItem.id} "${newItem.name}" na loja local: ` +
        `${formatMoney(newItem.price)}, categoria ${newItem.category}, estoque ${formatAuditValue(newItem.quantity)}, importância ${formatAuditValue(newItem.rarity)}.`);
    return { ...newItem };
}

function editCommunityStoreItem(message, itemId, field, value) {
    const scope = getScope(message);
    if (!scope) return null;
    const data = loadScope(scope);
    const item = data.communityStore.items.find(candidate => candidate.id === Number(itemId));
    if (!item) return null;

    const previousValue = item[field];
    if (field === "name" || field === "category") {
        if (typeof value !== "string" || !value.trim()) return null;
        item[field] = value.trim();
    } else if (field === "price") {
        if (!Number.isSafeInteger(value) || value < 0) return null;
        item.price = value;
    } else if (field === "quantity") {
        if (!(value === null || (Number.isSafeInteger(value) && value >= 0))) return null;
        item.quantity = value;
    } else if (field === "rarity") {
        if (!(value === null || normalizeItemRarity(value) === value)) return null;
        item.rarity = value;
    } else {
        return null;
    }
    saveScope(scope, data);
    recordAuditLog(message, "store",
        `${auditLogs.describeActor(message)} editou o item #${item.id} "${item.name}" na loja local: ` +
        `${field} ${formatAuditValue(previousValue)} → ${formatAuditValue(item[field])}.`);
    return { ...item };
}

function updateCommunityStoreItem(message, itemId, updates) {
    const scope = getScope(message);
    if (!scope || !updates || typeof updates !== "object" || Array.isArray(updates)) return null;
    if (updates.rarity !== undefined && updates.rarity !== null &&
        normalizeItemRarity(updates.rarity) !== updates.rarity) return null;
    const data = loadScope(scope);
    const item = data.communityStore.items.find(candidate => candidate.id === Number(itemId));
    if (!item) return null;
    const previousItem = { ...item };

    const updatedItem = {
        name: updates.name,
        category: updates.category,
        price: updates.price,
        quantity: updates.quantity,
        rarity: updates.rarity === undefined ? item.rarity ?? null : normalizeItemRarity(updates.rarity)
    };
    if (typeof updatedItem.name !== "string" || !updatedItem.name.trim() ||
        typeof updatedItem.category !== "string" || !updatedItem.category.trim() ||
        !Number.isSafeInteger(updatedItem.price) || updatedItem.price < 0 ||
        !(updatedItem.quantity === null ||
            (Number.isSafeInteger(updatedItem.quantity) && updatedItem.quantity >= 0)) ||
        !(updatedItem.rarity === null || normalizeItemRarity(updatedItem.rarity) === updatedItem.rarity)) {
        return null;
    }

    Object.assign(item, {
        name: updatedItem.name.trim(),
        category: updatedItem.category.trim(),
        price: updatedItem.price,
        quantity: updatedItem.quantity,
        rarity: updatedItem.rarity
    });
    saveScope(scope, data);
    const changes = Object.keys(updatedItem)
        .filter(field => previousItem[field] !== item[field])
        .map(field => `${field}: ${formatAuditValue(previousItem[field])} → ${formatAuditValue(item[field])}`);
    recordAuditLog(message, "store",
        `${auditLogs.describeActor(message)} editou o item #${item.id} "${item.name}" na loja local: ` +
        `${changes.length ? changes.join("; ") : "nenhum campo foi alterado"}.`);
    return { ...item };
}

function removeCommunityStoreItem(message, itemId) {
    const scope = getScope(message);
    if (!scope) return null;
    const data = loadScope(scope);
    const index = data.communityStore.items.findIndex(item => item.id === Number(itemId));
    if (index === -1) return null;
    const [removed] = data.communityStore.items.splice(index, 1);
    const config = normalizeLocalSignalSearch(data.communityStore.localSignalSearch);
    for (const tier of Object.values(config.tiers)) {
        tier.marketItems = tier.marketItems.filter(id => id !== removed.id);
    }
    config.featured = config.featured.filter(item => item.type !== "market" || item.id !== removed.id);
    data.communityStore.localSignalSearch = config;
    saveScope(scope, data);
    recordAuditLog(message, "store",
        `${auditLogs.describeActor(message)} excluiu o item #${removed.id} "${removed.name}" da loja local.`);
    return { ...removed };
}

function buyCommunityStoreItem(message, selection) {
    const scope = getScope(message);
    if (!scope) return { purchased: false, reason: "invalid_scope" };
    const store = loadScope(scope);
    const value = String(selection || "").trim();
    const item = store.communityStore.items.find(candidate =>
        String(candidate.id) === value ||
        candidate.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase() ===
            value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase()
    );
    if (!item) return { purchased: false, reason: "not_found" };
    if (item.quantity === 0) return { purchased: false, reason: "out_of_stock", item: { ...item } };

    const { account } = getAccount(message);
    if (account.balance < item.price) {
        return { purchased: false, reason: "insufficient_balance", item: { ...item }, balance: account.balance };
    }

    account.balance -= item.price;
    recordDailyProfit(account, "loja", -item.price);
    if (item.quantity !== null) item.quantity -= 1;
    const order = {
        id: store.communityStore.nextOrderId++,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        price: item.price,
        userId: String(message.userId),
        displayName: message.displayName || message.username || String(message.userId),
        status: "pending",
        createdAt: Date.now()
    };
    store.communityStore.orders.push(order);
    saveScope(scope, store);
    return {
        purchased: true,
        item: { ...item },
        order: { ...order },
        balance: account.balance,
        scope
    };
}

function getCommunityStoreOrders(message, status = null) {
    const scope = getScope(message);
    if (!scope) return null;
    return loadScope(scope).communityStore.orders
        .filter(order => !status || order.status === status)
        .map(order => ({ ...order }));
}

function updateCommunityStoreOrder(message, orderId, status) {
    const scope = getScope(message);
    if (!scope || !["delivered", "cancelled"].includes(status)) return null;
    const data = loadScope(scope);
    const communityStore = data.communityStore;
    const order = communityStore.orders.find(candidate =>
        Number(candidate.id) === Number(orderId) && candidate.status === "pending"
    );
    if (!order) return null;

    const account = data.accounts[String(order.userId)];
    if (!account) {
        throw new Error(`A carteira do comprador do pedido ${order.id} não foi encontrada.`);
    }
    if (status === "cancelled") {
        account.balance += order.price;
        recordDailyProfit(account, "loja", order.price);
        const item = communityStore.items.find(candidate => candidate.id === order.itemId);
        if (item && item.quantity !== null) item.quantity += 1;
    }
    order.status = status;
    order.resolvedAt = Date.now();
    order.resolvedBy = String(message.userId);
    saveScope(scope, data);
    return {
        ...order,
        balance: account.balance
    };
}

function buyStoreItem(message, selection) {
    const { account, scope } = getAccount(message);
    const item = resolveStoreItem(selection);
    const result = {
        purchased: false,
        reason: null,
        item,
        balance: account.balance,
        scope
    };

    if (!item) {
        result.reason = "invalid_item";
        return result;
    }

    if (item.key === "shield") {
        if (Number(account.shieldCharges) > 0) {
            result.reason = "shield_active";
            return result;
        }
        if (account.balance < MIN_SHIELD_BALANCE) {
            result.reason = "shield_min_balance";
            return result;
        }
        if (account.balance < item.price) {
            result.reason = "insufficient_balance";
            return result;
        }
        account.balance -= item.price;
        recordDailyProfit(account, "loja", -item.price);
        account.shieldCharges = SHIELD_DURABILITY;
        saveScope(scope, loadScope(scope));
        return {
            ...result,
            purchased: true,
            activatesReset: false,
            balance: account.balance,
            shieldCharges: account.shieldCharges
        };
    }

    const today = getLocalDate();
    const isAtLimit = (storeItem) =>
        account[storeItem.date] === today && account[storeItem.count] >= storeItem.max;

    if (item.key === "all") {
        const resettableItems = STORE_ITEMS.filter(storeItem => ["work", "fishing", "mining", "robbery"].includes(storeItem.key));
        if (!resettableItems.every(isAtLimit)) {
            result.reason = "all_not_ready";
            return result;
        }
    } else if (!isAtLimit(item)) {
        result.reason = "not_ready";
        return result;
    }

    if (account.balance < item.price) {
        result.reason = "insufficient_balance";
        return result;
    }

    const itemsToReset = item.key === "all"
        ? STORE_ITEMS.filter(storeItem => !storeItem.product && storeItem.key !== "all")
        : [item];

    for (const storeItem of itemsToReset) {
        account[storeItem.date] = today;
        account[storeItem.count] = 0;
    }
    account.balance -= item.price;
    recordDailyProfit(account, "loja", -item.price);
    saveScope(scope, loadScope(scope));

    return {
        ...result,
        purchased: true,
        balance: account.balance
    };
}

function resolveStoreItem(selection) {
    const value = String(selection || "").trim().toLocaleLowerCase();
    if (!value) return null;

    const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const position = Number(normalized);
    if (Number.isInteger(position) && position >= 1 && position <= STORE_ITEMS.length) {
        return STORE_ITEMS[position - 1];
    }

    return STORE_ITEMS.find(item =>
        item.key === normalized ||
        item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized ||
        item.aliases.some(alias => alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized)
    ) || null;
}

function getSignalSearchProgress(account, level) {
    const stored = account.signalSearch && typeof account.signalSearch === "object"
        ? account.signalSearch
        : {};
    const levelState = stored[level] && typeof stored[level] === "object" ? stored[level] : {};
    return {
        totalPulls: Number.isSafeInteger(levelState.totalPulls) && levelState.totalPulls >= 0
            ? levelState.totalPulls
            : 0,
        pullsSinceEpic: Number.isSafeInteger(levelState.pullsSinceEpic) && levelState.pullsSinceEpic >= 0
            ? levelState.pullsSinceEpic
            : 0,
        pullsSinceWorkReset: Number.isSafeInteger(levelState.pullsSinceWorkReset) && levelState.pullsSinceWorkReset >= 0
            ? levelState.pullsSinceWorkReset
            : 0,
        pullsSinceRarity: Object.fromEntries(LOCAL_SIGNAL_RARITIES.map(rarity => [
            rarity,
            Number.isSafeInteger(levelState.pullsSinceRarity?.[rarity]) && levelState.pullsSinceRarity[rarity] >= 0
                ? levelState.pullsSinceRarity[rarity]
                : 0
        ]))
    };
}

function getSignalSearchState(message, userId = message?.userId) {
    const account = getAccountByUser(message, userId);
    const levels = Object.fromEntries(Object.entries(SIGNAL_SEARCH_LEVELS).map(([key, config]) => {
        const progress = account ? getSignalSearchProgress(account, key) : {
            totalPulls: 0,
            pullsSinceEpic: 0,
            pullsSinceWorkReset: 0
        };
        return [key, {
            label: config.label,
            price: config.price,
            pullsUntilEpic: Math.max(0, 10 - progress.pullsSinceEpic),
            pullsUntilWorkReset: key === "recruta"
                ? Math.max(0, 5 - progress.pullsSinceWorkReset)
                : null
        }];
    }));
    return { levels, balance: Number(account?.balance) || 0 };
}

function canApplyStoreReset(account, item, today) {
    const isAtLimit = storeItem =>
        account[storeItem.date] === today &&
        Number(account[storeItem.count]) >= storeItem.max;
    if (item.key === "all") {
        return STORE_ITEMS
            .filter(storeItem => ["work", "fishing", "mining", "robbery"].includes(storeItem.key))
            .every(isAtLimit);
    }
    return Boolean(item.date && item.count && item.max && isAtLimit(item));
}

function applyStoreReset(account, item, today) {
    const itemsToReset = item.key === "all"
        ? STORE_ITEMS.filter(storeItem => !storeItem.product && storeItem.key !== "all")
        : [item];
    for (const storeItem of itemsToReset) {
        account[storeItem.date] = today;
        account[storeItem.count] = 0;
    }
}

function getSignalSearchEpicItems(level) {
    const resetItems = STORE_ITEMS.filter(item => item.rarity === itemRarity.EPIC && !item.product)
        .map(item => ({ type: "reset", item, rarity: item.rarity }));
    if (level === "recruta") return resetItems;
    const cosmetics = [
        ...Object.entries(profileCosmetics.PROFILE_BACKGROUNDS)
            .filter(([, item]) => item.rarity === itemRarity.EPIC)
            .map(([key, item]) => ({ type: "cosmetic", cosmeticType: "background", key, item, rarity: item.rarity })),
        ...Object.entries(profileCosmetics.PROFILE_OUTLINES)
            .filter(([, item]) => item.rarity === itemRarity.EPIC)
            .map(([key, item]) => ({ type: "cosmetic", cosmeticType: "outline", key, item, rarity: item.rarity }))
    ];
    return [...resetItems, ...cosmetics];
}

function chooseSignalSearchReward(level, config, guarantee) {
    if (guarantee === "epic") {
        const epicItems = getSignalSearchEpicItems(level);
        if (!epicItems.length) throw new Error(`Nenhum prêmio épico configurado para a busca ${level}.`);
        return { ...pickRandom(epicItems), guarantee };
    }
    if (guarantee === "work") {
        const workReset = STORE_ITEMS.find(item => item.key === "work");
        return { type: "reset", item: workReset, rarity: workReset.rarity, guarantee };
    }

    const roll = Math.random() * 100;
    if (roll < config.weights.money) {
        return {
            type: "money",
            amount: randomInteger(config.cashMin, config.cashMax),
            rarity: itemRarity.COMMON
        };
    }
    let remainingWeight = config.weights.money;
    if (config.weights.reset && roll < (remainingWeight += config.weights.reset)) {
        const resetItems = STORE_ITEMS.filter(item => !item.product && item.key !== "all" && item.key !== "shield");
        const item = pickRandom(resetItems);
        return { type: "reset", item, rarity: item.rarity };
    }
    if (config.weights.cosmetic) {
        const cosmeticItems = [
            ...Object.entries(profileCosmetics.PROFILE_BACKGROUNDS)
                .map(([key, item]) => ({ type: "cosmetic", cosmeticType: "background", key, item, rarity: item.rarity })),
            ...Object.entries(profileCosmetics.PROFILE_OUTLINES)
                .map(([key, item]) => ({ type: "cosmetic", cosmeticType: "outline", key, item, rarity: item.rarity }))
        ];
        return pickRandom(cosmeticItems);
    }
    throw new Error(`A tabela de prêmios da busca ${level} está inválida.`);
}

function grantSignalCosmetic(account, prize) {
    const field = prize.cosmeticType === "outline" ? "outlines" : "backgrounds";
    const normalizer = prize.cosmeticType === "outline"
        ? profileCosmetics.normalizeProfileOutline
        : profileCosmetics.normalizeProfileBackground;
    const current = account.cosmetics && typeof account.cosmetics === "object" ? account.cosmetics : {};
    const owned = Array.isArray(current[field]) ? current[field].map(normalizer).filter(Boolean) : [];
    if (owned.includes(prize.key)) return false;
    account.cosmetics = { ...current, [field]: [...new Set([...owned, prize.key])] };
    return true;
}

function awardSignalSearchPrize(account, prize, today) {
    if (prize.type === "money") {
        account.balance += prize.amount;
        recordDailyProfit(account, "busca", prize.amount);
        return { type: "money", name: "Prêmio em SatCoins", amount: prize.amount, rarity: prize.rarity, isNew: false };
    }
    if (prize.type === "reset") {
        if (!canApplyStoreReset(account, prize.item, today)) {
            const amount = Math.floor(prize.item.price / 2);
            account.balance += amount;
            recordDailyProfit(account, "busca", amount);
            return {
                type: "money",
                name: prize.item.name,
                amount,
                rarity: prize.rarity,
                isNew: false,
                converted: true,
                guarantee: prize.guarantee || null
            };
        }
        applyStoreReset(account, prize.item, today);
        return {
            type: "reset",
            name: prize.item.name,
            itemKey: prize.item.key,
            rarity: prize.rarity,
            isNew: true,
            guarantee: prize.guarantee || null
        };
    }
    if (prize.type === "cosmetic") {
        if (!grantSignalCosmetic(account, prize)) {
            const storePrice = prize.cosmeticType === "outline"
                ? profileCosmetics.getProfileOutlinePrice(prize.key)
                : profileCosmetics.getProfileBackgroundPrice(prize.key);
            const amount = Math.floor(storePrice / 2);
            account.balance += amount;
            recordDailyProfit(account, "busca", amount);
            return {
                type: "money",
                name: `${prize.item.label} (duplicado)`,
                amount,
                rarity: prize.rarity,
                isNew: false,
                converted: true
            };
        }
        return {
            type: "cosmetic",
            name: `${prize.cosmeticType === "outline" ? "Outline" : "Fundo"} ${prize.item.label}`,
            cosmeticType: prize.cosmeticType,
            cosmeticKey: prize.key,
            rarity: prize.rarity,
            isNew: true
        };
    }
    throw new Error("Tipo de prêmio da busca inválido.");
}

function searchSignals(message, level, quantity = 1) {
    const config = SIGNAL_SEARCH_LEVELS[level];
    if (!config) return { searched: false, reason: "invalid-level" };
    if (quantity !== 1 && quantity !== 10) return { searched: false, reason: "invalid-quantity" };
    const { account, scope } = getAccount(message);
    const totalPrice = config.price * quantity;
    if (!Number.isSafeInteger(totalPrice) || account.balance < totalPrice) {
        return {
            searched: false,
            reason: "insufficient-balance",
            price: totalPrice,
            balance: account.balance,
            scope
        };
    }

    const today = getLocalDate();
    account.balance -= totalPrice;
    recordDailyProfit(account, "busca", -totalPrice);
    const rewards = [];
    for (let index = 0; index < quantity; index++) {
        const progress = getSignalSearchProgress(account, level);
        const epicDue = progress.pullsSinceEpic + 1 >= 10;
        const workDue = level === "recruta" && progress.pullsSinceWorkReset + 1 >= 5;
        const prize = chooseSignalSearchReward(level, config, epicDue ? "epic" : workDue ? "work" : null);
        const reward = awardSignalSearchPrize(account, prize, today);
        reward.guarantee = prize.guarantee || null;
        rewards.push(reward);

        const updatedProgress = getSignalSearchProgress(account, level);
        updatedProgress.totalPulls += 1;
        updatedProgress.pullsSinceEpic = prize.rarity === itemRarity.EPIC ? 0 : progress.pullsSinceEpic + 1;
        updatedProgress.pullsSinceWorkReset = prize.guarantee === "work" || prize.item?.key === "work" || prize.item?.key === "all"
            ? 0
            : progress.pullsSinceWorkReset + 1;
        account.signalSearch = {
            ...(account.signalSearch && typeof account.signalSearch === "object" ? account.signalSearch : {}),
            [level]: updatedProgress
        };
    }
    saveScope(scope, loadScope(scope));
    return {
        searched: true,
        level,
        quantity,
        price: totalPrice,
        rewards,
        balance: account.balance,
        state: getSignalSearchState(message),
        scope
    };
}

function getLocalSignalTierPrizes(config, tier, store) {
    const prizes = [];
    if (tier.cashMin !== null && tier.cashMax !== null) {
        prizes.push({ type: "money", min: tier.cashMin, max: tier.cashMax });
    }
    for (const key of tier.botItems) {
        const item = STORE_ITEMS.find(candidate => candidate.key === key);
        if (item) prizes.push({ type: "bot", item });
    }
    for (const id of tier.marketItems) {
        const item = store.communityStore.items.find(candidate => candidate.id === id);
        if (item && item.quantity !== 0) prizes.push({ type: "market", item });
    }
    for (const key of tier.backgrounds) {
        const item = profileCosmetics.PROFILE_BACKGROUNDS[key];
        if (item) prizes.push({ type: "cosmetic", cosmeticType: "background", key, item, rarity: item.rarity });
    }
    for (const key of tier.outlines) {
        const item = profileCosmetics.PROFILE_OUTLINES[key];
        if (item) prizes.push({ type: "cosmetic", cosmeticType: "outline", key, item, rarity: item.rarity });
    }
    return prizes;
}

function chooseLocalSignalRarity(config, progress) {
    const dueRarity = [...LOCAL_SIGNAL_RARITIES].reverse().find(rarity => {
        const tier = config.tiers[rarity];
        return tier.chance > 0 && tier.guaranteeAfter &&
            progress.pullsSinceRarity[rarity] + 1 >= tier.guaranteeAfter;
    });
    if (dueRarity) return { rarity: dueRarity, guarantee: true };
    const roll = Math.random() * 100;
    let cumulativeChance = 0;
    for (const rarity of LOCAL_SIGNAL_RARITIES) {
        cumulativeChance += config.tiers[rarity].chance;
        if (roll < cumulativeChance) return { rarity, guarantee: false };
    }
    throw new Error("As probabilidades da Busca Local estão inválidas.");
}

function awardLocalSignalPrize(account, prize, rarity, guarantee, today, store) {
    if (prize.type === "money") {
        const amount = randomInteger(prize.min, prize.max);
        account.balance += amount;
        recordDailyProfit(account, "busca", amount);
        return {
            type: "money",
            name: "Prêmio em SatCoins",
            amount,
            rarity,
            guarantee: guarantee ? rarity : null,
            isNew: rarity === itemRarity.EPIC || rarity === itemRarity.LEGENDARY
        };
    }
    if (prize.type === "bot") {
        const item = prize.item;
        if (item.key === "shield") {
            if (Number(account.shieldCharges) > 0) {
                const amount = Math.floor(item.price / 2);
                account.balance += amount;
                recordDailyProfit(account, "busca", amount);
                return {
                    type: "money",
                    name: `${item.name} (convertido)`,
                    amount,
                    rarity,
                    guarantee: guarantee ? rarity : null,
                    converted: true,
                    isNew: false
                };
            }
            account.shieldCharges = SHIELD_DURABILITY;
            return {
                type: "reset",
                name: item.name,
                itemKey: item.key,
                rarity,
                guarantee: guarantee ? rarity : null,
                isNew: true
            };
        }
        if (!canApplyStoreReset(account, item, today)) {
            const amount = Math.floor(item.price / 2);
            account.balance += amount;
            recordDailyProfit(account, "busca", amount);
            return {
                type: "money",
                name: `${item.name} (convertido)`,
                amount,
                rarity,
                guarantee: guarantee ? rarity : null,
                converted: true,
                isNew: false
            };
        }
        applyStoreReset(account, item, today);
        return {
            type: "reset",
            name: item.name,
            itemKey: item.key,
            rarity,
            guarantee: guarantee ? rarity : null,
            isNew: true
        };
    }
    if (prize.type === "market") {
        const item = store.communityStore.items.find(candidate => candidate.id === prize.item.id);
        if (!item || item.quantity === 0) {
            throw new Error("Um prêmio do Mercado Local acabou de ficar indisponível. Tente a busca novamente.");
        }
        if (item.quantity !== null) item.quantity -= 1;
        const order = {
            id: store.communityStore.nextOrderId++,
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            price: 0,
            userId: String(account.userId),
            displayName: account.displayName || account.username || String(account.userId),
            status: "pending",
            createdAt: Date.now(),
            source: "local-signal-search"
        };
        store.communityStore.orders.push(order);
        return {
            type: "market",
            name: item.name,
            itemId: item.id,
            category: item.category,
            orderId: order.id,
            rarity,
            guarantee: guarantee ? rarity : null,
            isNew: true
        };
    }
    if (prize.type === "cosmetic") {
        if (!grantSignalCosmetic(account, prize)) {
            const price = prize.cosmeticType === "outline"
                ? profileCosmetics.getProfileOutlinePrice(prize.key)
                : profileCosmetics.getProfileBackgroundPrice(prize.key);
            const amount = Math.floor(price / 2);
            account.balance += amount;
            recordDailyProfit(account, "busca", amount);
            return {
                type: "money",
                name: `${prize.cosmeticType === "outline" ? "Outline" : "Fundo"} ${prize.item.label} (duplicado)`,
                amount,
                rarity,
                guarantee: guarantee ? rarity : null,
                converted: true,
                isNew: false
            };
        }
        return {
            type: "cosmetic",
            name: `${prize.cosmeticType === "outline" ? "Outline" : "Fundo"} ${prize.item.label}`,
            cosmeticType: prize.cosmeticType,
            cosmeticKey: prize.key,
            rarity,
            guarantee: guarantee ? rarity : null,
            isNew: true
        };
    }
    throw new Error("Tipo de prêmio da Busca Local inválido.");
}

function searchLocalSignals(message, quantity = 1) {
    if (quantity !== 1 && quantity !== 10) return { searched: false, reason: "invalid-quantity" };
    const { scope } = getAccount(message);
    const store = loadScope(scope);
    const config = normalizeLocalSignalSearch(store.communityStore.localSignalSearch);
    if (!config.enabled) return { searched: false, reason: "disabled" };
    const totalPrice = config.price * quantity;
    const accountId = String(message.userId);
    const currentAccount = store.accounts[accountId];
    if (!currentAccount) return { searched: false, reason: "missing-account" };
    if (!Number.isSafeInteger(totalPrice) || currentAccount.balance < totalPrice) {
        return {
            searched: false,
            reason: "insufficient-balance",
            price: totalPrice,
            balance: currentAccount.balance,
            scope
        };
    }
    if (LOCAL_SIGNAL_RARITIES.some(rarity => config.tiers[rarity].chance > 0 &&
        !getLocalSignalTierPrizes(config, config.tiers[rarity], store).length)) {
        return { searched: false, reason: "unavailable-prizes", scope };
    }

    const workingStore = JSON.parse(JSON.stringify(store));
    const account = workingStore.accounts[accountId];
    account.balance -= totalPrice;
    recordDailyProfit(account, "busca", -totalPrice);
    const today = getLocalDate();
    const rewards = [];
    let progress = getSignalSearchProgress(account, "local");
    for (let index = 0; index < quantity; index++) {
        const { rarity, guarantee } = chooseLocalSignalRarity(config, progress);
        const prizes = getLocalSignalTierPrizes(config, config.tiers[rarity], workingStore);
        if (!prizes.length) return { searched: false, reason: "unavailable-prizes", scope };
        const prize = pickRandom(prizes);
        const reward = awardLocalSignalPrize(account, prize, rarity, guarantee, today, workingStore);
        rewards.push(reward);
        progress.totalPulls += 1;
        progress.pullsSinceRarity = Object.fromEntries(LOCAL_SIGNAL_RARITIES.map(candidate => [
            candidate,
            LOCAL_SIGNAL_RARITIES.indexOf(candidate) <= LOCAL_SIGNAL_RARITIES.indexOf(rarity)
                ? 0
                : progress.pullsSinceRarity[candidate] + 1
        ]));
        account.signalSearch = {
            ...(account.signalSearch && typeof account.signalSearch === "object" ? account.signalSearch : {}),
            local: progress
        };
    }
    store.accounts[accountId] = account;
    store.communityStore = workingStore.communityStore;
    saveScope(scope, store);
    return {
        searched: true,
        level: "local",
        quantity,
        price: totalPrice,
        rewards,
        balance: account.balance,
        state: getLocalSignalSearch(message),
        scope
    };
}

function casino(message, bet, fruits) {
    const { account, scope } = getAccount(message);
    const today = getLocalDate();

    if (account.casinoDate !== today) {
        account.casinoDate = today;
        account.casinoCount = 0;
    }

    if (account.casinoCount >= MAX_CASINO_PER_DAY) {
        return {
            played: false,
            reason: "limit",
            remaining: 0,
            balance: account.balance,
            scope
        };
    }

    if (!Number.isInteger(bet) || bet <= 0) {
        return {
            played: false,
            reason: "invalid_bet",
            remaining: MAX_CASINO_PER_DAY - account.casinoCount,
            balance: account.balance,
            scope
        };
    }

    if (account.balance < bet) {
        return {
            played: false,
            reason: "insufficient_balance",
            remaining: MAX_CASINO_PER_DAY - account.casinoCount,
            balance: account.balance,
            scope
        };
    }

    const result = [pickRandom(fruits), pickRandom(fruits), pickRandom(fruits)];
    const won = result[0] === result[1] && result[1] === result[2];
    const payout = won ? bet * CASINO_JACKPOT_PAYOUT_MULTIPLIER : 0;

    account.balance += payout - bet;
    recordDailyProfit(account, "cassino", payout - bet);
    account.casinoCount += 1;
    saveScope(scope, loadScope(scope));

    return {
        played: true,
        result,
        won,
        bet,
        payout,
        amount: payout - bet,
        remaining: MAX_CASINO_PER_DAY - account.casinoCount,
        balance: account.balance,
        scope
    };
}

function canCasino(message) {
    const { account } = getAccount(message);
    return account.casinoDate !== getLocalDate() || account.casinoCount < MAX_CASINO_PER_DAY;
}

function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function formatMoney(satcoins) {
    const value = Number(satcoins) / 100;
    return `${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${SATCOIN_SYMBOL}`;
}

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

module.exports = {
    DAILY_REWARD,
    MAX_CASINO_PER_DAY,
    MAX_WORKS_PER_DAY,
    MAX_TRANSFERS_PER_DAY,
    MIN_TRANSFER_AMOUNT,
    MIN_VAULT_DEPOSIT,
    VAULT_MODES,
    SATCOIN_SYMBOL,
    canWork,
    claimDaily,
    canClaimDaily,
    formatMoney,
    getAccount,
    listAccounts,
    getBalance,
    getTotalBalance,
    depositToVault,
    withdrawFromVault,
    getAccountByUser,
    getProfileCosmetics,
    setProfileBackground,
    setProfileOutline,
    resetProfileOutline,
    buyProfileBackground,
    buyProfileCosmetic,
    resetProfileBackground,
    ITEM_RARITY: itemRarity,
    PROFILE_BACKGROUNDS: profileCosmetics.PROFILE_BACKGROUNDS,
    PROFILE_OUTLINES: profileCosmetics.PROFILE_OUTLINES,
    PROFILE_BACKGROUND_PRICE: profileCosmetics.PROFILE_BACKGROUND_PRICE,
    PROFILE_OUTLINE_PRICE: profileCosmetics.PROFILE_OUTLINE_PRICE,
    getProfileBackgroundPrice: profileCosmetics.getProfileBackgroundPrice,
    getProfileOutlinePrice: profileCosmetics.getProfileOutlinePrice,
    resetBalance,
    resetAllBalances,
    getBalancePosition,
    getIncludeVaultInRanking,
    setIncludeVaultInRanking,
    getVaultConfig,
    getVaultTaxPreview,
    updateVaultConfig,
    adjustBalance,
    getDailyProfits,
    findAccount,
    getRanking,
    getScope,
    invalidateScope,
    getLocalDate,
    isEnabled,
    setEnabled,
    refreshNames,
    LEVEL_UP_REWARD_BASE,
    rewardLevelUp,
    canCasino,
    casino,
    canFish,
    fish,
    canMine,
    mine,
    work,
    canTransfer,
    transfer,
    MAX_ROBBERIES_PER_DAY,
    MIN_ROBBABLE_BALANCE,
    MIN_SHIELD_BALANCE,
    SHIELD_DURABILITY,
    rob,
    canRob,
    getStoreItems,
    buyStoreItem,
    SIGNAL_SEARCH_LEVELS,
    LOCAL_SIGNAL_RARITIES,
    getSignalSearchState,
    searchSignals,
    searchLocalSignals,
    getLocalSignalSearch,
    updateLocalSignalSearch,
    updateLocalSignalSearchDraft,
    getCommunityStore,
    setCommunityStoreText,
    updateCommunityStoreDetails,
    addCommunityStoreItem,
    editCommunityStoreItem,
    updateCommunityStoreItem,
    removeCommunityStoreItem,
    buyCommunityStoreItem,
    getCommunityStoreOrders,
    updateCommunityStoreOrder
};
