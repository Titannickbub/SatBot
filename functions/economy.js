const fs = require("fs");
const path = require("path");
const centralAccounts = require("./centralAccounts");

const economyDir = path.join(__dirname, "..", "settings", "economy");
const DAILY_REWARD = 2000;
const SATCOIN_SYMBOL = "💷";
const MAX_WORKS_PER_DAY = 2;
const MAX_CASINO_PER_DAY = 5;
const CASINO_JACKPOT_PAYOUT_MULTIPLIER = 11;
const MAX_TRANSFERS_PER_DAY = 3;
const MAX_ROBBERIES_PER_DAY = 3;
const MIN_TRANSFER_AMOUNT = 1000;
const MIN_ROBBABLE_BALANCE = 2000;
const STORE_ROBBERY_PRICE = 20000;
const MIN_SHIELD_BALANCE = 50000;
const STORE_SHIELD_PRICE = 20000;
const SHIELD_DURABILITY = 5;
const LEVEL_UP_REWARD_BASE = 1500;
const COMMUNITY_STORE_DEFAULT_TITLE = "🛍️ LOJA LOCAL";
const COMMUNITY_STORE_DEFAULT_NOTICE = "Itens especiais disponíveis neste grupo/servidor.";
const COMMUNITY_STORE_FIRST_ITEM_ID = 1001;
const STORE_ITEMS = [
    { key: "work", name: "resetar trabalho", aliases: ["trabalho", "work"], price: 10000, date: "workDate", count: "workCount", max: MAX_WORKS_PER_DAY },
    { key: "fishing", name: "resetar pesca", aliases: ["pesca", "pescar", "fishing"], price: 8000, date: "fishingDate", count: "fishingCount", max: MAX_WORKS_PER_DAY },
    { key: "mining", name: "resetar mineração", aliases: ["mineracao", "mineração", "minerar", "mining"], price: 9000, date: "miningDate", count: "miningCount", max: MAX_WORKS_PER_DAY },
    { key: "casino", name: "resetar cassino", aliases: ["cassino", "casino"], price: 5000, date: "casinoDate", count: "casinoCount", max: MAX_CASINO_PER_DAY },
    { key: "transfer", name: "resetar transferência", aliases: ["transferencia", "transferência", "transferir", "transfer"], price: 10000, date: "transferDate", count: "transferCount", max: MAX_TRANSFERS_PER_DAY },
    { key: "robbery", name: "resetar roubo", aliases: ["roubo", "roubar", "robbery"], price: STORE_ROBBERY_PRICE, date: "robberyDate", count: "robberyCount", max: MAX_ROBBERIES_PER_DAY },
    { key: "all", name: "resetar todos", aliases: ["todos", "all"], price: 62000 },
    { key: "shield", name: "escudo anti-roubo", aliases: ["escudo", "shield"], price: STORE_SHIELD_PRICE, product: true }
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
    "loja"
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
        orders: []
    };
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
            quantity: item.quantity === null ? null : Number(item.quantity)
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
        orders
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

    ensureDailyProfitData(store.accounts[accountKey]);

    return {
        account: store.accounts[accountKey],
        scope
    };
}

function getBalance(message) {
    return getAccount(message).account.balance;
}

function getAccountByUser(message, userId) {
    const scope = getScope(message);
    if (!scope || userId === null || userId === undefined) return null;
    const store = loadScope(scope);
    const account = store.accounts[String(userId)];
    return account && typeof account === "object" ? account : null;
}

