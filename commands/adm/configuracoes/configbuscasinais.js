const economy = require("../../../functions/economy");
const { isOwner } = require("../../../functions/owners");

const RARITY_ALIASES = new Map([
    ["comum", economy.ITEM_RARITY.COMMON],
    ["incomum", economy.ITEM_RARITY.UNCOMMON],
    ["raro", economy.ITEM_RARITY.RARE],
    ["epico", economy.ITEM_RARITY.EPIC],
    ["lendario", economy.ITEM_RARITY.LEGENDARY]
]);
const RARITY_LABELS = {
    [economy.ITEM_RARITY.COMMON]: "Comum",
    [economy.ITEM_RARITY.UNCOMMON]: "Incomum",
    [economy.ITEM_RARITY.RARE]: "Raro",
    [economy.ITEM_RARITY.EPIC]: "Épico",
    [economy.ITEM_RARITY.LEGENDARY]: "Lendário"
};
const TYPE_ALIASES = new Map([
    ["bot", "bot"],
    ["loja", "bot"],
    ["mercado", "market"],
    ["market", "market"],
    ["fundo", "background"],
    ["background", "background"],
    ["linha", "outline"],
    ["outline", "outline"]
]);
const TYPE_LABELS = {
    bot: "item da Loja do Bot",
    market: "item do Mercado Local",
    background: "fundo de perfil",
    outline: "outline de perfil"
};

const DESCRIPTION = `🎛️ Configura a Busca de Sinais Local deste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.
🧰 Configure preço, chances, garantias e prêmios por raridade. Faça a configuração com a busca desativada e ative-a quando estiver pronta.

📋 Consultar configuração e catálogo:
{prefix}configbuscasinais status
{prefix}configbuscasinais itens

💰 Definir o preço de cada busca:
{prefix}configbuscasinais preco <valor>
Ex.: {prefix}configbuscasinais preco 250,00

🎲 Definir as chances das cinco raridades de uma vez (a soma precisa ser 100):
{prefix}configbuscasinais chances <comum> <incomum> <raro> <epico> <lendario>
Ex.: {prefix}configbuscasinais chances 60 25 10 4 1

🛡️ Definir uma garantia para uma raridade:
{prefix}configbuscasinais garantia <raridade> <buscas>
Remover a garantia: {prefix}configbuscasinais garantia <raridade> off

🪙 Configurar prêmio em SatCoins:
{prefix}configbuscasinais dinheiro <raridade> <mínimo> <máximo>
Remover o prêmio em SatCoins: {prefix}configbuscasinais dinheiro <raridade> remover

🎁 Adicionar ou remover prêmios de uma raridade:
{prefix}configbuscasinais premio add <raridade> <bot|mercado|fundo|linha> <item>
{prefix}configbuscasinais premio remover <raridade> <bot|mercado|fundo|linha> <item>
Use {prefix}configbuscasinais itens para consultar os nomes e IDs disponíveis.

⭐ Definir até dois prêmios em destaque:
{prefix}configbuscasinais destaque add <bot|mercado|fundo|linha> <item>
{prefix}configbuscasinais destaque remover <bot|mercado|fundo|linha> <item>
{prefix}configbuscasinais destaque limpar

✅ Ativar depois de configurar:
{prefix}configbuscasinais ativar
🔕 Pausar as buscas:
{prefix}configbuscasinais desativar

📌 Regras: as chances devem totalizar 100%; cada raridade com chance precisa ter ao menos um prêmio; garantias só podem ser usadas em raridades com chance maior que zero. Preços e valores aceitam, por exemplo, 250, 250,50 ou 1.000,00.
A Busca Local só pode ser ativada quando a configuração estiver completa. A loja pertence a este grupo/servidor e não altera as buscas Recruta ou Especializada.`;

module.exports = {
    name: "configbuscasinais",
    aliases: ["configbuscalocal", "buscasinaisconfig"],
    category: "adm/economia",
    description: DESCRIPTION,
    usage: "{prefix}configbuscasinais [status|itens|preco|chances|garantia|dinheiro|premio|destaque|ativar|desativar]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A Busca Local só pode ser configurada em grupos ou servidores." });
        }
        if (!await isAdministrator(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar a Busca Local." });
        }

        const args = message.args || [];
        const prefix = message.prefix || "!";
        const action = normalize(args[0]);
        if (!action || ["help", "ajuda"].includes(action)) {
            return message.reply({ text: DESCRIPTION.replaceAll("{prefix}", prefix) });
        }

        const state = economy.getLocalSignalSearch(message);
        if (!state) {
            return message.reply({ text: "❌ Não foi possível carregar a Busca Local deste grupo ou servidor." });
        }
        if (action === "status") return message.reply({ text: renderStatus(state, prefix) });
        if (action === "itens") return message.reply({ text: renderCatalog(state, prefix) });

        const config = {
            enabled: state.enabled,
            price: state.price,
            tiers: state.tiers,
            featured: state.featured
        };
        let successMessage;

        if (["ativar", "on", "enable"].includes(action)) {
            if (args.length !== 1) return usageError(message, "Use configbuscasinais ativar sem argumentos adicionais.");
            config.enabled = true;
            successMessage = "✅ Busca Local ativada.";
        } else if (["desativar", "off", "disable"].includes(action)) {
            if (args.length !== 1) return usageError(message, "Use configbuscasinais desativar sem argumentos adicionais.");
            config.enabled = false;
            successMessage = "🔕 Busca Local desativada. As configurações foram preservadas.";
        } else if (["preco", "preço"].includes(action)) {
            if (args.length !== 2) return usageError(message, "Use preco <valor>.");
            const price = parseMoney(args[1]);
            if (price === null || price <= 0) return usageError(message, "Informe um preço maior que zero. Ex.: preco 250,00");
            config.price = price;
            successMessage = `💰 Preço por busca atualizado para ${economy.formatMoney(price)}.`;
        } else if (action === "chances") {
            const rarities = economy.LOCAL_SIGNAL_RARITIES;
            if (args.length !== rarities.length + 1) {
                return usageError(message, "Informe cinco chances, na ordem comum, incomum, raro, epico e lendario. Ex.: chances 60 25 10 4 1");
            }
            const chances = args.slice(1).map(value => /^\d+$/.test(value) ? Number(value) : NaN);
            if (chances.some(value => !Number.isSafeInteger(value) || value < 0 || value > 100) ||
                chances.reduce((sum, value) => sum + value, 0) !== 100) {
                return usageError(message, "As cinco chances devem ser números inteiros de 0 a 100 e somar exatamente 100.");
            }
            rarities.forEach((rarity, index) => { config.tiers[rarity].chance = chances[index]; });
            successMessage = "🎲 Chances das cinco raridades atualizadas.";
        } else if (action === "garantia") {
            const rarity = resolveRarity(args[1]);
            if (!rarity || !args[2] || args.length !== 3) return usageError(message, "Use garantia <raridade> <buscas|off>.");
            const tier = config.tiers[rarity];
            if (normalize(args[2]) === "off" || ["remover", "nenhuma"].includes(normalize(args[2]))) {
                tier.guaranteeAfter = null;
                successMessage = `🛡️ Garantia de ${RARITY_LABELS[rarity]} removida.`;
            } else {
                const count = /^\d+$/.test(args[2]) ? Number(args[2]) : NaN;
                if (!Number.isSafeInteger(count) || count < 1 || count > 10000) {
                    return usageError(message, "A garantia deve ser um número entre 1 e 10.000 ou off.");
                }
                tier.guaranteeAfter = count;
                successMessage = `🛡️ ${RARITY_LABELS[rarity]} garantido em até ${count} busca(s).`;
            }
        } else if (["dinheiro", "satcoins"].includes(action)) {
            const rarity = resolveRarity(args[1]);
            if (!rarity || args.length < 3) return usageError(message, "Use dinheiro <raridade> <mínimo> <máximo|remover>.");
            const tier = config.tiers[rarity];
            if (["remover", "off", "nenhum"].includes(normalize(args[2]))) {
                if (args.length !== 3) return usageError(message, "Use dinheiro <raridade> remover.");
                tier.cashMin = null;
                tier.cashMax = null;
                successMessage = `🪙 Prêmio em SatCoins removido de ${RARITY_LABELS[rarity]}.`;
            } else {
                if (args.length !== 4) return usageError(message, "Use dinheiro <raridade> <mínimo> <máximo>.");
                const min = parseMoney(args[2]);
                const max = parseMoney(args[3]);
                if (min === null || max === null || max < min) {
                    return usageError(message, "Use dinheiro <raridade> <mínimo> <máximo>, com valores válidos e máximo maior ou igual ao mínimo.");
                }
                tier.cashMin = min;
                tier.cashMax = max;
                successMessage = `🪙 Prêmio em SatCoins de ${RARITY_LABELS[rarity]} atualizado: ${economy.formatMoney(min)} a ${economy.formatMoney(max)}.`;
            }
        } else if (action === "premio" || action === "prêmio") {
            const result = updateTierPrize(config, state, args.slice(1));
            if (result.error) return usageError(message, result.error);
            successMessage = result.message;
        } else if (action === "destaque") {
            const result = updateFeatured(config, state, args.slice(1));
            if (result.error) return usageError(message, result.error);
            successMessage = result.message;
        } else {
            return usageError(message, `Ação desconhecida. Consulte ${prefix}configbuscasinais help.`);
        }

        const updated = economy.updateLocalSignalSearchDraft(message, config);
        if (!updated) {
            return message.reply({
                text: "❌ A alteração não foi salva. Revise os itens cadastrados, os destaques e as regras da raridade. Para ativar, as chances precisam somar 100% e toda raridade com chance precisa ter um prêmio."
            });
        }
        return message.reply({ text: successMessage });
    }
};