function listAccounts(message) {
    const scope = getScope(message);
    if (!scope) return [];
    return Object.values(loadScope(scope).accounts)
        .filter(account => account && typeof account === "object")
        .sort((left, right) =>
            Number(right.balance || 0) - Number(left.balance || 0) ||
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
    account.balance = 0;
    saveScope(scope, store);
    return { ...account, previousBalance };
}

function resetAllBalances(message) {
    const scope = getScope(message);
    if (!scope) return null;
    const store = loadScope(scope);
    const accounts = Object.values(store.accounts)
        .filter(account => account && typeof account === "object");
    for (const account of accounts) account.balance = 0;
    saveScope(scope, store);
    return accounts.length;
}

function getBalancePosition(message, userId) {
    const scope = getScope(message);
    if (!scope || userId === null || userId === undefined) return null;
    const store = loadScope(scope);
    const accounts = Object.values(store.accounts)
        .filter(account => account && typeof account === "object")
        .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
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
            const difference = Number(b.balance || 0) - Number(a.balance || 0);
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
                balance: Number(account.balance) || 0
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

    if (Number(victim.balance) < MIN_ROBBABLE_BALANCE) {
        result.outcome = "nothing";
        saveScope(scope, store);
        return result;
    }

    const wealthyVictim = Number(victim.balance) > 200000;
    const roll = Math.random() * 100;
    const partialChance = wealthyVictim ? 35 : 23.333333;
    const neutralChance = wealthyVictim ? 25 : 46.666667;
    const thiefLossChance = wealthyVictim ? 15 : 10;
    const totalChance = 10;
    let threshold = partialChance;

    if (roll < threshold) {
        const amount = randomInteger(MIN_ROBBABLE_BALANCE, Math.max(MIN_ROBBABLE_BALANCE, Math.floor(victim.balance)));
        thief.balance += amount;
        victim.balance -= amount;
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
        victim.balance += amount;
        recordDailyProfit(thief, "roubo", -amount);
        recordDailyProfit(victim, "rouboSofrido", amount);
        result.outcome = "caught";
        result.amount = amount;
    } else if (roll < (threshold += totalChance)) {
        const amount = Number(victim.balance);
        thief.balance += amount;
        victim.balance = 0;
        recordDailyProfit(thief, "roubo", amount);
        recordDailyProfit(victim, "rouboSofrido", -amount);
        result.robbed = true;
        result.outcome = "total";
        result.amount = amount;
    } else {
        const amount = randomInteger(5000, 15000);
        thief.balance -= amount;
        victim.balance += amount;
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
        items: store.items.map(item => ({ ...item }))
    };
}

function setCommunityStoreText(message, field, value) {
    if (!["title", "notice"].includes(field) || typeof value !== "string" || !value.trim()) {
        return false;
    }
    const scope = getScope(message);
    if (!scope) return false;
    const data = loadScope(scope);
    data.communityStore[field] = value.trim();
    saveScope(scope, data);
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
    const data = loadScope(scope);
    const store = data.communityStore;
    const newItem = {
        id: store.nextItemId++,
        name: item.name.trim(),
        category: item.category.trim(),
        price: item.price,
        quantity: item.quantity
    };
    store.items.push(newItem);
    saveScope(scope, data);
    return { ...newItem };
}

function editCommunityStoreItem(message, itemId, field, value) {
    const scope = getScope(message);
    if (!scope) return null;
    const data = loadScope(scope);
    const item = data.communityStore.items.find(candidate => candidate.id === Number(itemId));
    if (!item) return null;

    if (field === "name" || field === "category") {
        if (typeof value !== "string" || !value.trim()) return null;
        item[field] = value.trim();
    } else if (field === "price") {
        if (!Number.isSafeInteger(value) || value < 0) return null;
        item.price = value;
    } else if (field === "quantity") {
        if (!(value === null || (Number.isSafeInteger(value) && value >= 0))) return null;
        item.quantity = value;
    } else {
        return null;
    }
    saveScope(scope, data);
    return { ...item };
}

function removeCommunityStoreItem(message, itemId) {
    const scope = getScope(message);
    if (!scope) return null;
    const data = loadScope(scope);
    const index = data.communityStore.items.findIndex(item => item.id === Number(itemId));
    if (index === -1) return null;
    const [removed] = data.communityStore.items.splice(index, 1);
    saveScope(scope, data);
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
    return `${value.toFixed(2)}${SATCOIN_SYMBOL}`;
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
    SATCOIN_SYMBOL,
    canWork,
    claimDaily,
    canClaimDaily,
    formatMoney,
    getAccount,
    listAccounts,
    getBalance,
    getAccountByUser,
    resetBalance,
    resetAllBalances,
    getBalancePosition,
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
    getCommunityStore,
    setCommunityStoreText,
    addCommunityStoreItem,
    editCommunityStoreItem,
    removeCommunityStoreItem,
    buyCommunityStoreItem,
    getCommunityStoreOrders,
    updateCommunityStoreOrder
};