async function isAdministrator(message) {
    if (isOwner(message) || message.sender?.isOwner) return true;
    const adapter = (message.platforms || []).find(platform => platform.name === message.platform);
    return adapter?.checkUserPermission
        ? Boolean(await adapter.checkUserPermission(message.chatId, message.userId))
        : Boolean(message.sender?.isAdmin);
}

function normalize(value) {
    return String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function resolveRarity(value) {
    return RARITY_ALIASES.get(normalize(value)) || null;
}

function parseMoney(value) {
    let normalized = String(value ?? "").trim().replace(/(?:💷|satcoins?)/gi, "").replace(/\s/g, "");
    if (normalized.includes(",") && normalized.includes(".")) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (normalized.includes(",")) {
        normalized = normalized.replace(",", ".");
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
        normalized = normalized.replace(/\./g, "");
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
    const [whole, cents = ""] = normalized.split(".");
    const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0") || 0);
    return Number.isSafeInteger(amount) ? amount : null;
}

function findCatalogItem(type, selector, state) {
    const normalized = normalize(selector);
    const catalog = type === "bot" ? state.botItems
        : type === "market" ? state.marketItems
            : type === "background" ? state.backgrounds
                : state.outlines;
    if (!Array.isArray(catalog)) return null;
    return catalog.find(item =>
        normalize(item.key) === normalized ||
        normalize(item.name) === normalized ||
        String(item.id ?? "") === String(selector)
    ) || null;
}

function findReward(type, selector, state) {
    const item = findCatalogItem(type, selector, state);
    if (!item) return null;
    return type === "market"
        ? { type, id: item.id }
        : { type, key: item.key };
}

function rewardArray(tier, type) {
    if (type === "bot") return tier.botItems;
    if (type === "market") return tier.marketItems;
    if (type === "background") return tier.backgrounds;
    return tier.outlines;
}

function rewardValue(reward) {
    return reward.type === "market" ? reward.id : reward.key;
}

function sameReward(left, right) {
    return left.type === right.type && rewardValue(left) === rewardValue(right);
}

function updateTierPrize(config, state, args) {
    const operation = normalize(args[0]);
    const rarity = resolveRarity(args[1]);
    const type = TYPE_ALIASES.get(normalize(args[2]));
    const item = findReward(type, args[3], state);
    if (!["add", "adicionar", "remover", "remove", "excluir"].includes(operation) ||
        !rarity || !type || !item || args.length !== 4) {
        return { error: "Use premio add|remover <raridade> <bot|mercado|fundo|linha> <item>. Consulte a lista com configbuscasinais itens." };
    }
    const items = rewardArray(config.tiers[rarity], type);
    const index = items.findIndex(value => type === "market" ? value === item.id : value === item.key);
    if (["add", "adicionar"].includes(operation)) {
        if (index !== -1) return { error: "Esse prêmio já está configurado nessa raridade." };
        items.push(rewardValue(item));
        return { message: `🎁 ${TYPE_LABELS[type]} adicionado à raridade ${RARITY_LABELS[rarity]}.` };
    }
    if (index === -1) return { error: "Esse prêmio não está configurado nessa raridade." };
    items.splice(index, 1);
    return { message: `🎁 ${TYPE_LABELS[type]} removido da raridade ${RARITY_LABELS[rarity]}.` };
}

function updateFeatured(config, state, args) {
    const operation = normalize(args[0]);
    if (["limpar", "clear"].includes(operation)) {
        if (args.length !== 1) return { error: "Use destaque limpar para remover todos os destaques." };
        config.featured = [];
        return { message: "⭐ Todos os destaques foram removidos." };
    }
    const type = TYPE_ALIASES.get(normalize(args[1]));
    const reward = findReward(type, args[2], state);
    if (!["add", "adicionar", "remover", "remove", "excluir"].includes(operation) ||
        !type || !reward || args.length !== 3) {
        return { error: "Use destaque add|remover <bot|mercado|fundo|linha> <item> ou destaque limpar." };
    }
    const index = config.featured.findIndex(item => sameReward(item, reward));
    if (["add", "adicionar"].includes(operation)) {
        if (index !== -1) return { error: "Esse prêmio já está em destaque." };
        if (config.featured.length >= 2) return { error: "A Busca Local aceita no máximo dois prêmios em destaque." };
        const isConfigured = Object.values(config.tiers).some(tier => rewardArray(tier, type).includes(rewardValue(reward)));
        if (!isConfigured) return { error: "Configure esse item como prêmio de uma raridade antes de destacá-lo." };
        config.featured.push(reward);
        return { message: `⭐ Destaque adicionado: ${TYPE_LABELS[type]}.` };
    }
    if (index === -1) return { error: "Esse prêmio não está em destaque." };
    config.featured.splice(index, 1);
    return { message: `⭐ Destaque removido: ${TYPE_LABELS[type]}.` };
}

function renderStatus(state, prefix) {
    const lines = [
        `✦ BUSCA DE SINAIS LOCAL · ${state.enabled ? "ATIVADA" : "DESATIVADA"}`,
        `Preço: ${economy.formatMoney(state.price)} por busca · x10: ${economy.formatMoney(state.price * 10)}`,
        `Soma das chances: ${economy.LOCAL_SIGNAL_RARITIES.reduce((sum, rarity) => sum + state.tiers[rarity].chance, 0)}%`,
        ""
    ];
    for (const rarity of economy.LOCAL_SIGNAL_RARITIES) {
        const tier = state.tiers[rarity];
        const prizeNames = [
            tier.cashMin === null ? "" : `SatCoins ${economy.formatMoney(tier.cashMin)}–${economy.formatMoney(tier.cashMax)}`,
            ...tier.botItems.map(key => state.botItems.find(item => item.key === key)?.name || key),
            ...tier.marketItems.map(id => state.marketItems.find(item => item.id === id)?.name || `Mercado #${id}`),
            ...tier.backgrounds.map(key => `Fundo ${state.backgrounds.find(item => item.key === key)?.name || key}`),
            ...tier.outlines.map(key => `Linha ${state.outlines.find(item => item.key === key)?.name || key}`)
        ].filter(Boolean);
        lines.push(`${RARITY_LABELS[rarity]} · ${tier.chance}% · Garantia: ${tier.guaranteeAfter || "não configurada"} busca(s)`);
        lines.push(`  Prêmios: ${prizeNames.join(", ") || "nenhum"}`);
    }
    lines.push("", `Destaques: ${state.featured.length ? state.featured.map(item => {
        const type = item.type;
        const catalogItem = findCatalogItem(type, type === "market" ? item.id : item.key, state);
        return catalogItem?.name || `${TYPE_LABELS[type]} não encontrado`;
    }).join(", ") : "nenhum"}`);
    lines.push(`Consulte as ações: ${prefix}configbuscasinais help`);
    return lines.join("\n");
}

function renderCatalog(state, prefix) {
    const section = (label, items, formatter) => [
        `${label}:`,
        ...(items.length ? items.map(formatter) : ["  Nenhum item disponível."])
    ];
    return [
        "📚 ITENS DISPONÍVEIS PARA A BUSCA LOCAL",
        "",
        ...section("Loja do Bot", state.botItems, item => `  ${item.key} — ${item.name} (${economy.formatMoney(item.price)})`),
        "",
        ...section("Mercado Local", state.marketItems, item => `  ${item.id} — ${item.name}${item.quantity === 0 ? " (esgotado)" : ""}`),
        "",
        ...section("Fundos de perfil", state.backgrounds, item => `  ${item.key} — ${item.name}`),
        "",
        ...section("Outlines de perfil", state.outlines, item => `  ${item.key} — ${item.name}`),
        "",
        `Use ${prefix}configbuscasinais premio add <raridade> <tipo> <item>.`
    ].join("\n");
}

function usageError(message, details) {
    return message.reply({
        text: `❌ ${details}\n\nConsulte ${message.prefix || "!"}configbuscasinais help para ver todos os exemplos.`
    });
}
